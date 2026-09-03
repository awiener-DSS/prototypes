'use client';

import {
  Activity,
  ArrowDownRight,
  Boxes,
  CircleDollarSign,
  Eye,
  Gauge,
  LayoutTemplate,
  Megaphone,
  Search,
  Tags,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { BriefingInspectFooter, BriefingListItem, BriefingMetaBadge } from '@/components/briefing-list-item';
import { RevenueImpactExplainer } from '@/components/revenue-impact-explainer';
import type { Opportunity } from '@/lib/opportunities';
import { opportunityDisplayLabel, opportunityShowsOutOfStock } from '@/lib/opportunities';
import {
  buildHiddenSignals,
  computePeriodDeltas,
  formatDelta,
  formatMetricValue,
  hiddenOpensOpportunity,
  resolveHiddenOpportunity,
  rankedSearchDemand,
  resolveSearchDemandOpportunity,
  searchDemandOpensOpportunity,
  totalMonthlyRevenueAtRisk,
  type HiddenSignal,
  type HistoryDay,
  type InventoryRow,
  type ProductRow,
} from '@/lib/home-briefing';
import { searchMatchRate } from '@/lib/search-attention';
import { decodeDisplayText } from '@/lib/text';

type NavTarget = 'Opportunities' | 'Search' | 'Products' | 'Recommendations AI' | 'Funnel' | 'Monitor';

type HomeBriefingProps = {
  periodLabel: string;
  findings: Opportunity[];
  inspectableFindings: Opportunity[];
  searches: Array<{ search_term: string; searches: number; result_views: number; no_result_events: number; users: number }>;
  inventory: InventoryRow[];
  products: ProductRow[];
  history: HistoryDay[];
  baselineReady: boolean;
  onSelectOpportunity: (id: string) => void;
  onNavigate: (view: NavTarget) => void;
  onHiddenSignal: (signal: HiddenSignal) => void;
};

const trendConfig = {
  revenue_usd: { label: 'Revenue', color: 'var(--chart-1)' },
  purchases: { label: 'Purchases', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const categoryIcon = {
  Inventory: Boxes,
  Search: Search,
  Funnel: ArrowDownRight,
  Anomaly: Activity,
  Landing: LayoutTemplate,
  Taxonomy: Tags,
  Acquisition: Megaphone,
} as const;

const categoryTone = {
  Inventory: 'inventory',
  Search: 'search',
  Funnel: 'funnel',
  Anomaly: 'anomaly',
  Landing: 'friction',
  Taxonomy: 'hidden',
  Acquisition: 'search',
} as const;

const pillars = [
  { id: 'briefing-revenue', n: '1', title: 'Losing money', icon: CircleDollarSign, hint: 'Ranked revenue leaks', accent: 'var(--pillar-revenue)', tone: 'revenue' as const },
  { id: 'briefing-search', n: '2', title: 'Trying to find', icon: Search, hint: 'Search demand signals', accent: 'var(--pillar-search)', tone: 'search' as const },
  { id: 'briefing-friction', n: '3', title: 'Friction', icon: Gauge, hint: 'Where journeys stall', accent: 'var(--pillar-friction)', tone: 'friction' as const },
  { id: 'briefing-hidden', n: '4', title: 'Hidden behavior', icon: Eye, hint: 'Non-obvious patterns', accent: 'var(--pillar-hidden)', tone: 'hidden' as const },
  { id: 'briefing-changes', n: '5', title: 'What changed', icon: Activity, hint: 'Period-over-period shifts', accent: 'var(--pillar-changes)', tone: 'changes' as const },
] as const;

function formatMoney(value: number | null) {
  if (value == null) return 'Impact TBD';
  return `Est. ${value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}/mo`;
}

const OVERVIEW_SECTION_LIMIT = 5;

export function HomeBriefing({
  periodLabel,
  findings,
  inspectableFindings,
  searches,
  inventory,
  products,
  history,
  baselineReady,
  onSelectOpportunity,
  onNavigate,
  onHiddenSignal,
}: HomeBriefingProps) {
  const revenueAtRisk = totalMonthlyRevenueAtRisk(findings);
  const topOpportunities = findings.slice(0, OVERVIEW_SECTION_LIMIT);
  const demandTerms = rankedSearchDemand(searches, OVERVIEW_SECTION_LIMIT);
  const frictionOpportunities = inspectableFindings
    .filter((finding) => (
      finding.category === 'Search'
      || finding.category === 'Inventory'
      || finding.category === 'Anomaly'
      || finding.category === 'Funnel'
      || finding.category === 'Landing'
      || finding.category === 'Acquisition'
      || finding.category === 'Taxonomy'
    ))
    .slice(0, OVERVIEW_SECTION_LIMIT);
  const hiddenSignals = buildHiddenSignals(products, inventory, searches, OVERVIEW_SECTION_LIMIT);
  const periodDeltas = computePeriodDeltas(history);
  const significantChanges = periodDeltas.filter((delta) => delta.significant);
  const chartData = history.map((day) => ({
    ...day,
    label: `${day.report_date.slice(4, 6)}/${day.report_date.slice(6, 8)}`,
  }));

  function scrollToPillar(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="mb-8 space-y-5">
      <nav aria-label="Briefing sections" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {pillars.map((pillar) => (
          <button
            key={pillar.n}
            type="button"
            onClick={() => scrollToPillar(pillar.id)}
            className="rounded-xl border border-border/70 bg-card px-3 py-3 text-left transition hover:border-primary/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <div className="mb-1.5 flex items-center gap-2">
              <span
                className="grid size-6 place-items-center rounded-md text-[11px] font-bold text-white"
                style={{ backgroundColor: pillar.accent }}
              >
                {pillar.n}
              </span>
              <pillar.icon className="size-3.5" style={{ color: pillar.accent }} aria-hidden />
            </div>
            <p className="font-heading text-base font-semibold">{pillar.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{pillar.hint}</p>
          </button>
        ))}
      </nav>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card id="briefing-revenue" className="scroll-mt-24 overflow-hidden border-border/80">
          <div className="section-accent" style={{ backgroundColor: 'var(--pillar-revenue)' }} />
          <CardHeader className="gap-2 border-b border-border/60 bg-[color-mix(in_oklch,var(--pillar-revenue)_6%,transparent)] pb-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[.12em]" style={{ color: 'var(--pillar-revenue)' }}>1 · Revenue at risk</p>
              <CardTitle className="text-lg">Where are we losing money?</CardTitle>
              <CardDescription>
                {revenueAtRisk
                  ? `${formatMoney(revenueAtRisk)} across ${findings.length} ranked opportunit${findings.length === 1 ? 'y' : 'ies'}`
                  : 'Ranked opportunities with estimated monthly impact'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-4">
            {topOpportunities.length ? topOpportunities.map((finding, index) => {
              const Icon = categoryIcon[finding.category];
              return (
                <BriefingListItem
                  key={finding.id}
                  icon={Icon}
                  iconTone={categoryTone[finding.category]}
                  title={decodeDisplayText(finding.title)}
                  detail={decodeDisplayText(finding.problem)}
                  onClick={() => onSelectOpportunity(finding.id)}
                  badges={(
                    <>
                      <BriefingMetaBadge>#{index + 1}</BriefingMetaBadge>
                      <BriefingMetaBadge>{opportunityDisplayLabel(finding)}</BriefingMetaBadge>
                      <BriefingMetaBadge>{finding.impact} impact</BriefingMetaBadge>
                    </>
                  )}
                  footer={(
                    <BriefingInspectFooter
                      leading={(
                        <RevenueImpactExplainer
                          opportunity={{
                            category: finding.category,
                            estimated_monthly_revenue_usd: finding.estimated_monthly_revenue_usd,
                            metrics: finding.metrics,
                          }}
                          stopPropagation
                        />
                      )}
                    />
                  )}
                />
              );
            }) : (
              <p className="text-sm text-muted-foreground">No ranked opportunities in this period yet.</p>
            )}
          </CardContent>
        </Card>

        <Card id="briefing-search" className="scroll-mt-24 overflow-hidden border-border/80">
          <div className="section-accent" style={{ backgroundColor: 'var(--pillar-search)' }} />
          <CardHeader className="gap-2 border-b border-border/60 bg-[color-mix(in_oklch,var(--pillar-search)_6%,transparent)] pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[.12em]" style={{ color: 'var(--pillar-search)' }}>2 · Search demand</p>
              <CardTitle className="text-lg">What are customers trying to find?</CardTitle>
              <CardDescription>{periodLabel} · queries ranked by attention, then volume</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => onNavigate('Search')}>
              Open Search
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-4">
            {demandTerms.length ? demandTerms.map((term) => {
              const opportunity = resolveSearchDemandOpportunity(term.search_term, inspectableFindings);
              const canInspect = searchDemandOpensOpportunity(term.search_term, inspectableFindings);
              return (
                <BriefingListItem
                  key={term.search_term}
                  icon={Search}
                  iconTone="search"
                  title={opportunity ? decodeDisplayText(opportunity.title) : `“${decodeDisplayText(term.search_term)}”`}
                  detail={opportunity
                    ? decodeDisplayText(opportunity.problem)
                    : `${term.users} users · ${term.searches} searches · ${searchMatchRate(term)}% match`}
                  onClick={() => {
                    if (opportunity) onSelectOpportunity(opportunity.id);
                    else onNavigate('Search');
                  }}
                  badges={(
                    <>
                      <BriefingMetaBadge>{term.attention.label}</BriefingMetaBadge>
                      {opportunity ? <BriefingMetaBadge>{opportunityDisplayLabel(opportunity)}</BriefingMetaBadge> : null}
                      {opportunity ? <BriefingMetaBadge>{opportunity.impact} impact</BriefingMetaBadge> : null}
                    </>
                  )}
                  footer={(
                    <BriefingInspectFooter
                      canInspect={canInspect}
                      leading={opportunity ? (
                        <RevenueImpactExplainer
                          opportunity={{
                            category: opportunity.category,
                            estimated_monthly_revenue_usd: opportunity.estimated_monthly_revenue_usd,
                            metrics: opportunity.metrics,
                          }}
                          stopPropagation
                        />
                      ) : undefined}
                    />
                  )}
                />
              );
            }) : (
              <p className="text-sm text-muted-foreground">Search terms will appear once live data loads.</p>
            )}
          </CardContent>
        </Card>

        <Card id="briefing-friction" className="scroll-mt-24 overflow-hidden border-border/80">
          <div className="section-accent" style={{ backgroundColor: 'var(--pillar-friction)' }} />
          <CardHeader className="gap-2 border-b border-border/60 bg-[color-mix(in_oklch,var(--pillar-friction)_6%,transparent)] pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[.12em]" style={{ color: 'var(--pillar-friction)' }}>3 · Friction map</p>
              <CardTitle className="text-lg">What&apos;s causing friction?</CardTitle>
              <CardDescription>Search, availability, funnel, and anomaly signals in one place</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => onNavigate('Funnel')}>
              Open Funnel
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-4">
            {frictionOpportunities.length ? frictionOpportunities.map((finding) => {
              const Icon = categoryIcon[finding.category];
              return (
                <BriefingListItem
                  key={finding.id}
                  icon={Icon}
                  iconTone={categoryTone[finding.category]}
                  title={decodeDisplayText(finding.title)}
                  detail={decodeDisplayText(finding.problem)}
                  onClick={() => onSelectOpportunity(finding.id)}
                  badges={(
                    <>
                      <BriefingMetaBadge>{opportunityDisplayLabel(finding)}</BriefingMetaBadge>
                      <BriefingMetaBadge>{finding.impact} impact</BriefingMetaBadge>
                      {opportunityShowsOutOfStock(finding) ? (
                        <BriefingMetaBadge className="border-amber-300/80 bg-amber-50 text-amber-900">Out of stock</BriefingMetaBadge>
                      ) : null}
                    </>
                  )}
                  footer={(
                    <BriefingInspectFooter
                      leading={(
                        <RevenueImpactExplainer
                          opportunity={{
                            category: finding.category,
                            estimated_monthly_revenue_usd: finding.estimated_monthly_revenue_usd,
                            metrics: finding.metrics,
                          }}
                          stopPropagation
                        />
                      )}
                    />
                  )}
                />
              );
            }) : (
              <p className="text-sm text-muted-foreground">No major friction signals detected for this period.</p>
            )}
          </CardContent>
        </Card>

        <Card id="briefing-hidden" className="scroll-mt-24 overflow-hidden border-border/80">
          <div className="section-accent" style={{ backgroundColor: 'var(--pillar-hidden)' }} />
          <CardHeader className="gap-2 border-b border-border/60 bg-[color-mix(in_oklch,var(--pillar-hidden)_6%,transparent)] pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[.12em]" style={{ color: 'var(--pillar-hidden)' }}>4 · Hidden behavior</p>
              <CardTitle className="text-lg">What opportunities are buried in behavior?</CardTitle>
              <CardDescription>Patterns detectors don&apos;t always rank first</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => onNavigate('Products')}>
              Open Products
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-4">
            {hiddenSignals.length ? hiddenSignals.map((signal) => {
              const opportunity = resolveHiddenOpportunity(signal, inspectableFindings);
              const canInspect = hiddenOpensOpportunity(signal, inspectableFindings);
              const Icon = signal.kind === 'search' ? Search : signal.kind === 'inventory' ? Boxes : Eye;
              const tone = signal.kind === 'search' ? 'search' as const : signal.kind === 'inventory' ? 'inventory' as const : 'product' as const;
              return (
                <BriefingListItem
                  key={signal.id}
                  icon={Icon}
                  iconTone={tone}
                  title={opportunity ? decodeDisplayText(opportunity.title) : signal.title}
                  detail={opportunity ? decodeDisplayText(opportunity.problem) : signal.detail}
                  onClick={() => onHiddenSignal(signal)}
                  badges={(
                    <>
                      <BriefingMetaBadge>
                        {opportunity
                          ? opportunityDisplayLabel(opportunity)
                          : signal.kind === 'product'
                            ? 'Product'
                            : signal.kind === 'inventory'
                              ? 'Inventory'
                              : 'Search'}
                      </BriefingMetaBadge>
                      {opportunity && opportunityShowsOutOfStock(opportunity) ? (
                        <BriefingMetaBadge className="border-amber-300/80 bg-amber-50 text-amber-900">Out of stock</BriefingMetaBadge>
                      ) : null}
                    </>
                  )}
                  footer={(
                    <BriefingInspectFooter
                      canInspect={canInspect}
                      leading={opportunity ? (
                        <RevenueImpactExplainer
                          opportunity={{
                            category: opportunity.category,
                            estimated_monthly_revenue_usd: opportunity.estimated_monthly_revenue_usd,
                            metrics: opportunity.metrics,
                          }}
                          stopPropagation
                        />
                      ) : undefined}
                    />
                  )}
                />
              );
            }) : (
              <p className="text-sm text-muted-foreground">No secondary behavioral edges surfaced yet — widen the date range or check back after more exports.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card id="briefing-changes" className="scroll-mt-24 overflow-hidden border-border/80">
        <div className="section-accent" style={{ backgroundColor: 'var(--pillar-changes)' }} />
        <CardHeader className="gap-3 border-b border-border/60 bg-[color-mix(in_oklch,var(--pillar-changes)_6%,transparent)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[.12em]" style={{ color: 'var(--pillar-changes)' }}>5 · Change log</p>
            <CardTitle className="text-lg">What changed?</CardTitle>
            <CardDescription>
              {periodLabel}
              {baselineReady ? ' · comparing second half vs first half of selected range' : ' · need more export days for period comparison'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {history.length >= 2 ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <ChartContainer config={trendConfig} className="aspect-auto h-[200px] w-full">
                <LineChart data={chartData} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="revenue" tickLine={false} axisLine={false} width={55} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                  <YAxis yAxisId="purchases" orientation="right" tickLine={false} axisLine={false} width={28} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line yAxisId="revenue" type="monotone" dataKey="revenue_usd" stroke="var(--color-revenue_usd)" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line yAxisId="purchases" type="monotone" dataKey="purchases" stroke="var(--color-purchases)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ChartContainer>
              <div className="space-y-2.5">
                {periodDeltas.length ? periodDeltas.map((delta) => {
                  const positive = (delta.deltaPct ?? 0) >= 0;
                  const TrendIcon = positive ? TrendingUp : TrendingDown;
                  return (
                    <BriefingListItem
                      key={delta.label}
                      icon={TrendIcon}
                      iconTone="changes"
                      title={delta.label}
                      detail={`${formatMetricValue(delta.previous, delta.format)} → ${formatMetricValue(delta.current, delta.format)}`}
                      interactive={false}
                      badges={delta.deltaPct != null ? (
                        <BriefingMetaBadge className={positive
                          ? 'border-emerald-200/80 bg-emerald-50 text-emerald-800'
                          : 'border-rose-200/80 bg-rose-50 text-rose-800'}
                        >
                          {formatDelta(delta.deltaPct, delta.format)}
                          {delta.significant ? ' · material' : ''}
                        </BriefingMetaBadge>
                      ) : undefined}
                    />
                  );
                }) : (
                  <p className="text-sm text-muted-foreground">Need at least 4 export days in range for period comparison.</p>
                )}
                {significantChanges.length ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {significantChanges.length} metric{significantChanges.length === 1 ? '' : 's'} moved materially between halves of the selected range.
                  </p>
                ) : periodDeltas.length ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">No large half-over-half shifts detected in this range.</p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Trend and change detection need at least two GA4 export days in the selected range.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
