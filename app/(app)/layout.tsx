import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClaimPage from './claim/page'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Middleware redirects unauthenticated users, but check defensively
  if (!user) {
    redirect('/login')
  }

  // Check entitlements
  const { data: entitlement } = await supabase
    .from('entitlements')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // If user does not have an entitlement yet, show the Claim screen directly
  if (!entitlement) {
    return <ClaimPage />
  }

  return <>{children}</>
}
