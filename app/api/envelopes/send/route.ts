import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignerToken, hashSignerToken } from '@/lib/tokens'
import { writeAuditEvent } from '@/lib/audit'
import { captureServerEvent } from '@/lib/analytics'
import { sendTransactionalEmail } from '@/lib/email/client'
import { renderSignatureRequestEmail } from '@/lib/email/templates'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      documentId,
      signerName,
      signerEmail,
      senderMessage,
      isTest = false,
    } = body

    if (!documentId || !signerEmail) {
      return NextResponse.json(
        { error: 'Document ID and recipient email are required.' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(signerEmail.trim())) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // 1. Verify owner & document status
    const { data: doc, error: docError } = await admin
      .from('documents')
      .select('id, owner_id, title, status, page_count')
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (doc.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft documents can be sent.' },
        { status: 400 }
      )
    }

    // 2. Verify at least 1 field is placed
    const { count: fieldCount, error: countError } = await admin
      .from('fields')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', documentId)

    if (countError || !fieldCount || fieldCount === 0) {
      return NextResponse.json(
        { error: 'Please place at least one signature or input field before sending.' },
        { status: 400 }
      )
    }

    // 3. Fair-use cap check (unless is_test)
    const currentMonthStart = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
    )
      .toISOString()
      .split('T')[0]

    let currentUsage = 0

    if (!isTest) {
      const { data: usageRow } = await admin
        .from('usage_counters')
        .select('requests_sent')
        .eq('user_id', user.id)
        .eq('period_start', currentMonthStart)
        .single()

      currentUsage = usageRow?.requests_sent || 0

      if (currentUsage >= 50) {
        await captureServerEvent(user.id, {
          name: 'usage_cap_hit',
          properties: { requests_sent: currentUsage },
        })

        return NextResponse.json(
          {
            error:
              'You have reached your 50 signature requests fair-use cap for this month. Your quota resets on the 1st of next month.',
          },
          { status: 403 }
        )
      }
    }

    // 4. Generate signer token (256-bit random, SHA-256 hash at rest)
    const rawToken = generateSignerToken()
    const tokenHash = hashSignerToken(rawToken)
    const tokenExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days

    // Delete any old signer records for this draft and create fresh signer
    await admin.from('signers').delete().eq('document_id', documentId)

    const { data: signer, error: signerError } = await admin
      .from('signers')
      .insert({
        document_id: documentId,
        name: signerName?.trim() || null,
        email: signerEmail.trim().toLowerCase(),
        token_hash: tokenHash,
        token_expires_at: tokenExpiresAt,
      })
      .select('id')
      .single()

    if (signerError || !signer) {
      console.error('Failed to create signer record:', signerError)
      return NextResponse.json({ error: 'Failed to create signer' }, { status: 500 })
    }

    // Assign all document fields to this signer
    await admin
      .from('fields')
      .update({ signer_id: signer.id })
      .eq('document_id', documentId)

    // 5. Update document to 'sent'
    const nowIso = new Date().toISOString()
    await admin
      .from('documents')
      .update({
        status: 'sent',
        sent_at: nowIso,
        is_test: isTest,
        sender_message: senderMessage?.trim() || null,
      })
      .eq('id', documentId)

    // 6. Increment usage counter (non-test only)
    if (!isTest) {
      await admin.from('usage_counters').upsert(
        {
          user_id: user.id,
          period_start: currentMonthStart,
          requests_sent: currentUsage + 1,
        },
        { onConflict: 'user_id,period_start' }
      )
    }

    // 7. Write audit event
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || null
    const userAgent = req.headers.get('user-agent') || null

    await writeAuditEvent({
      documentId,
      actorType: 'sender',
      actorEmail: user.email,
      eventType: 'document_sent',
      ipAddress: ip,
      userAgent,
      metadata: {
        is_test: isTest,
        signer_email: signerEmail.trim().toLowerCase(),
        field_count: fieldCount,
      },
    })

    // 8. Send signature request email via Resend
    // Fetch sender profile for display name
    const { data: profile } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    const senderDisplayName = profile?.display_name || user.email?.split('@')[0] || 'Someone'

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const signingUrl = `${appUrl}/sign/${rawToken}`

    const emailContent = renderSignatureRequestEmail({
      senderName: senderDisplayName,
      documentTitle: doc.title,
      signingUrl,
      senderMessage,
      isTest,
    })

    await sendTransactionalEmail({
      to: signerEmail.trim().toLowerCase(),
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      documentId,
      template: 'signature_request',
    })

    // 9. Fire PostHog server event
    if (isTest) {
      await captureServerEvent(user.id, { name: 'test_request_sent' })
    } else {
      await captureServerEvent(user.id, {
        name: 'document_sent',
        properties: { is_test: false, field_count: fieldCount },
      })
    }

    return NextResponse.json({
      success: true,
      documentId,
      signingUrl, // Returned once so sender can immediately copy if desired
    })
  } catch (err: any) {
    console.error('Error in envelope send route:', err)
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred while sending.' },
      { status: 500 }
    )
  }
}
