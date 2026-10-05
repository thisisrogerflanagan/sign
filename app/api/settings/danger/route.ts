import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { confirmationText } = await req.json()
    if (confirmationText !== 'delete my account') {
      return NextResponse.json(
        { error: 'Confirmation phrase does not match.' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // 1. List and remove all Storage objects for this user in both buckets
    const { data: origFiles } = await admin.storage.from('originals').list(user.id)
    if (origFiles && origFiles.length > 0) {
      await admin.storage
        .from('originals')
        .remove(origFiles.map((f) => `${user.id}/${f.name}`))
    }

    const { data: signedFiles } = await admin.storage.from('signed').list(user.id)
    if (signedFiles && signedFiles.length > 0) {
      await admin.storage
        .from('signed')
        .remove(signedFiles.map((f) => `${user.id}/${f.name}`))
    }

    // 2. Delete user from auth (cascades to profiles, entitlements, documents, etc.)
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id)

    if (deleteUserError) {
      console.error('Failed to delete auth user:', deleteUserError)
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
