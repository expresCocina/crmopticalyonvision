import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname

    // Public routes that don't require authentication
    const isPublicRoute = path === '/login' || path === '/auth/callback'

    // Protected routes
    const isProtectedRoute =
        path.startsWith('/dashboard') ||
        path.startsWith('/pipeline') ||
        path.startsWith('/chat') ||
        path.startsWith('/appointments') ||
        path.startsWith('/clinical') ||
        path.startsWith('/purchases') ||
        path.startsWith('/marketing') ||
        path.startsWith('/settings')

    // If no user and trying to access protected route, redirect to login
    if (!user && isProtectedRoute) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // If user exists and trying to access login, redirect to dashboard
    if (user && path === '/login') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Role-based authorization for specific routes
    if (user && isProtectedRoute) {
        // Fetch user profile to check role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const userRole = profile?.role || 'lectura'

        // Settings: Only admin
        if (path.startsWith('/settings') && userRole !== 'admin') {
            const redirectUrl = new URL('/dashboard', request.url)
            redirectUrl.searchParams.set('error', 'unauthorized')
            return NextResponse.redirect(redirectUrl)
        }

        // Marketing: Only admin and atencion
        if (path.startsWith('/marketing') && !['admin', 'atencion'].includes(userRole)) {
            const redirectUrl = new URL('/dashboard', request.url)
            redirectUrl.searchParams.set('error', 'unauthorized')
            return NextResponse.redirect(redirectUrl)
        }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
