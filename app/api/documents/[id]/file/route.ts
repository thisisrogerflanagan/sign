import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select(
        'id, owner_id, storage_path_original, title, created_at, updated_at, status, page_count'
      )
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .single()

    if (docError || !document || !document.storage_path_original) {
      return NextResponse.json(
        { error: 'Document not found or inaccessible' },
        { status: 404 }
      )
    }

    // Fetch author profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', user.id)
      .single()

    // Fetch document signers
    const { data: signers } = await supabase
      .from('signers')
      .select('id, name, email')
      .eq('document_id', documentId)

    // Mint short-lived signed URL (60s for viewing)
    const admin = createAdminClient()
    const { data: signedData, error: signError } = await admin.storage
      .from('originals')
      .createSignedUrl(document.storage_path_original, 60)

    if (signError || !signedData) {
      console.error('Failed to create signed URL:', signError)
      return NextResponse.json(
        { error: 'Could not access document file' },
        { status: 500 }
      )
    }

    const authorName =
      profile?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Roger Flanagan'

    return NextResponse.json({
      url: signedData.signedUrl,
      title: document.title,
      createdAt: document.created_at,
      updatedAt: document.updated_at || document.created_at,
      status: document.status || 'draft',
      pageCount: document.page_count,
      author: authorName,
      signers: signers || [],
    })
  } catch (err: any) {
    console.error('Error in document file route:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
