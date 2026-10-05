import { describe, it, expect } from 'vitest'
import { encodeFieldForDb, decodeFieldFromDb, FieldPayload } from '@/lib/fields-codec'

describe('Fields Codec Unit Tests', () => {
  it('encodes and decodes field payloads losslessly through __wp metadata', () => {
    const documentId = 'doc-123e4567-e89b'
    const originalField: FieldPayload = {
      id: 'field-1',
      type: 'name',
      label: 'Client Full Name',
      assigned_to: 'signer',
      is_suggestion: true,
      page: 1,
      x: 0.15,
      y: 0.72,
      width: 0.25,
      height: 0.04,
      required: true,
      value: 'Jane Doe',
    }

    const dbRow = encodeFieldForDb(originalField, documentId)

    // DB row maps 'name' to 'text' to satisfy DB check constraint
    expect(dbRow.type).toBe('text')
    expect(dbRow.document_id).toBe(documentId)
    expect(dbRow.x).toBe(0.15)
    expect(dbRow.y).toBe(0.72)
    expect(dbRow.width).toBe(0.25)
    expect(dbRow.height).toBe(0.04)
    expect(dbRow.required).toBe(true)
    expect(dbRow.value).toContain('__wp')

    // Decode back
    const decoded = decodeFieldFromDb({
      ...dbRow,
      id: originalField.id,
    })

    expect(decoded.type).toBe('name')
    expect(decoded.label).toBe('Client Full Name')
    expect(decoded.assigned_to).toBe('signer')
    expect(decoded.is_suggestion).toBe(true)
    expect(decoded.value).toBe('Jane Doe')
    expect(decoded.page).toBe(1)
    expect(decoded.x).toBe(0.15)
    expect(decoded.y).toBe(0.72)
  })

  it('clamps out-of-bounds coordinates to 0..1', () => {
    const field: FieldPayload = {
      type: 'signature',
      page: 1,
      x: -0.5,
      y: 1.5,
      width: 1.5,
      height: 0,
    }

    const row = encodeFieldForDb(field, 'doc-1')
    expect(row.x).toBe(0)
    expect(row.y).toBe(1)
    expect(row.width).toBe(1)
    expect(row.height).toBe(0.01) // minimum 0.01
  })

  it('gracefully decodes legacy rows lacking __wp metadata envelope', () => {
    const legacyRow = {
      id: 'legacy-1',
      document_id: 'doc-legacy',
      type: 'signature',
      page: 2,
      x: 0.2,
      y: 0.8,
      width: 0.2,
      height: 0.05,
      required: true,
      value: 'raw_signature_or_null',
    }

    const decoded = decodeFieldFromDb(legacyRow)
    expect(decoded.type).toBe('signature')
    expect(decoded.label).toBe('Signature')
    expect(decoded.assigned_to).toBe('signer')
    expect(decoded.is_suggestion).toBe(false)
    expect(decoded.value).toBe('raw_signature_or_null')
  })
})
