import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTransactionalEmail } from '@/lib/email/client'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // 1. Mark entitlement refund_status = 'requested'
    const { error: updateError } = await admin
      .from('entitlements')
      .update({ refund_status: 'requested' })
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to record refund request' }, { status: 500 })
    }

    // 2. Notify support inbox
    await sendTransactionalEmail({
      to: 'support@watchposthq.com',
      subject: `Refund Requested: ${user.email}`,
      html: `
        <div style="font-family: sans-serif; padding: 24px;">
          <h2>Refund Request Submitted</h2>
          <p>User <strong>${user.email}</strong> (ID: <code>${user.id}</code>) has requested a refund for their lifetime founder license.</p>
          <p>Please review and process via the Stripe dashboard.</p>
        </div>
      `,
      template: 'refund_requested_notification',
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
