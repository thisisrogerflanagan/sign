import { createAdminClient } from '@/lib/supabase/admin'

export type AuditActorType = 'sender' | 'signer' | 'system'

export type AuditEventType =
  | 'document_created'
  | 'document_sent'
  | 'document_viewed'
  | 'field_filled'
  | 'document_completed'
  | 'document_declined'
  | 'reminder_sent'
  | 'document_voided'
  | 'document_deleted'
  | 'signed_pdf_downloaded'

export interface WriteAuditEventParams {
  documentId: string
  actorType: AuditActorType
  actorEmail?: string | null
  eventType: AuditEventType
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Writes an append-only audit event via the service role.
 */
export async function writeAuditEvent(params: WriteAuditEventParams) {
  const supabase = createAdminClient()

  const { error } = await supabase.from('audit_events').insert({
    document_id: params.documentId,
    actor_type: params.actorType,
    actor_email: params.actorEmail ?? null,
    event_type: params.eventType,
    ip_address: params.ipAddress ?? null,
    user_agent: params.userAgent ?? null,
    metadata: params.metadata ?? {},
  })

  if (error) {
    console.error('Failed to write audit event:', error)
    throw error
  }
}
