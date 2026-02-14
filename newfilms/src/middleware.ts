import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Pages that don't require authentication
const publicPaths = [
    '/auth/login',
    '/auth/register',
    '/pending',
    '/rejected',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
];

// API paths that don't need protection
const publicApiPaths = [
    '/api/auth/',
];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths
    if (publicPaths.some(path => pathname === path || pathname.startsWith(path))) {
        return NextResponse.next();
    }

    // Allow static files and Next.js internals
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Get token from cookies
    const token = request.cookies.get('token')?.value;

    // No token - redirect to login
    if (!token) {
        const loginUrl = new URL('/auth/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    try {
        // Verify token
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');
        const { payload } = await jwtVerify(token, secret);

        // Check if user is admin - admins always have access
        if (payload.role === 'admin') {
            return NextResponse.next();
        }

        // For non-admin users, we need to check their status
        // This requires a database call, which we'll do in the API routes
        // For now, allow access and let API routes handle status checking

        return NextResponse.next();
    } catch (error) {
        // Invalid token - redirect to login
        const response = NextResponse.redirect(new URL('/auth/login', request.url));
        response.cookies.delete('token');
        return response;
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (public folder)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth).*)',
    ],
};
