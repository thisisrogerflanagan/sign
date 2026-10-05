import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeAuditEvent } from '@/lib/audit'

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
    const { data: doc } = await admin
      .from('documents')
      .select('id, owner_id, storage_path_original, storage_path_signed')
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .single()

    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    // 1. Soft delete document
    await admin
      .from('documents')
      .update({ status: 'deleted' })
      .eq('id', documentId)

    // 2. Remove files from storage
    if (doc.storage_path_original) {
      await admin.storage.from('originals').remove([doc.storage_path_original])
    }
    if (doc.storage_path_signed) {
      await admin.storage.from('signed').remove([doc.storage_path_signed])
    }

    // 3. Write audit event
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || null
    const userAgent = req.headers.get('user-agent') || null

    await writeAuditEvent({
      documentId,
      actorType: 'sender',
      actorEmail: user.email,
      eventType: 'document_deleted',
      ipAddress: ip,
      userAgent,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
