'use client';

import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type BriefingIconTone =
  | 'default'
  | 'revenue'
  | 'search'
  | 'friction'
  | 'hidden'
  | 'changes'
  | 'inventory'
  | 'funnel'
  | 'anomaly'
  | 'product';

const iconToneClass: Record<BriefingIconTone, string> = {
  default: 'bg-primary/12 text-primary',
  revenue: 'bg-[color-mix(in_oklch,var(--pillar-revenue)_16%,white)] text-[var(--pillar-revenue)]',
  search: 'bg-[color-mix(in_oklch,var(--pillar-search)_16%,white)] text-[var(--pillar-search)]',
  friction: 'bg-[color-mix(in_oklch,var(--pillar-friction)_16%,white)] text-[var(--pillar-friction)]',
  hidden: 'bg-[color-mix(in_oklch,var(--pillar-hidden)_16%,white)] text-[var(--pillar-hidden)]',
  changes: 'bg-[color-mix(in_oklch,var(--pillar-changes)_16%,white)] text-[var(--pillar-changes)]',
  inventory: 'bg-[color-mix(in_oklch,var(--pillar-friction)_16%,white)] text-[var(--pillar-friction)]',
  funnel: 'bg-[color-mix(in_oklch,var(--pillar-hidden)_16%,white)] text-[var(--pillar-hidden)]',
  anomaly: 'bg-[color-mix(in_oklch,var(--pillar-revenue)_16%,white)] text-[var(--pillar-revenue)]',
  product: 'bg-primary/12 text-primary',
};

type BriefingListItemProps = {
  icon: LucideIcon;
  title: string;
  detail?: string;
  badges?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
  interactive?: boolean;
  selected?: boolean;
  className?: string;
  /** Equal-weight colored scent for the icon well — same size/structure for every tone. */
  iconTone?: BriefingIconTone;
};

/** Baymard-aligned consistent card row: equal visual weight, scannable header, subtle icon, shared CTA slot. */
export function BriefingListItem({
  icon: Icon,
  title,
  detail,
  badges,
  footer,
  onClick,
  interactive = Boolean(onClick),
  selected = false,
  className,
  iconTone = 'default',
}: BriefingListItemProps) {
  const classes = cn(
    'flex w-full gap-3 rounded-xl border border-border/70 bg-card p-4 text-left transition',
    interactive && 'hover:border-primary/25 hover:bg-primary/[.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
    selected && 'border-primary/45 bg-primary/[.05] ring-1 ring-primary/15',
    className,
  );

  const body = (
    <>
      <div className={cn('grid size-10 shrink-0 place-items-center rounded-lg', iconToneClass[iconTone])}>
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        {badges ? <div className="mb-1.5 flex flex-wrap items-center gap-1.5">{badges}</div> : null}
        <p className="font-heading text-sm font-semibold leading-snug text-foreground sm:text-base">{title}</p>
        {detail ? <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{detail}</p> : null}
        {footer}
      </div>
    </>
  );

  if (interactive && onClick) {
    return (
      <button type="button" onClick={onClick} className={cn('group', classes)}>
        {body}
      </button>
    );
  }

  return <div className={classes}>{body}</div>;
}

export function BriefingInspectFooter({
  leading,
  canInspect = true,
  label = 'Inspect',
}: {
  leading?: ReactNode;
  canInspect?: boolean;
  label?: string;
}) {
  if (!canInspect) {
    return <p className="mt-2.5 text-[11px] font-medium text-muted-foreground">No ranked match yet</p>;
  }

  return (
    <div className="mt-2.5 flex items-center justify-between gap-3">
      <div className="min-w-0">{leading}</div>
      <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
        {label}
        <ChevronRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden />
      </span>
    </div>
  );
}

export function BriefingMetaBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Badge variant="outline" className={cn('border-border/80 bg-background text-[10px] font-medium text-muted-foreground', className)}>
      {children}
    </Badge>
  );
}
