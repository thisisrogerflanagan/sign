import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Dev endpoint disabled in production' },
      { status: 404 }
    )
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        recentDocuments: [],
      })
    }

    const admin = createAdminClient()
    const { data: docs } = await admin
      .from('documents')
      .select('id, title, status, created_at, updated_at')
      .eq('owner_id', user.id)
      .neq('status', 'deleted')
      .order('updated_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      authenticated: true,
      recentDocuments: docs || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
