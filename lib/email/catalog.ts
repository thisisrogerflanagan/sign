/**
 * Master catalog of transactional email templates for Scribbble
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
  const subject = `Your Scribbble receipt (${amountFormatted})`
  const html = `
    <div style="font-family: sans-serif; padding: 32px; color: #1e293b; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2>Payment Receipt</h2>
      <p>Thank you for purchasing the <strong>Scribbble Lifetime Founder License</strong>.</p>
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Amount:</strong> ${amountFormatted}</p>
        <p style="margin: 0 0 8px 0;"><strong>Plan:</strong> Lifetime Access (50 requests/month)</p>
        <p style="margin: 0;"><strong>Account:</strong> ${email}</p>
      </div>
      ${stripeReceiptUrl ? `<p><a href="${stripeReceiptUrl}" style="color: #2563eb;">View official Stripe receipt &rarr;</a></p>` : ''}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #64748b;">Questions? Reply directly to this email or reach us at support@scribbble.com.</p>
    </div>
  `
  return { subject, html }
}

export function renderClaimInviteEmail({ claimUrl }: { claimUrl: string }) {
  const subject = `Claim your Scribbble Founder License`
  const html = `
    <div style="font-family: sans-serif; padding: 32px; color: #1e293b; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2>Welcome to Scribbble</h2>
      <p>Your lifetime purchase is confirmed. Click below to activate your account and access your document dashboard.</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${claimUrl}" style="background: #0f172a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">Claim Founder Access</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">Or paste this link: ${claimUrl}</p>
    </div>
  `
  return { subject, html }
}

export interface SignatureRequestEmailProps {
  senderName: string
  documentTitle: string
  signingUrl: string
  senderMessage?: string | null
  isTest?: boolean
  appUrl?: string
}

export function renderSignatureRequestEmail({
  senderName,
  documentTitle,
  signingUrl,
  senderMessage,
  isTest,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
}: SignatureRequestEmailProps) {
  const subject = isTest
    ? `[TEST] ${senderName} requested your signature on "${documentTitle}"`
    : `${senderName} requested your signature on "${documentTitle}"`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 40px 20px; line-height: 1.5; }
    .card { max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; }
    .tag { display: inline-block; background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; margin-bottom: 12px; }
    h1 { font-size: 20px; font-weight: 600; margin: 0 0 16px 0; color: #0f172a; }
    p { font-size: 14px; margin: 0 0 16px 0; color: #475569; }
    .message-box { background: #f1f5f9; border-left: 3px solid #cbd5e1; padding: 12px 16px; margin: 16px 0; font-size: 13px; font-style: italic; color: #334155; }
    .btn { display: inline-block; background-color: #0f172a; color: #ffffff !important; font-size: 14px; font-weight: 500; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 8px 0 20px 0; }
    .footer { font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 24px; }
    .footer a { color: #64748b; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    ${isTest ? '<div class="tag">TEST REQUEST</div>' : ''}
    <h1>${senderName} requested your signature</h1>
    <p>Please review and sign <strong>${documentTitle}</strong>. No account or password is required.</p>
    
    ${senderMessage ? `<div class="message-box">"${senderMessage}"</div>` : ''}

    <div style="text-align: center; margin: 24px 0;">
      <a href="${signingUrl}" class="btn">Review and Sign Document</a>
    </div>

    <p style="font-size: 12px; color: #64748b;">
      Or copy and paste this link in your browser:<br>
      <a href="${signingUrl}" style="color: #2563eb; word-break: break-all;">${signingUrl}</a>
    </p>

    <p style="font-size: 12px; color: #94a3b8; margin: 0 0 8px 0;">
      Single-use link expires in 90 days.
    </p>

    <div class="footer">
      <a href="${appUrl}" style="color: #64748b; text-decoration: underline;">Sent via Scribbble — e-signatures with a one-time payment</a>
    </div>
  </div>
</body>
</html>
`

  const text = `
${senderName} requested your signature on "${documentTitle}".
${isTest ? '(This is a test request)\n' : ''}
${senderMessage ? `Message: "${senderMessage}"\n` : ''}
Review and sign here (no account needed):
${signingUrl}

Link expires in 90 days.
Sent via Scribbble — e-signatures with a one-time payment: ${appUrl}
`

  return { subject, html, text }
}

export function renderCompletedDocumentSignerEmail({
  documentTitle,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
}: {
  documentTitle: string
  appUrl?: string
}) {
  const cleanDocTitle = documentTitle || 'Document'
  const subject = `Your signed copy of "${cleanDocTitle}"`
  const html = `
    <div style="font-family: sans-serif; padding: 28px; color: #1e293b; max-width: 540px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="margin-top: 0;">Your document is signed</h2>
      <p>Thank you for completing <strong>${cleanDocTitle}</strong>.</p>
      <p>A copy of your signed PDF is attached to this email for your records. The complete, tamper-evident activity record is archived securely.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #64748b; margin: 0;"><a href="${appUrl}" style="color: #64748b; text-decoration: underline;">Sent via Scribbble — e-signatures with a one-time payment</a></p>
    </div>
  `
  const text = `Your document "${cleanDocTitle}" is signed.

A copy of your signed PDF is attached to this email for your records. The complete, tamper-evident activity record is archived securely.

Sent via Scribbble — e-signatures with a one-time payment: ${appUrl}
`
  return { subject, html, text }
}

export function renderCompletedDocumentSenderEmail({
  signerDisplayName,
  documentTitle,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
}: {
  signerDisplayName: string
  documentTitle: string
  appUrl?: string
}) {
  const cleanDocTitle = documentTitle || 'Document'
  const subject = `${signerDisplayName} completed "${cleanDocTitle}"`
  const html = `
    <div style="font-family: sans-serif; padding: 28px; color: #1e293b; max-width: 540px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="margin-top: 0;">Document completed!</h2>
      <p><strong>${signerDisplayName}</strong> has signed <strong>${cleanDocTitle}</strong>.</p>
      <p>The flattened signed PDF is attached to this email and safely backed up in your Scribbble dashboard.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #64748b; margin: 0;"><a href="${appUrl}" style="color: #64748b; text-decoration: underline;">Sent via Scribbble — e-signatures with a one-time payment</a></p>
    </div>
  `
  const text = `Document completed!

${signerDisplayName} has signed "${cleanDocTitle}".
The flattened signed PDF is attached to this email and safely backed up in your Scribbble dashboard.

Sent via Scribbble — e-signatures with a one-time payment: ${appUrl}
`
  return { subject, html, text }
}
