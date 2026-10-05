import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignerToken, hashSignerToken } from '@/lib/tokens'

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
      .select('id, owner_id, status')
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .single()

    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    if (doc.status !== 'sent' && doc.status !== 'viewed') {
      return NextResponse.json(
        { error: 'Link can only be generated for active requests.' },
        { status: 400 }
      )
    }

    // Regenerate a fresh 32-byte token (invalidating previous)
    const rawToken = generateSignerToken()
    const tokenHash = hashSignerToken(rawToken)
    const tokenExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

    await admin
      .from('signers')
      .update({
        token_hash: tokenHash,
        token_expires_at: tokenExpiresAt,
      })
      .eq('document_id', documentId)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const signingUrl = `${appUrl}/sign/${rawToken}`

    return NextResponse.json({ url: signingUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
