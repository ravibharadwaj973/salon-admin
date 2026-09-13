import { NextResponse, type NextRequest } from 'next/server';

const PLATFORM_COOKIE = 'sos_pat';
const PUBLIC_PREFIXES = ['/login', '/api/auth', '/_next', '/favicon'];

/**
 * The console is entirely private: no public pages, no refresh flow. When the
 * 8-hour token is gone the operator signs in again.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(PLATFORM_COOKIE)?.value;

  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
