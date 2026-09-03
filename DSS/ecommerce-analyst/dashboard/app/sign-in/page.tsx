import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignInFlipCard } from '@/components/sign-in-flip-card';
import { isAuthEnabled, SESSION_COOKIE, signInFormDefaults, verifySessionToken } from '@/lib/auth';
import { getDefaultSiteId, listSignInAccounts } from '@/lib/sites';

export const metadata: Metadata = {
  title: 'Sign in — Commerce Signals',
  description: 'Sign in to Commerce Signals.',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const defaults = signInFormDefaults();
  const accounts = listSignInAccounts();
  const defaultSiteId = getDefaultSiteId();
  const { from } = await searchParams;
  if (isAuthEnabled()) {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (token && await verifySessionToken(token)) redirect('/');
  }

  return (
    <main className="sign-in-shell flex min-h-screen items-center justify-center bg-[#07111f] py-10 text-white">
      <div className="sign-in-aurora pointer-events-none absolute inset-0" aria-hidden />
      <div className="sign-in-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />

      <div className="relative z-10 w-full">
        <SignInFlipCard
          accounts={accounts}
          defaultSiteId={defaultSiteId}
          defaultEmail={defaults?.email}
          redirectFrom={from}
        />
      </div>
    </main>
  );
}
