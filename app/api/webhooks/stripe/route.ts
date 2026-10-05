import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeSecretKey || !webhookSecret) {
    console.warn('Stripe webhook received without STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET configured')
    return new NextResponse('Stripe configuration missing', { status: 500 })
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-02-24.acacia' as any,
  })

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return new NextResponse('Stripe signature missing', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const supabase = createAdminClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const email = session.customer_details?.email || session.customer_email

    if (email) {
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null

      await supabase.from('purchases').upsert(
        {
          email: email.toLowerCase().trim(),
          stripe_payment_id: paymentIntentId,
          amount_cents: session.amount_total || 4900,
        },
        { onConflict: 'email' }
      )
    }
  } else if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const email = paymentIntent.receipt_email || paymentIntent.metadata?.email

    if (email) {
      await supabase.from('purchases').upsert(
        {
          email: email.toLowerCase().trim(),
          stripe_payment_id: paymentIntent.id,
          amount_cents: paymentIntent.amount || 4900,
        },
        { onConflict: 'email' }
      )
    }
  }

  return NextResponse.json({ received: true })
}
