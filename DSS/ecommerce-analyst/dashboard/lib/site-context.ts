import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { getDefaultSiteId, getSiteById, resolveSiteId, type AccountSite } from '@/lib/sites';

export async function getSessionSiteId(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return getDefaultSiteId();
  const session = await verifySessionToken(token);
  return resolveSiteId(session?.siteId);
}

export async function getActiveSite(): Promise<AccountSite> {
  const siteId = await getSessionSiteId();
  return getSiteById(siteId) ?? getSiteById(getDefaultSiteId())!;
}
