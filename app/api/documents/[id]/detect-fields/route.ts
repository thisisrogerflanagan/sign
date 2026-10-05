import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoDetectPdfFields } from '@/lib/pdf-auto-detect'

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

    const { data: doc } = await supabase
      .from('documents')
      .select('id, storage_path_original')
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .single()

    if (!doc || !doc.storage_path_original) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data: fileBlob, error: downloadError } = await admin.storage
      .from('originals')
      .download(doc.storage_path_original)

    if (downloadError || !fileBlob) {
      return NextResponse.json({ error: 'Could not load original PDF' }, { status: 500 })
    }

    const arrayBuffer = await fileBlob.arrayBuffer()
    const detected = await autoDetectPdfFields(arrayBuffer)

    return NextResponse.json({ detected })
  } catch (err: any) {
    console.error('Field detection failed:', err)
    return NextResponse.json({ detected: [], error: err.message }, { status: 200 })
  }
}
