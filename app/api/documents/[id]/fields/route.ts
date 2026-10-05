import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encodeFieldForDb, decodeFieldFromDb } from '@/lib/fields-codec'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify document ownership
    const { data: doc } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .single()

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const { data: fields, error } = await supabase
      .from('fields')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch fields' }, { status: 500 })
    }

    const decodedFields = (fields || []).map(decodeFieldFromDb)
    return NextResponse.json({ fields: decodedFields })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify document ownership & draft status
    const { data: doc } = await supabase
      .from('documents')
      .select('id, status')
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .single()

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (doc.status !== 'draft') {
      return NextResponse.json(
        { error: 'Fields cannot be modified on a document that has already been sent.' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { fields } = body as {
      fields: Array<{
        id?: string
        type: 'signature' | 'initials' | 'date' | 'name' | 'text'
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
      }>
    }

    if (!Array.isArray(fields)) {
      return NextResponse.json({ error: 'Invalid fields payload' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Delete existing fields for this document
    await admin.from('fields').delete().eq('document_id', documentId)

    // 2. Insert updated fields with normalized coordinates
    if (fields.length > 0) {
      const rowsToInsert = fields.map((f) => encodeFieldForDb(f, documentId))

      const { data: inserted, error: insertError } = await admin
        .from('fields')
        .insert(rowsToInsert)
        .select()

      if (insertError) {
        console.error('Failed to save fields:', insertError)
        return NextResponse.json({ error: 'Failed to save fields' }, { status: 500 })
      }

      return NextResponse.json({ fields: (inserted || []).map(decodeFieldFromDb) })
    }

    return NextResponse.json({ fields: [] })
  } catch (err: any) {
    console.error('Error saving fields:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
