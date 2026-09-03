'use client';

import { ArrowRight, Building2, LoaderCircle, Lock, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type SignInAccount = {
  id: string;
  name: string;
};

type SignInFormProps = {
  accounts: SignInAccount[];
  defaultSiteId: string;
  defaultEmail?: string;
  redirectFrom?: string;
};

export function SignInForm({
  accounts,
  defaultSiteId,
  defaultEmail = '',
  redirectFrom = '/',
}: SignInFormProps) {
  const router = useRouter();
  const [siteId, setSiteId] = useState(defaultSiteId);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, remember, siteId }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Sign-in failed');
      const from = redirectFrom || '/';
      router.replace(from.startsWith('/sign-in') ? '/' : from);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="account" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Account
        </Label>
        <div className="relative">
          <Building2 className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            id="account"
            required
            value={siteId}
            onChange={(event) => setSiteId(event.target.value)}
            className="h-11 w-full appearance-none rounded-lg border border-input bg-background/80 py-2 pr-10 pl-10 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground" aria-hidden>
            ▾
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Work email
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@dss-partners.com"
            className="h-11 bg-background/80 pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Password
        </Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            className="h-11 bg-background/80 pl-10"
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
          className="size-4 rounded border-border accent-primary"
        />
        Keep me signed in for 30 days
      </label>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={loading}
        className="h-11 w-full bg-[linear-gradient(135deg,#1f6f62_0%,#2d8f7c_45%,#49d3a4_100%)] text-base font-semibold text-white shadow-[0_12px_32px_rgba(31,111,98,.28)] hover:opacity-95"
      >
        {loading ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
        Sign in to Commerce Signals
      </Button>
    </form>
  );
}
