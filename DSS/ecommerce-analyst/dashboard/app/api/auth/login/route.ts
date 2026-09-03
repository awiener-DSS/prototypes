import { NextResponse } from 'next/server';
import {
  createSessionToken,
  isAuthEnabled,
  SESSION_COOKIE,
  sessionCookieOptions,
  validateCredentials,
} from '@/lib/auth';
import { getDefaultSiteId, isValidSiteId } from '@/lib/sites';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: 'Sign-in is not configured on this deployment.' }, { status: 503 });
  }

  try {
    const body = await request.json() as {
      email?: string;
      password?: string;
      remember?: boolean;
      siteId?: string;
    };
    const email = body.email?.trim() ?? '';
    const password = body.password ?? '';
    const siteId = body.siteId?.trim() || getDefaultSiteId();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }
    if (!isValidSiteId(siteId)) {
      return NextResponse.json({ error: 'Choose a valid account.' }, { status: 400 });
    }
    if (!validateCredentials(email, password)) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const token = await createSessionToken(email, siteId);
    const maxAge = body.remember ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
    const response = NextResponse.json({ ok: true, email: email.toLowerCase(), siteId });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(maxAge));
    return response;
  } catch (error) {
    console.error('Login error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Sign-in failed.' }, { status: 500 });
  }
}
