import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
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

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with cross-site request forgery attacks.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  // Handle root / redirect based on server-verified user authentication
  if (url.pathname === '/') {
    if (user) {
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    // If unauthenticated, allow the request to proceed to the landing page at '/'
  }

  // Define public routes that do not require authentication
  const isPublicRoute = 
    url.pathname === '/' ||
    url.pathname === '/login' || 
    url.pathname === '/signup' ||
    url.pathname === '/terms' ||
    url.pathname === '/privacy' ||
    url.pathname === '/dashboard' ||
    url.pathname === '/new' ||
    /^\/applications\/[a-zA-Z0-9-_]+$/.test(url.pathname) ||
    url.pathname.startsWith('/auth/callback') ||
    url.pathname.startsWith('/api/cron');

  if (!user && !isPublicRoute) {
    // If the user is unauthenticated and tries to access an API route, return 401
    if (url.pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized. Please authenticate.' }, { status: 401 })
    }
    // Otherwise, redirect them to the login page
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)',
  ],
}
