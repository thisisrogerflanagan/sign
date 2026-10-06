import { NextResponse } from 'next/server'
import { resolveSignerToken } from '@/lib/signer-context'
import { createAdminClient } from '@/lib/supabase/admin'
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
      return NextResponse.json({ error: 'Invalid or inactive link' }, { status: 403 })
    }

    const body = await req.json()
    const { reason } = body

    const admin = createAdminClient()
    const nowIso = new Date().toISOString()

    // 1. Mark document declined
    await admin
      .from('documents')
      .update({
        status: 'declined',
        declined_at: nowIso,
      })
      .eq('id', context.document.id)

    // 2. Audit event
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || null
    const userAgent = req.headers.get('user-agent') || null

    await writeAuditEvent({
      documentId: context.document.id,
      actorType: 'signer',
      actorEmail: context.signer.email,
      eventType: 'document_declined',
      ipAddress: ip,
      userAgent,
      metadata: { reason: reason || 'No reason provided' },
    })

    // 3. PostHog event
    await captureServerEvent(context.document.owner_id, {
      name: 'document_declined',
      properties: { document_id: context.document.id },
    })

    // 4. Notify sender by email
    if (context.ownerProfile?.email) {
      const signerName = context.signer.name || context.signer.email
      await sendTransactionalEmail({
        to: context.ownerProfile.email,
        subject: `${signerName} declined to sign "${context.document.title}"`,
        html: `
          <div style="font-family: sans-serif; padding: 24px; color: #1e293b;">
            <h2>Signature Request Declined</h2>
            <p><strong>${signerName}</strong> (${context.signer.email}) chose not to sign <strong>${context.document.title}</strong>.</p>
            ${reason ? `<p><em>Reason: "${reason}"</em></p>` : ''}
            <p>You can review this request in your Scribbble dashboard.</p>
          </div>
        `,
        documentId: context.document.id,
        template: 'document_declined_notice',
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
