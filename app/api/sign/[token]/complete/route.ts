import { NextResponse } from 'next/server'
import { COMPLETING_STALE_MS, resolveSignerToken } from '@/lib/signer-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { flattenPdf } from '@/lib/pdf/flatten'
import { writeAuditEvent } from '@/lib/audit'
import { captureServerEvent } from '@/lib/analytics'
import { sendTransactionalEmail } from '@/lib/email/client'
import {
  renderCompletedDocumentSignerEmail,
  renderCompletedDocumentSenderEmail,
} from '@/lib/email/catalog'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const context = await resolveSignerToken(token)

    if (context.errorType || !context.document) {
      return NextResponse.json(
        { error: 'Invalid or expired signing link' },
        { status: 403 }
      )
    }

    const { document: doc, signer, ownerProfile, fields } = context

    // resolveSignerToken only lets a 'completing' doc through once it is stale
    // (a previous attempt crashed or timed out before it could roll back).
    if (doc.status !== 'sent' && doc.status !== 'viewed' && doc.status !== 'completing') {
      return NextResponse.json(
        { error: 'Document is not in a signable state' },
        { status: 400 }
      )
    }

    // Check all required fields are filled, separating signer from sender fields
    const signerFields = fields.filter((f) => f.assigned_to === 'signer')
    const senderFields = fields.filter((f) => f.assigned_to === 'sender')

    const missingSigner = signerFields.filter((f) => f.required && !f.value)
    if (missingSigner.length > 0) {
      return NextResponse.json(
        {
          error: `Please fill all ${missingSigner.length} required fields before signing.`,
        },
        { status: 400 }
      )
    }

    const missingSender = senderFields.filter((f) => f.required && !f.value)
    if (missingSender.length > 0) {
      return NextResponse.json(
        {
          error:
            'Document cannot be completed because required sender fields are missing.',
        },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // 1. Atomic status transition: flip to transitional 'completing' status from 'sent'/'viewed'
    // (or take over a stale 'completing' left by a crashed attempt).
    // This locks the document against concurrent completion requests without corrupting state on failure
    //
    // INVARIANTS (see issue #1):
    // - 'completing' is only ever entered through this single conditional UPDATE,
    //   so at most one request holds the lock; a losing request gets 409.
    // - The lock is released in exactly two ways: success -> 'completed' (with
    //   storage_path_signed set), or any failure after this point -> 'viewed'.
    //   A document must never reach 'completed' without a signed PDF.
    // - If the process dies before releasing, the lock goes stale after
    //   COMPLETING_STALE_MS and may be re-claimed here (resolveSignerToken lets
    //   the signer back in at the same threshold).
    // - Known gap: the final 'completed' update below is not conditioned on
    //   still holding the lock, so an attempt that outlives COMPLETING_STALE_MS
    //   and is taken over could double-send completion emails.
    const nowIso = new Date().toISOString()
    const staleBeforeIso = new Date(Date.now() - COMPLETING_STALE_MS).toISOString()
    const { data: claimedDoc, error: claimError } = await admin
      .from('documents')
      .update({
        status: 'completing',
        updated_at: nowIso,
      })
      .eq('id', doc.id)
      .or(
        `status.in.(sent,viewed),and(status.eq.completing,updated_at.lt."${staleBeforeIso}")`
      )
      .select('id, status')
      .maybeSingle()

    if (claimError || !claimedDoc) {
      return NextResponse.json(
        { error: 'Document is currently being completed or has already been signed' },
        { status: 409 }
      )
    }

    let signedPath: string
    let flattenedBuffer: Buffer

    try {
      // 2. Download original PDF from 'originals' bucket
      const { data: originalFile, error: downloadError } = await admin.storage
        .from('originals')
        .download(doc.storage_path_original)

      if (downloadError || !originalFile) {
        throw new Error(
          `Failed to access original PDF: ${downloadError?.message || 'File not found'}`
        )
      }

      const originalBuffer = Buffer.from(await originalFile.arrayBuffer())

      // 3. Flatten fields into the PDF
      flattenedBuffer = await flattenPdf(
        originalBuffer,
        fields.map((f) => ({
          type: f.type,
          page: f.page,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          value: f.value,
        }))
      )

      // 4. Upload signed PDF to 'signed' bucket
      signedPath = `${doc.owner_id}/${doc.id}/signed.pdf`
      const { error: uploadSignedError } = await admin.storage
        .from('signed')
        .upload(signedPath, flattenedBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (uploadSignedError) {
        throw new Error(`Failed to save signed PDF: ${uploadSignedError.message}`)
      }

      // 5. Success! Now transition document to 'completed' with signed PDF path
      const { error: completeUpdateError } = await admin
        .from('documents')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          storage_path_signed: signedPath,
        })
        .eq('id', doc.id)

      if (completeUpdateError) {
        throw new Error(
          `Failed to set document status to completed: ${completeUpdateError.message}`
        )
      }
    } catch (pipelineErr: any) {
      console.error(
        'Error during document completion pipeline, rolling back status:',
        pipelineErr
      )

      // ROLLBACK: Reset status back to 'viewed' so the signer can retry cleanly
      await admin
        .from('documents')
        .update({
          status: 'viewed',
          completed_at: null,
          storage_path_signed: null,
        })
        .eq('id', doc.id)
        .eq('status', 'completing')

      return NextResponse.json(
        { error: 'Failed to process signed document. Please try again.' },
        { status: 500 }
      )
    }

    const signerDisplayName = signer.name || signer.email
    const cleanDocTitle = doc.title || 'Document'

    // Notifications & auto-complete pending reminders (#24)
    await admin.from('notifications').insert({
      user_id: doc.owner_id,
      document_id: doc.id,
      type: 'signed',
      title: 'Document signed',
      body: `${signerDisplayName} signed "${cleanDocTitle}".`,
    })

    await admin.from('notifications').insert({
      user_id: doc.owner_id,
      document_id: doc.id,
      type: 'completed',
      title: 'Document completed',
      body: `All signers have signed "${cleanDocTitle}".`,
    })

    await admin
      .from('reminders')
      .update({ status: 'completed' })
      .eq('document_id', doc.id)
      .eq('status', 'pending')

    // 5. Write audit events (with IP & UA)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || null
    const userAgent = req.headers.get('user-agent') || null

    await writeAuditEvent({
      documentId: doc.id,
      actorType: 'signer',
      actorEmail: signer.email,
      eventType: 'document_completed',
      ipAddress: ip,
      userAgent,
      metadata: {
        field_count: fields.length,
        signer_name: signer.name || null,
      },
    })

    // 6. Calculate turnaround time and fire PostHog event
    const sentTime = doc.sent_at ? new Date(doc.sent_at).getTime() : Date.now()
    const daysToComplete = Math.max(0, (Date.now() - sentTime) / (1000 * 60 * 60 * 24))

    await captureServerEvent(doc.owner_id, {
      name: 'document_completed',
      properties: {
        days_to_complete: Math.round(daysToComplete * 10) / 10,
      },
    })

    // 7. Send completion emails with PDF attached
    const pdfAttachment = {
      filename: `${cleanDocTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_signed.pdf`,
      content: flattenedBuffer,
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Email to signer
    const signerEmailContent = renderCompletedDocumentSignerEmail({
      documentTitle: cleanDocTitle,
      appUrl,
    })

    await sendTransactionalEmail({
      to: signer.email,
      subject: signerEmailContent.subject,
      html: signerEmailContent.html,
      text: signerEmailContent.text,
      documentId: doc.id,
      template: 'completed_to_signer',
      attachments: [pdfAttachment],
    })

    // Email to sender
    if (ownerProfile?.email) {
      const signerDisplayName = signer.name || signer.email
      const senderEmailContent = renderCompletedDocumentSenderEmail({
        signerDisplayName,
        documentTitle: cleanDocTitle,
        appUrl,
      })

      await sendTransactionalEmail({
        to: ownerProfile.email,
        subject: senderEmailContent.subject,
        html: senderEmailContent.html,
        text: senderEmailContent.text,
        documentId: doc.id,
        template: 'completed_to_sender',
        attachments: [pdfAttachment],
      })
    }

    // 8. Mint short-lived 5-minute signed URL for in-browser download
    const { data: signedDownloadData } = await admin.storage
      .from('signed')
      .createSignedUrl(signedPath, 300)

    return NextResponse.json({
      success: true,
      downloadUrl: signedDownloadData?.signedUrl || null,
    })
  } catch (err: any) {
    console.error('Error in sign completion route:', err)
    return NextResponse.json(
      { error: err.message || 'An error occurred during completion.' },
      { status: 500 }
    )
  }
}
