import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignerToken, hashSignerToken } from '@/lib/tokens'
import { sendTransactionalEmail } from '@/lib/email/client'
import { renderSignatureRequestEmail } from '@/lib/email/templates'
import { writeAuditEvent } from '@/lib/audit'
import { captureServerEvent } from '@/lib/analytics'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { documentId } = await req.json()
    if (!documentId) return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })

    const admin = createAdminClient()

    // Verify ownership and valid reminder status (sent or viewed)
    const { data: doc } = await admin
      .from('documents')
      .select('id, owner_id, title, status, sender_message, is_test')
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .single()

    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    if (doc.status !== 'sent' && doc.status !== 'viewed') {
      return NextResponse.json(
        { error: 'Reminders can only be sent for pending documents.' },
        { status: 400 }
      )
    }

    // Fetch signer
    const { data: signer } = await admin
      .from('signers')
      .select('*')
      .eq('document_id', documentId)
      .single()

    if (!signer) return NextResponse.json({ error: 'No signer found' }, { status: 404 })

    // Regenerate a fresh 32-byte token for the email link
    const rawToken = generateSignerToken()
    const tokenHash = hashSignerToken(rawToken)
    const tokenExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

    await admin
      .from('signers')
      .update({
        token_hash: tokenHash,
        token_expires_at: tokenExpiresAt,
      })
      .eq('id', signer.id)

    // Sender profile for display name
    const { data: profile } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    const senderDisplayName = profile?.display_name || user.email?.split('@')[0] || 'Someone'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const signingUrl = `${appUrl}/sign/${rawToken}`

    // Send reminder email
    const emailContent = renderSignatureRequestEmail({
      senderName: senderDisplayName,
      documentTitle: doc.title,
      signingUrl,
      senderMessage: doc.sender_message,
      isTest: doc.is_test,
    })

    await sendTransactionalEmail({
      to: signer.email,
      subject: `Reminder: ${senderDisplayName} requested your signature on "${doc.title}"`,
      html: emailContent.html,
      text: emailContent.text,
      documentId: doc.id,
      template: 'reminder',
    })

    // Audit event
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || null
    const userAgent = req.headers.get('user-agent') || null

    await writeAuditEvent({
      documentId: doc.id,
      actorType: 'sender',
      actorEmail: user.email,
      eventType: 'reminder_sent',
      ipAddress: ip,
      userAgent,
      metadata: { signer_email: signer.email },
    })

    await captureServerEvent(user.id, {
      name: 'reminder_sent',
      properties: { document_id: doc.id },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
