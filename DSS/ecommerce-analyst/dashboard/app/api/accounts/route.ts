import { NextResponse } from 'next/server';
import { getDefaultSiteId, listSignInAccounts } from '@/lib/sites';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    accounts: listSignInAccounts(),
    defaultSiteId: getDefaultSiteId(),
  });
}
