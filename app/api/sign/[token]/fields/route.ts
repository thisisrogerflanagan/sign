import { NextResponse } from 'next/server'
import { resolveSignerToken } from '@/lib/signer-context'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const context = await resolveSignerToken(token)

    if (context.errorType || !context.document) {
      return NextResponse.json({ error: 'Invalid or inactive signing link' }, { status: 403 })
    }

    const body = await req.json()
    const { fieldId, value } = body

    if (!fieldId) {
      return NextResponse.json({ error: 'Missing fieldId' }, { status: 400 })
    }

    // Ensure field belongs to this document
    const admin = createAdminClient()
    const { data: field, error: fieldError } = await admin
      .from('fields')
      .select('id, document_id, value')
      .eq('id', fieldId)
      .eq('document_id', context.document.id)
      .single()

    if (fieldError || !field) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 })
    }

    let newValue = value !== undefined ? value : null
    if (field.value && typeof field.value === 'string' && field.value.startsWith('{"__wp":')) {
      try {
        const parsed = JSON.parse(field.value)
        parsed.val = newValue
        newValue = JSON.stringify(parsed)
      } catch {}
    }

    // Update field value
    const nowIso = new Date().toISOString()
    const { error: updateError } = await admin
      .from('fields')
      .update({
        value: newValue,
        filled_at: value ? nowIso : null,
      })
      .eq('id', fieldId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save field value' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
