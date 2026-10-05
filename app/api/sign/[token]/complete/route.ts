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
      return NextResponse.json({ error: 'Invalid or expired signing link' }, { status: 403 })
    }

    const { document: doc, signer, ownerProfile, fields } = context

    if (doc.status !== 'sent' && doc.status !== 'viewed') {
      return NextResponse.json(
        { error: 'Document is not in a signable state' },
        { status: 400 }
      )
    }

    // Check all required fields are filled
    const requiredFields = fields.filter((f) => f.required)
    const missing = requiredFields.filter((f) => !f.value)

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Please fill all ${missing.length} required fields before signing.` },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // 1. Download original PDF from 'originals' bucket
    const { data: originalFile, error: downloadError } = await admin.storage
      .from('originals')
      .download(doc.storage_path_original)

    if (downloadError || !originalFile) {
      console.error('Failed to download original PDF:', downloadError)
      return NextResponse.json({ error: 'Failed to access original PDF' }, { status: 500 })
    }

    const originalBuffer = Buffer.from(await originalFile.arrayBuffer())

    // 2. Flatten fields into the PDF
    const flattenedBuffer = await flattenPdf(
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

    // 3. Upload signed PDF to 'signed' bucket
    const signedPath = `${doc.owner_id}/${doc.id}/signed.pdf`
    const { error: uploadSignedError } = await admin.storage
      .from('signed')
      .upload(signedPath, flattenedBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadSignedError) {
      console.error('Failed to upload signed PDF:', uploadSignedError)
      return NextResponse.json({ error: 'Failed to save signed PDF' }, { status: 500 })
    }

    // 4. Update document status to completed
    const nowIso = new Date().toISOString()
    await admin
      .from('documents')
      .update({
        status: 'completed',
        completed_at: nowIso,
        storage_path_signed: signedPath,
      })
      .eq('id', doc.id)

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
