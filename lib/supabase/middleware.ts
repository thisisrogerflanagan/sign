import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const pathname = request.nextUrl.pathname
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1'

  // 1. Rate limiting on /api/sign/* (50 requests per 60s per IP)
  if (pathname.startsWith('/api/sign/')) {
    const rateCheck = checkRateLimit({
      key: `sign_rate_${ip}`,
      limit: 50,
      windowMs: 60 * 1000,
    })

    if (!rateCheck.success) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please wait a moment and try again.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  // 2. Skip supabase auth check if env vars aren't populated yet during initial setup
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Gated (app) routes
  const isAppRoute =
    pathname === '/' ||
    pathname.startsWith('/documents') ||
    pathname.startsWith('/send') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/claim') ||
    pathname.startsWith('/welcome')

  const isAuthRoute = pathname.startsWith('/login')

  // Unauthenticated users hitting app routes redirect to /login with next param
  if (!user && isAppRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname + (request.nextUrl.search || ''))
    return NextResponse.redirect(url)
  }

  // Authenticated users visiting /login redirect to '/' or 'next'
  if (user && isAuthRoute) {
    const nextParam = request.nextUrl.searchParams.get('next') || '/'
    const url = request.nextUrl.clone()
    url.pathname = nextParam
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
