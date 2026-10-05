export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type DocumentStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'completed'
  | 'declined'
  | 'voided'
  | 'deleted'

export type FieldType = 'signature' | 'initials' | 'date' | 'name' | 'text'

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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          timezone: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          timezone?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          timezone?: string
          created_at?: string
        }
      }
      entitlements: {
        Row: {
          user_id: string
          plan: string
          stripe_customer_id: string | null
          stripe_payment_id: string | null
          purchased_at: string | null
          refund_status: 'none' | 'requested' | 'refunded'
          created_at: string
        }
        Insert: {
          user_id: string
          plan?: string
          stripe_customer_id?: string | null
          stripe_payment_id?: string | null
          purchased_at?: string | null
          refund_status?: 'none' | 'requested' | 'refunded'
          created_at?: string
        }
        Update: {
          user_id?: string
          plan?: string
          stripe_customer_id?: string | null
          stripe_payment_id?: string | null
          purchased_at?: string | null
          refund_status?: 'none' | 'requested' | 'refunded'
          created_at?: string
        }
      }
      purchases: {
        Row: {
          id: string
          email: string
          stripe_payment_id: string | null
          amount_cents: number
          claimed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          stripe_payment_id?: string | null
          amount_cents?: number
          claimed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          stripe_payment_id?: string | null
          amount_cents?: number
          claimed_by?: string | null
          created_at?: string
        }
      }
      usage_counters: {
        Row: {
          user_id: string
          period_start: string
          requests_sent: number
        }
        Insert: {
          user_id: string
          period_start: string
          requests_sent?: number
        }
        Update: {
          user_id?: string
          period_start?: string
          requests_sent?: number
        }
      }
      documents: {
        Row: {
          id: string
          owner_id: string
          title: string
          status: DocumentStatus
          storage_path_original: string | null
          storage_path_signed: string | null
          page_count: number | null
          is_test: boolean
          sender_message: string | null
          sent_at: string | null
          viewed_at: string | null
          completed_at: string | null
          declined_at: string | null
          voided_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title?: string
          status?: DocumentStatus
          storage_path_original?: string | null
          storage_path_signed?: string | null
          page_count?: number | null
          is_test?: boolean
          sender_message?: string | null
          sent_at?: string | null
          viewed_at?: string | null
          completed_at?: string | null
          declined_at?: string | null
          voided_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          status?: DocumentStatus
          storage_path_original?: string | null
          storage_path_signed?: string | null
          page_count?: number | null
          is_test?: boolean
          sender_message?: string | null
          sent_at?: string | null
          viewed_at?: string | null
          completed_at?: string | null
          declined_at?: string | null
          voided_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      signers: {
        Row: {
          id: string
          document_id: string
          name: string | null
          email: string
          token_hash: string | null
          token_expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          name?: string | null
          email: string
          token_hash?: string | null
          token_expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          name?: string | null
          email?: string
          token_hash?: string | null
          token_expires_at?: string | null
          created_at?: string
        }
      }
      fields: {
        Row: {
          id: string
          document_id: string
          signer_id: string | null
          type: FieldType
          label: string | null
          assigned_to: 'signer' | 'sender'
          is_suggestion: boolean
          page: number
          x: number
          y: number
          width: number
          height: number
          required: boolean
          value: string | null
          filled_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          signer_id?: string | null
          type: FieldType
          label?: string | null
          assigned_to?: 'signer' | 'sender'
          is_suggestion?: boolean
          page?: number
          x: number
          y: number
          width: number
          height: number
          required?: boolean
          value?: string | null
          filled_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          signer_id?: string | null
          type?: FieldType
          label?: string | null
          assigned_to?: 'signer' | 'sender'
          is_suggestion?: boolean
          page?: number
          x?: number
          y?: number
          width?: number
          height?: number
          required?: boolean
          value?: string | null
          filled_at?: string | null
          created_at?: string
        }
      }
      audit_events: {
        Row: {
          id: string
          document_id: string
          actor_type: AuditActorType
          actor_email: string | null
          event_type: AuditEventType
          ip_address: string | null
          user_agent: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          actor_type: AuditActorType
          actor_email?: string | null
          event_type: AuditEventType
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          actor_type?: AuditActorType
          actor_email?: string | null
          event_type?: AuditEventType
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      email_log: {
        Row: {
          id: string
          document_id: string | null
          to_email: string
          template: string
          provider_message_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id?: string | null
          to_email: string
          template: string
          provider_message_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string | null
          to_email?: string
          template?: string
          provider_message_id?: string | null
          created_at?: string
        }
      }
    }
  }
}
