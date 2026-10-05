import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: sourceDoc } = await admin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .single()

    if (!sourceDoc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    // 1. Create duplicate draft document
    const { data: newDoc, error: createError } = await admin
      .from('documents')
      .insert({
        owner_id: user.id,
        title: `${sourceDoc.title} (Copy)`,
        status: 'draft',
        page_count: sourceDoc.page_count,
        storage_path_original: sourceDoc.storage_path_original,
        is_test: false,
      })
      .select('id')
      .single()

    if (createError || !newDoc) {
      return NextResponse.json({ error: 'Failed to duplicate document' }, { status: 500 })
    }

    // 2. Copy fields without filled values
    const { data: fields } = await admin
      .from('fields')
      .select('*')
      .eq('document_id', documentId)

    if (fields && fields.length > 0) {
      const duplicatedFields = fields.map((f) => ({
        document_id: newDoc.id,
        type: f.type,
        page: f.page,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        required: f.required,
      }))

      await admin.from('fields').insert(duplicatedFields)
    }

    return NextResponse.json({ success: true, newDocumentId: newDoc.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
