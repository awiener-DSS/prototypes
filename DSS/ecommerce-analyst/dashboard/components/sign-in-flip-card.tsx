'use client';

import { ArrowUpRight, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SignInForm, type SignInAccount } from '@/components/sign-in-form';
import { Button } from '@/components/ui/button';

type SignInFlipCardProps = {
  accounts: SignInAccount[];
  defaultSiteId: string;
  defaultEmail?: string;
  redirectFrom?: string;
};

export function SignInFlipCard({
  accounts,
  defaultSiteId,
  defaultEmail,
  redirectFrom,
}: SignInFlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!flipped) return;

    function handlePointerDown(event: PointerEvent) {
      if (cardRef.current?.contains(event.target as Node)) return;
      setFlipped(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [flipped]);

  return (
    <div ref={cardRef} className="sign-in-flip-scene mx-auto w-full max-w-md px-4">
      <div className="sign-in-flip-card" aria-live="polite">
        <button
          type="button"
          className={`sign-in-flip-face sign-in-flip-front group ${flipped ? 'is-leaving' : ''}`}
          onClick={() => setFlipped(true)}
          aria-label="Show sign in form"
          aria-expanded={flipped}
          aria-hidden={flipped}
          tabIndex={flipped ? -1 : 0}
        >
          <div className="sign-in-logo-glow pointer-events-none absolute inset-0 rounded-[32px] opacity-80" aria-hidden />

          <div className="relative flex flex-col items-center text-center">
            <div className="sign-in-logo-mark mb-8 grid size-32 place-items-center rounded-[28px] bg-primary text-primary-foreground shadow-[0_24px_80px_rgba(0,0,0,.35)] transition-transform duration-300 group-hover:scale-[1.02] sm:size-36">
              <ArrowUpRight className="size-16 sm:size-20" strokeWidth={2.25} />
            </div>

            <p className="font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Commerce Signals
            </p>
          </div>
        </button>

        <div
          className={`sign-in-flip-face sign-in-flip-back sign-in-card rounded-[28px] border border-white/12 bg-white/[0.97] p-8 text-foreground shadow-[0_30px_90px_rgba(0,0,0,.35)] sm:p-10 ${flipped ? 'is-active' : ''}`}
          aria-hidden={!flipped}
        >
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Welcome back</p>
              <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Sign in</h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setFlipped(false)}
              aria-label="Back to logo"
              tabIndex={flipped ? 0 : -1}
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>

          <SignInForm
            accounts={accounts}
            defaultSiteId={defaultSiteId}
            defaultEmail={defaultEmail}
            redirectFrom={redirectFrom}
          />
        </div>
      </div>
    </div>
  );
}
