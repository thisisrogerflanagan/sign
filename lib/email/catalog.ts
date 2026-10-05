/**
 * Master catalog of transactional email templates for Watchpost Sign
 * Clean, minimal, high-deliverability HTML + plain text fallbacks.
 */

export function renderReceiptEmail({
  email,
  amountFormatted,
  stripeReceiptUrl,
}: {
  email: string
  amountFormatted: string
  stripeReceiptUrl?: string
}) {
  const subject = `Your Watchpost Sign receipt (${amountFormatted})`
  const html = `
    <div style="font-family: sans-serif; padding: 32px; color: #1e293b; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2>Payment Receipt</h2>
      <p>Thank you for purchasing the <strong>Watchpost Sign Lifetime Founder License</strong>.</p>
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Amount:</strong> ${amountFormatted}</p>
        <p style="margin: 0 0 8px 0;"><strong>Plan:</strong> Lifetime Access (50 requests/month)</p>
        <p style="margin: 0;"><strong>Account:</strong> ${email}</p>
      </div>
      ${stripeReceiptUrl ? `<p><a href="${stripeReceiptUrl}" style="color: #2563eb;">View official Stripe receipt &rarr;</a></p>` : ''}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #64748b;">Questions? Reply directly to this email or reach us at support@watchposthq.com.</p>
    </div>
  `
  return { subject, html }
}

export function renderClaimInviteEmail({
  claimUrl,
}: {
  claimUrl: string
}) {
  const subject = `Claim your Watchpost Sign Founder License`
  const html = `
    <div style="font-family: sans-serif; padding: 32px; color: #1e293b; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2>Welcome to Watchpost Sign</h2>
      <p>Your lifetime purchase is confirmed. Click below to activate your account and access your document dashboard.</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${claimUrl}" style="background: #0f172a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">Claim Founder Access</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">Or paste this link: ${claimUrl}</p>
    </div>
  `
  return { subject, html }
}
