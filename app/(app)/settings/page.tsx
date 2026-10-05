import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SettingsClientView } from '@/components/settings/settings-client-view'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = createAdminClient()

  // 1. Fetch profile
  const { data: profile } = await admin
    .from('profiles')
    .select('display_name, timezone')
    .eq('id', user.id)
    .single()

  // 2. Fetch entitlement
  const { data: entitlement } = await admin
    .from('entitlements')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // 3. Fetch monthly usage
  const currentMonthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
    .toISOString()
    .split('T')[0]

  const nextMonthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const { data: usageRow } = await admin
    .from('usage_counters')
    .select('requests_sent')
    .eq('user_id', user.id)
    .eq('period_start', currentMonthStart)
    .single()

  return (
    <SettingsClientView
      userEmail={user.email || ''}
      profile={{
        displayName: profile?.display_name || '',
        timezone: profile?.timezone || 'America/New_York',
      }}
      entitlement={{
        plan: entitlement?.plan || 'lifetime_founder',
        purchasedAt: entitlement?.purchased_at || null,
        refundStatus: entitlement?.refund_status || 'none',
      }}
      usage={{
        requestsSent: usageRow?.requests_sent || 0,
        resetDate: nextMonthStart,
      }}
    />
  )
}
