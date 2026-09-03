'use client';

import { CircleHelp } from 'lucide-react';
import type { MouseEvent } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatMonthlyImpact, revenueImpactExplanation, type RevenueImpactOpportunity } from '@/lib/revenue-impact';
import { cn } from '@/lib/utils';

type RevenueImpactExplainerProps = {
  opportunity: RevenueImpactOpportunity;
  showValue?: boolean;
  valueSuffix?: string;
  valueClassName?: string;
  iconClassName?: string;
  stopPropagation?: boolean;
};

export function RevenueImpactExplainer({
  opportunity,
  showValue = true,
  valueSuffix = '/mo',
  valueClassName,
  iconClassName,
  stopPropagation = false,
}: RevenueImpactExplainerProps) {
  function handleTriggerClick(event: MouseEvent<HTMLButtonElement>) {
    if (stopPropagation) event.stopPropagation();
  }

  return (
    <TooltipProvider delay={150}>
      <Tooltip>
        <span className="inline-flex items-center gap-1.5">
          {showValue ? (
            <span className={cn('text-xs font-semibold text-foreground', valueClassName)}>
              {formatMonthlyImpact(opportunity.estimated_monthly_revenue_usd, valueSuffix)}
            </span>
          ) : null}
          <TooltipTrigger
            type="button"
            className={cn(
              'inline-flex shrink-0 rounded-full text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              iconClassName,
            )}
            aria-label="How is this revenue estimate calculated?"
            onClick={handleTriggerClick}
          >
            <CircleHelp className="size-3.5" />
          </TooltipTrigger>
        </span>
        <TooltipContent side="top" className="max-w-xs whitespace-normal px-3 py-2.5 text-left leading-relaxed">
          <p className="mb-1 font-semibold">Estimated monthly impact</p>
          <p>{revenueImpactExplanation(opportunity)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
