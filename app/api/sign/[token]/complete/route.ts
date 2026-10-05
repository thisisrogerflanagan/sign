import { NextResponse } from 'next/server'
import { resolveSignerToken } from '@/lib/signer-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { flattenPdf } from '@/lib/pdf/flatten'
import { writeAuditEvent } from '@/lib/audit'
import { captureServerEvent } from '@/lib/analytics'
import { sendTransactionalEmail } from '@/lib/email/client'

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

    if (doc.status !== 'sent' && doc.status !== 'viewed') {
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
    // This locks the document against concurrent completion requests without corrupting state on failure
    const nowIso = new Date().toISOString()
    const { data: claimedDoc, error: claimError } = await admin
      .from('documents')
      .update({
        status: 'completing',
        updated_at: nowIso,
      })
      .eq('id', doc.id)
      .in('status', ['sent', 'viewed'])
      .select('id, status')
      .maybeSingle()

    // If check constraint does not include 'completing' yet (pending migration), allow graceful fallback
    const constraintNotMigrated = claimError?.code === '23514'

    if (!constraintNotMigrated && (claimError || !claimedDoc)) {
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
    const cleanDocTitle = doc.title || 'Document'
    const pdfAttachment = {
      filename: `${cleanDocTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_signed.pdf`,
      content: flattenedBuffer,
    }

    // Email to signer
    await sendTransactionalEmail({
      to: signer.email,
      subject: `Your signed copy of "${cleanDocTitle}"`,
      html: `
        <div style="font-family: sans-serif; padding: 28px; color: #1e293b; max-width: 540px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="margin-top: 0;">Your document is signed</h2>
          <p>Thank you for completing <strong>${cleanDocTitle}</strong>.</p>
          <p>A copy of your signed PDF is attached to this email for your records. The complete, tamper-evident activity record is archived securely.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #64748b;">Powered by Watchpost Sign &bull; Simple, honest e-signatures</p>
        </div>
      `,
      documentId: doc.id,
      template: 'completed_to_signer',
      attachments: [pdfAttachment],
    })

    // Email to sender
    if (ownerProfile?.email) {
      const signerDisplayName = signer.name || signer.email
      await sendTransactionalEmail({
        to: ownerProfile.email,
        subject: `${signerDisplayName} completed "${cleanDocTitle}"`,
        html: `
          <div style="font-family: sans-serif; padding: 28px; color: #1e293b; max-width: 540px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="margin-top: 0;">Document completed!</h2>
            <p><strong>${signerDisplayName}</strong> has signed <strong>${cleanDocTitle}</strong>.</p>
            <p>The flattened signed PDF is attached to this email and safely backed up in your Watchpost dashboard.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 12px; color: #64748b;">Powered by Watchpost Sign &bull; Simple, honest e-signatures</p>
          </div>
        `,
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
