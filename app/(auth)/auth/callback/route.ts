import { NextResponse } from 'next/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = (searchParams.get('type') as EmailOtpType) || 'magiclink'
  const next = searchParams.get('next') ?? '/'

  if (code || token_hash) {
    const supabase = await createClient()
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: token_hash!, type })

    if (!error) {
      // Forward to next parameter or home
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalHost =
        !forwardedHost ||
        forwardedHost.startsWith('localhost') ||
        forwardedHost.startsWith('127.0.0.1')
      const isLocalEnv = process.env.NODE_ENV === 'development' || isLocalHost

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // If there's an error or no code, redirect to error page
  return NextResponse.redirect(`${origin}/auth/error`)
}
