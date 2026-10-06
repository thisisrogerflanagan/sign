interface SignatureRequestEmailProps {
  senderName: string
  documentTitle: string
  signingUrl: string
  senderMessage?: string | null
  isTest?: boolean
}

export function renderSignatureRequestEmail({
  senderName,
  documentTitle,
  signingUrl,
  senderMessage,
  isTest,
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
    .footer { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 24px; }
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

    <div class="footer">
      Sent securely via Scribbble. Single-use link expires in 90 days.
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

Link expires in 90 days. Sent securely via Scribbble.
`

  return { subject, html, text }
}
