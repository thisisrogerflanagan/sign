import { FieldType } from '@/lib/supabase/types'

export interface FieldPayload {
  id?: string
  type: FieldType
  label?: string | null
  assigned_to?: 'signer' | 'sender'
  is_suggestion?: boolean
  page: number
  x: number
  y: number
  width: number
  height: number
  required?: boolean
  value?: string | null
}

export interface StoredDbRow {
  id?: string
  document_id: string
  type: string
  page: number
  x: number
  y: number
  width: number
  height: number
  required: boolean
  value: string | null
  label?: string | null
  assigned_to?: string | null
  is_suggestion?: boolean | null
}

/**
 * Encodes field metadata into a backward-compatible format for Supabase
 * where 'label', 'assigned_to', or 'is_suggestion' columns may not yet exist
 * in the remote schema cache.
 */
export function encodeFieldForDb(f: FieldPayload, documentId: string): StoredDbRow {
  // DB check constraint on remote allows: 'signature' | 'initials' | 'date' | 'text'
  const dbType = f.type === 'name' ? 'text' : f.type

  const metaPayload = {
    __wp: {
      type: f.type,
      label: f.label ?? null,
      assigned_to: f.assigned_to ?? 'signer',
      is_suggestion: f.is_suggestion ?? false,
    },
    val: f.value ?? null,
  }

  return {
    document_id: documentId,
    type: dbType,
    page: f.page,
    x: Math.max(0, Math.min(1, f.x)),
    y: Math.max(0, Math.min(1, f.y)),
    width: Math.max(0.01, Math.min(1, f.width)),
    height: Math.max(0.01, Math.min(1, f.height)),
    required: f.required ?? true,
    value: JSON.stringify(metaPayload),
  }
}

/**
 * Decodes a stored database row, unpacking any embedded __wp metadata.
 */
export function decodeFieldFromDb(row: any): FieldPayload {
  let effectiveType: FieldType = (row.type as FieldType) || 'text'
  let effectiveLabel: string | null = row.label ?? null
  let effectiveAssignedTo: 'signer' | 'sender' = (row.assigned_to as any) || 'signer'
  let effectiveIsSuggestion: boolean = !!row.is_suggestion
  let effectiveValue: string | null = row.value ?? null

  if (row.value && typeof row.value === 'string' && row.value.startsWith('{"__wp":')) {
    try {
      const parsed = JSON.parse(row.value)
      if (parsed.__wp) {
        if (parsed.__wp.type) effectiveType = parsed.__wp.type
        if (parsed.__wp.label !== undefined) effectiveLabel = parsed.__wp.label
        if (parsed.__wp.assigned_to) effectiveAssignedTo = parsed.__wp.assigned_to
        if (parsed.__wp.is_suggestion !== undefined) effectiveIsSuggestion = parsed.__wp.is_suggestion
        effectiveValue = parsed.val ?? null
      }
    } catch {
      // Keep fallback
    }
  }

  // Ensure default labels
  if (!effectiveLabel) {
    if (effectiveType === 'signature') effectiveLabel = 'Signature'
    else if (effectiveType === 'name') effectiveLabel = 'Full Name'
    else if (effectiveType === 'date') effectiveLabel = 'Date Signed'
    else if (effectiveType === 'initials') effectiveLabel = 'Initials'
    else effectiveLabel = 'Text'
  }

  return {
    id: row.id,
    type: effectiveType,
    label: effectiveLabel,
    assigned_to: effectiveAssignedTo,
    is_suggestion: effectiveIsSuggestion,
    page: row.page,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    required: row.required ?? true,
    value: effectiveValue,
  }
}
