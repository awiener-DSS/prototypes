import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isAuthEnabled, SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { getActiveSite } from '@/lib/site-context';
import { getDefaultSiteId, getSiteById } from '@/lib/sites';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const site = session ? await getActiveSite() : getSiteById(getDefaultSiteId());

  return NextResponse.json({
    authenticated: Boolean(session),
    auth_enabled: isAuthEnabled(),
    email: session?.email ?? null,
    siteId: site?.id ?? getDefaultSiteId(),
    siteName: site?.name ?? 'Commerce Signals',
  });
}
