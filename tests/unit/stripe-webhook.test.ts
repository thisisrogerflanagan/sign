import { describe, it, expect, vi, beforeEach } from 'vitest'
import Stripe from 'stripe'

// Mock createAdminClient from @/lib/supabase/admin
const mockUpsert = vi.fn().mockResolvedValue({ error: null })
const mockFrom = vi.fn().mockReturnValue({
  upsert: mockUpsert,
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

describe('Stripe Webhook Handler Tests', () => {
  const TEST_STRIPE_SECRET = 'sk_test_123456789'
  const TEST_WEBHOOK_SECRET = 'whsec_test_secret_for_signing'

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = TEST_STRIPE_SECRET
    process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET
  })

  it('rejects requests with missing or invalid stripe-signature header', async () => {
    const { POST } = await import('@/app/api/webhooks/stripe/route')

    // Missing signature
    const reqWithoutSig = new Request('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify({ type: 'payment_intent.succeeded' }),
    })
    const resNoSig = await POST(reqWithoutSig)
    expect(resNoSig.status).toBe(400)
    expect(await resNoSig.text()).toContain('Stripe signature missing')

    // Invalid signature
    const reqInvalidSig = new Request('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'invalid_sig' },
      body: JSON.stringify({ type: 'payment_intent.succeeded' }),
    })
    const resInvalid = await POST(reqInvalidSig)
    expect(resInvalid.status).toBe(400)
    expect(await resInvalid.text()).toContain('Webhook Error')
  })

  it('successfully processes checkout.session.completed signed payload and records purchase', async () => {
    const stripe = new Stripe(TEST_STRIPE_SECRET, {
      apiVersion: '2025-02-24.acacia' as any,
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')

    const payload = JSON.stringify({
      id: 'evt_test_123',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_abc',
          customer_details: { email: 'client@example.com' },
          payment_intent: 'pi_test_xyz',
          amount_total: 4900,
        },
      },
    })

    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: TEST_WEBHOOK_SECRET,
    })

    const req = new Request('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': signature },
      body: payload,
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.received).toBe(true)

    expect(mockFrom).toHaveBeenCalledWith('purchases')
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        email: 'client@example.com',
        stripe_payment_id: 'pi_test_xyz',
        amount_cents: 4900,
      },
      { onConflict: 'email' }
    )
  })

  it('successfully processes payment_intent.succeeded signed payload', async () => {
    const stripe = new Stripe(TEST_STRIPE_SECRET, {
      apiVersion: '2025-02-24.acacia' as any,
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')

    const payload = JSON.stringify({
      id: 'evt_test_pi',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_456',
          receipt_email: 'buyer@example.com',
          amount: 4900,
        },
      },
    })

    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: TEST_WEBHOOK_SECRET,
    })

    const req = new Request('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': signature },
      body: payload,
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockUpsert).toHaveBeenCalledWith(
      {
        email: 'buyer@example.com',
        stripe_payment_id: 'pi_test_456',
        amount_cents: 4900,
      },
      { onConflict: 'email' }
    )
  })
})
