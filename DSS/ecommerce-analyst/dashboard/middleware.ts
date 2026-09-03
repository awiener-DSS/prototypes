import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuthEnabled, SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith('/sign-in')
    || pathname.startsWith('/api/auth')
    || pathname.startsWith('/api/accounts')
    || pathname.startsWith('/_next')
    || pathname === '/favicon.ico'
    || pathname === '/og.png'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (session) return NextResponse.next();

  const signInUrl = new URL('/sign-in', request.url);
  if (pathname !== '/') signInUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|og.png).*)'],
};
