'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { captureServerEvent } from '@/lib/analytics'
import { redirect } from 'next/navigation'

export async function claimFounderPurchase(formData: FormData) {
  const emailInput = formData.get('email') as string
  if (!emailInput) {
    return { error: 'Please enter the email address used for purchase.' }
  }

  const email = emailInput.trim().toLowerCase()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to claim an entitlement.' }
  }

  // Look up purchases by email using admin client (service role)
  const admin = createAdminClient()
  const { data: purchase, error: purchaseError } = await admin
    .from('purchases')
    .select('*')
    .eq('email', email)
    .single()

  if (purchaseError || !purchase) {
    return {
      error:
        'We could not find a completed $49 founder purchase for that email. If you recently paid or used a different email, please contact support@scribbble.com.',
    }
  }

  // Create entitlement
  const { error: entitlementError } = await admin.from('entitlements').upsert({
    user_id: user.id,
    plan: 'lifetime_founder',
    stripe_payment_id: purchase.stripe_payment_id,
    purchased_at: purchase.created_at,
    refund_status: 'none',
  })

  if (entitlementError) {
    console.error('Failed to create entitlement:', entitlementError)
    return {
      error: 'Failed to claim your license. Please try again or reach out to support.',
    }
  }

  // Mark purchase as claimed
  await admin.from('purchases').update({ claimed_by: user.id }).eq('id', purchase.id)

  // Track event
  await captureServerEvent(user.id, {
    name: 'founder_claimed',
  })

  redirect('/welcome')
}
