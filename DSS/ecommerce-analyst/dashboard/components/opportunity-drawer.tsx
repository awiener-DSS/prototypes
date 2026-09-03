'use client';

import { opportunityShowsOutOfStock, type Opportunity } from '@/lib/opportunities';
import { decodeDisplayText } from '@/lib/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { OpportunityDetailPanel, type OpportunityDetailPanelProps } from '@/components/opportunity-detail-panel';
import { RevenueImpactExplainer } from '@/components/revenue-impact-explainer';
import type { WeekOpportunity } from '@/lib/week';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';

type OpportunityDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunities: Opportunity[];
  selectedId: string | null;
  onSelectOpportunity: (id: string) => void;
  panelProps: Omit<OpportunityDetailPanelProps, 'selected'> & { selected: Opportunity | undefined };
};

export function OpportunityDrawer({
  open,
  onOpenChange,
  opportunities,
  selectedId,
  onSelectOpportunity,
  panelProps,
}: OpportunityDrawerProps) {
  const currentIndex = opportunities.findIndex((item) => item.id === selectedId);
  const selected = panelProps.selected ?? opportunities[currentIndex];
  const { selectedStatus, confidencePct, dayCount } = panelProps;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < opportunities.length - 1;

  function step(direction: -1 | 1) {
    const nextIndex = currentIndex + direction;
    const next = opportunities[nextIndex];
    if (!next) return;
    onSelectOpportunity(next.id);
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const idx = opportunities.findIndex((item) => item.id === selectedId);
      if (event.key === 'ArrowLeft' && idx > 0) {
        event.preventDefault();
        onSelectOpportunity(opportunities[idx - 1].id);
      }
      if (event.key === 'ArrowRight' && idx >= 0 && idx < opportunities.length - 1) {
        event.preventDefault();
        onSelectOpportunity(opportunities[idx + 1].id);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, selectedId, opportunities, onSelectOpportunity]);

  if (!selected) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="gap-0 p-0 data-[side=right]:w-[min(100vw,32rem)] data-[side=right]:sm:w-[min(36rem,max(30rem,42vw))] data-[side=right]:sm:max-w-[36rem]"
      >
        <SheetHeader className="gap-3 border-b border-border/70 bg-background p-4 pr-12 text-left">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={!hasPrev}
                onClick={() => step(-1)}
                aria-label="Previous opportunity"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={!hasNext}
                onClick={() => step(1)}
                aria-label="Next opportunity"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              {currentIndex + 1} of {opportunities.length}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{selectedStatus}</Badge>
            {opportunityShowsOutOfStock(selected) ? (
              <Badge variant="outline" className="border-amber-300/80 bg-amber-50 text-amber-900">Out of stock</Badge>
            ) : null}
            <span className="text-xs text-muted-foreground">{confidencePct}% confidence</span>
            <Badge className="bg-[#49d3a4]/15 text-[#2d6b52]">{selected.impact} impact</Badge>
            <RevenueImpactExplainer
              opportunity={{
                category: selected.category,
                estimated_monthly_revenue_usd: selected.estimated_monthly_revenue_usd,
                metrics: selected.metrics,
                day_count: dayCount ?? (selected as WeekOpportunity).day_count,
              }}
              valueClassName="ml-auto text-sm tabular-nums text-[#2d6b52]"
            />
          </div>

          <SheetTitle className="font-heading text-lg leading-snug">
            {decodeDisplayText(selected.title)}
          </SheetTitle>
          <SheetDescription className="text-left">
            {decodeDisplayText(selected.problem)}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          <OpportunityDetailPanel {...panelProps} selected={selected} showHeader={false} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
