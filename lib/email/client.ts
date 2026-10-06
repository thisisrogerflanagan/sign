import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not set. Email will be simulated in dev/test.')
    return null
  }
  return new Resend(apiKey)
}

interface SendEmailParams {
  to: string
  subject: string
  html: string
  text?: string
  documentId?: string
  template: string
  attachments?: Array<{
    filename: string
    content: Buffer
  }>
}

export async function sendTransactionalEmail(params: SendEmailParams) {
  const resend = getResendClient()
  const fromEmail = process.env.EMAIL_FROM || 'Scribbble <sign@scribbble.com>'

  let providerMessageId: string | null = null

  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        attachments: params.attachments,
      })

      if (error) {
        console.error(`Resend failed for ${params.to} (${params.template}):`, error)
      } else if (data) {
        providerMessageId = data.id
      }
    } catch (err: any) {
      console.error(`Exception sending email to ${params.to}:`, err)
    }
  } else {
    console.log(`[SIMULATED EMAIL to: ${params.to}] Subject: ${params.subject}`)
    providerMessageId = `sim_${Date.now()}`
  }

  // Always log to email_log for audit and supportability
  try {
    const admin = createAdminClient()
    await admin.from('email_log').insert({
      document_id: params.documentId ?? null,
      to_email: params.to,
      template: params.template,
      provider_message_id: providerMessageId,
    })
  } catch (logErr) {
    console.error('Failed to write email_log row:', logErr)
  }

  return { success: true, messageId: providerMessageId }
}
