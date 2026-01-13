import { createServerClient } from '@supabase/ssr'
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
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protected routes logic
    if (!user && (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/onboarding'))) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // If user is logged in and trying to access login, check if they have profile
    if (user && request.nextUrl.pathname.startsWith('/login')) {
        // Check if user has completed onboarding
        const { data: profile, error } = await supabase
            .from("professionals")
            .select("id, registration_number")
            .eq("user_id", user.id)
            .single()

        // If profile exists and has registration_number, redirect to dashboard
        // Otherwise, redirect to onboarding (user needs to complete it)
        if (profile && profile.registration_number) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        } else {
            // Profile doesn't exist or is incomplete - redirect to onboarding
            return NextResponse.redirect(new URL('/onboarding', request.url))
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
