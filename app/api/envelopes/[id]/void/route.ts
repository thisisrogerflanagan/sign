import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeAuditEvent } from '@/lib/audit'
import { captureServerEvent } from '@/lib/analytics'

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
        { error: 'Only pending requests can be voided.' },
        { status: 400 }
      )
    }

    const nowIso = new Date().toISOString()
    await admin
      .from('documents')
      .update({
        status: 'voided',
        voided_at: nowIso,
      })
      .eq('id', documentId)

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || null
    const userAgent = req.headers.get('user-agent') || null

    await writeAuditEvent({
      documentId,
      actorType: 'sender',
      actorEmail: user.email,
      eventType: 'document_voided',
      ipAddress: ip,
      userAgent,
    })

    await captureServerEvent(user.id, {
      name: 'document_voided',
      properties: { document_id: documentId },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
