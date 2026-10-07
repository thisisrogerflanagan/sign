import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: reminders, error } = await admin
      .from('reminders')
      .select(
        `
        id,
        user_id,
        document_id,
        remind_at,
        note,
        status,
        created_at,
        documents (
          id,
          title,
          status
        )
      `
      )
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('remind_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reminders: reminders || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { documentId, remindAt, note } = body

    if (!documentId || !remindAt) {
      return NextResponse.json(
        { error: 'documentId and remindAt are required' },
        { status: 400 }
      )
    }

    const remindDate = new Date(remindAt)
    if (isNaN(remindDate.getTime())) {
      return NextResponse.json({ error: 'Invalid remindAt date' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Document must exist, belong to user, and be awaiting signature (sent or viewed)
    const { data: doc, error: docError } = await admin
      .from('documents')
      .select('id, owner_id, status, title')
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (doc.status !== 'sent' && doc.status !== 'viewed') {
      return NextResponse.json(
        { error: 'Reminders can only be scheduled for documents awaiting signature.' },
        { status: 400 }
      )
    }

    const { data: reminder, error: insertError } = await admin
      .from('reminders')
      .insert({
        user_id: user.id,
        document_id: documentId,
        remind_at: remindDate.toISOString(),
        note: note ? String(note).trim() : null,
        status: 'pending',
      })
      .select(
        `
        id,
        user_id,
        document_id,
        remind_at,
        note,
        status,
        created_at,
        documents (
          id,
          title,
          status
        )
      `
      )
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ reminder }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const reminderId = body.id || body.reminderId

    if (!reminderId) {
      return NextResponse.json({ error: 'Missing reminder id' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: reminder, error } = await admin
      .from('reminders')
      .update({ status: 'cancelled' })
      .eq('id', reminderId)
      .eq('user_id', user.id)
      .select()
      .maybeSingle()

    if (error || !reminder) {
      return NextResponse.json(
        { error: 'Reminder not found or could not be cancelled' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, reminder })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
