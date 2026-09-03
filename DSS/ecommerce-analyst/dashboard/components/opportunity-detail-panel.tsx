'use client';

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Eye,
  LoaderCircle,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoLoader } from '@/components/logo-loader';
import { RevenueImpactExplainer } from '@/components/revenue-impact-explainer';
import type { ActionRecord } from '@/lib/actions';
import type { Investigation } from '@/lib/investigate';
import type { OutcomeRecord } from '@/lib/learning';
import type { Opportunity } from '@/lib/opportunities';
import { opportunityShowsOutOfStock } from '@/lib/opportunities';
import { decodeDisplayText } from '@/lib/text';
import { revenueImpactExplanation } from '@/lib/revenue-impact';
import { oosPatternLabel } from '@/lib/inventory';

type AutomationPreview = {
  ready: boolean;
  headline: string;
  summary: string;
  steps: string[];
};

function verdictLabel(verdict: OutcomeRecord['verdict']) {
  if (verdict === 'lift') return 'Lift detected';
  if (verdict === 'worse') return 'Metric worsened';
  if (verdict === 'flat') return 'No material change';
  return 'Collecting data';
}

export type OpportunityDetailPanelProps = {
  selected: Opportunity;
  selectedStatus: string;
  confidencePct: number;
  automation: AutomationPreview;
  fixBrief: Opportunity | Investigation;
  investigationLoading: boolean;
  investigationError: string;
  activeInvestigation: Investigation | null;
  selectedAction: ActionRecord | null;
  outcome: OutcomeRecord | null;
  actionBusy: boolean;
  monitoringActive: boolean;
  showHeader?: boolean;
  embedded?: boolean;
  onInvestigate: () => void;
  onUpdateStatus: (status: string) => void;
  onRefreshOutcome: (actionId: string) => void;
  onCloseMonitoring: (actionId: string) => void;
  onReopenMonitoring: (actionId: string) => void;
  onGoToMonitor: () => void;
  dayCount?: number;
};

export function OpportunityDetailPanel({
  selected,
  selectedStatus,
  confidencePct,
  automation,
  fixBrief,
  investigationLoading,
  investigationError,
  activeInvestigation,
  selectedAction,
  outcome,
  actionBusy,
  monitoringActive,
  showHeader = true,
  embedded = false,
  onInvestigate,
  onUpdateStatus,
  onRefreshOutcome,
  onCloseMonitoring,
  onReopenMonitoring,
  onGoToMonitor,
  dayCount,
}: OpportunityDetailPanelProps) {
  const actionCreated = selectedAction?.status === 'created' || selectedStatus === 'Action created';
  const actionApplied = selectedAction?.status === 'applied';
  const outOfStock = opportunityShowsOutOfStock(selected);
  const zeroStockViews = Number(selected.metrics.zero_stock_views) || 0;
  const oosPattern = selected.metrics.oos_pattern === 'backorder_allowed' || selected.metrics.oos_pattern === 'oos_messaging_only'
    ? selected.metrics.oos_pattern
    : null;
  const footer = (
    <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-400">
      <AlertTriangle className="mt-0.5 size-3 shrink-0" />
      Recommendations require client review. No commerce systems can be changed from this workspace yet.
    </p>
  );

  return (
    <Card className={`border-0 bg-[#172a43] text-white shadow-xl shadow-slate-900/10 ${embedded ? 'flex h-full max-h-full flex-col overflow-hidden rounded-xl py-0' : 'overflow-hidden'}`}>
      {showHeader ? (
        <CardHeader className={`border-b border-white/10 pb-4 ${embedded ? 'shrink-0 pt-5' : ''}`}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className="bg-white/12 text-white">{selectedStatus}</Badge>
            {outOfStock ? <Badge className="bg-amber-400/20 text-amber-50">Out of stock</Badge> : null}
            <span className="text-xs text-slate-300">{confidencePct}% confidence</span>
            <Badge className="bg-white/10 text-slate-200">{selected.impact} impact</Badge>
          </div>
          <CardTitle className="text-xl font-semibold leading-snug text-white">{decodeDisplayText(selected.title)}</CardTitle>
          <CardDescription className="text-sm text-slate-300">{decodeDisplayText(selected.problem)}</CardDescription>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
            <div>
              <p className="mb-0.5 text-[10px] font-medium uppercase tracking-[.1em] text-slate-400">Estimated monthly impact</p>
              <RevenueImpactExplainer
                opportunity={{
                  category: selected.category,
                  estimated_monthly_revenue_usd: selected.estimated_monthly_revenue_usd,
                  metrics: selected.metrics,
                  day_count: dayCount,
                }}
                valueClassName="text-sm tabular-nums text-[#70e0b9]"
                iconClassName="text-slate-400 hover:text-slate-200"
              />
            </div>
          </div>
        </CardHeader>
      ) : null}

      <CardContent className={`space-y-4 ${showHeader ? 'pt-5' : 'pt-4'} ${embedded ? 'min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-5' : ''}`}>
        {outOfStock ? (
          <section className="rounded-xl border border-amber-400/35 bg-amber-400/[0.1] p-4">
            <p className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-100">
              <AlertTriangle className="size-3.5" /> Out of stock signal
            </p>
            <p className="text-sm leading-relaxed text-amber-50/90">
              GA4 recorded {zeroStockViews.toLocaleString()} zero-stock view{zeroStockViews === 1 ? '' : 's'} for{' '}
              {String(selected.metrics.item_id ?? 'this SKU')}.
              {oosPattern ? ` ${oosPatternLabel(oosPattern)}.` : ''} Low cart conversion is likely availability-driven.
            </p>
          </section>
        ) : null}

        <details className="group rounded-lg border border-white/10 bg-black/15">
          <summary className="cursor-pointer list-none px-3 py-2.5 text-[11px] font-medium text-slate-300 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              How is this estimate calculated?
              <ChevronRight className="size-3.5 transition group-open:rotate-90" />
            </span>
          </summary>
          <p className="border-t border-white/10 px-3 py-2.5 text-[11px] leading-relaxed text-slate-400">
            {revenueImpactExplanation({
              category: selected.category,
              estimated_monthly_revenue_usd: selected.estimated_monthly_revenue_usd,
              metrics: selected.metrics,
              day_count: dayCount,
            })}
          </p>
        </details>

        <section className="rounded-xl border border-[#49d3a4]/30 bg-[#49d3a4]/[0.08] p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#70e0b9]">
                <Sparkles className="size-4" /> Analysis &amp; fix
              </p>
              <p className="text-xs text-slate-300">What happened, why, and what to change next.</p>
            </div>
            <Button size="sm" variant="outline" className="h-8 shrink-0 border-white/20 bg-transparent px-2.5 text-xs text-slate-100 hover:bg-white/10 hover:text-white" disabled={investigationLoading} onClick={onInvestigate}>
              {investigationLoading ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              {activeInvestigation ? 'Refresh' : 'Investigate'}
            </Button>
          </div>

          {investigationLoading && (
            <div className="flex justify-center py-6">
              <LogoLoader
                size="md"
                label="Building analyst recommendation…"
                description="Investigating evidence and catalog context."
                className="text-slate-200 [&_p]:text-slate-200 [&_p+p]:text-slate-400"
              />
            </div>
          )}
          {investigationError ? <p className="text-sm text-rose-200">{investigationError}</p> : null}

          {!investigationLoading && (
            <div className="space-y-4">
              {activeInvestigation?.narrative ? (
                <p className="text-[15px] leading-relaxed text-slate-100">{decodeDisplayText(activeInvestigation.narrative)}</p>
              ) : (
                <p className="text-sm leading-relaxed text-slate-300">Investigate to replace detector defaults with a Groq analyst brief grounded in live drill-downs.</p>
              )}

              <div className="rounded-lg border border-white/10 bg-black/15 p-4">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Likely cause</p>
                <p className="text-sm leading-relaxed text-slate-100">{decodeDisplayText(fixBrief.likely_cause)}</p>
              </div>

              <div className="rounded-lg border border-[#49d3a4]/30 bg-[#49d3a4]/12 p-4">
                <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#70e0b9]">
                  <Wrench className="size-3.5" /> Recommended fix
                </p>
                <p className="text-base font-medium leading-relaxed text-white">{decodeDisplayText(fixBrief.recommendation)}</p>
                {activeInvestigation?.source === 'groq-investigation' && (
                  <p className="mt-2 text-[11px] text-slate-300">Analyst brief · {confidencePct}% evidence confidence</p>
                )}
              </div>
            </div>
          )}
        </section>

        <section className={`rounded-xl border p-4 ${actionCreated ? 'border-[#49d3a4]/45 bg-[#49d3a4]/10' : automation.ready ? 'border-amber-300/50 bg-amber-300/10' : 'border-white/15 bg-white/[.04]'}`}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${actionCreated ? 'text-[#70e0b9]' : automation.ready ? 'text-amber-200' : 'text-slate-300'}`}>
              {actionCreated ? <CheckCircle2 className="size-4" /> : <Zap className="size-4" />}
              {actionCreated ? 'Action logged' : 'Next step'}
            </p>
            <Badge className={actionCreated ? 'bg-[#49d3a4]/20 text-[#70e0b9]' : automation.ready ? 'bg-amber-300/25 text-amber-50' : 'bg-white/10 text-slate-200'}>
              {actionCreated ? 'Pending apply' : automation.ready ? 'Ready to apply' : 'Human approval required'}
            </Badge>
          </div>

          {actionCreated ? (
            <>
              <p className="font-heading text-sm font-semibold text-white">Manual action created</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">
                This opportunity is saved in Monitor under Pending. After you make the commerce change offline, record the fix applied to start before/after monitoring.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  className="flex-1 bg-[#49d3a4] text-[#10243a] hover:bg-[#67dfb6]"
                  disabled={actionBusy}
                  onClick={() => onUpdateStatus('Fix applied')}
                >
                  Record fix applied
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  disabled={actionBusy}
                  onClick={onGoToMonitor}
                >
                  Open Monitor
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="font-heading text-sm font-semibold text-white">{automation.headline}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{automation.summary}</p>
              <ol className="mt-3 space-y-1.5">
                {automation.steps.map((step, index) => (
                  <li key={step} className="flex gap-2 text-xs text-slate-200">
                    <span className={`font-semibold ${automation.ready ? 'text-amber-200' : 'text-slate-400'}`}>{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  className={`flex-1 ${automation.ready ? 'bg-amber-300 text-[#10243a] hover:bg-amber-200' : 'bg-[#49d3a4] text-[#10243a] hover:bg-[#67dfb6]'}`}
                  disabled={actionBusy}
                  onClick={() => onUpdateStatus(automation.ready ? 'Fix applied' : 'Action created')}
                >
                  {actionBusy ? <LoaderCircle className="size-4 animate-spin" /> : automation.ready ? <Zap className="size-4" /> : null}
                  {automation.ready ? 'Apply automated fix' : 'Create manual action'}
                </Button>
                {automation.ready ? (
                  <Button
                    variant="outline"
                    className="flex-1 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                    disabled={actionBusy}
                    onClick={() => onUpdateStatus('Action created')}
                  >
                    Create manual action
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                    disabled={actionBusy}
                    onClick={() => onUpdateStatus('Fix applied')}
                  >
                    Record fix applied
                  </Button>
                )}
              </div>
            </>
          )}
        </section>

        {actionApplied && (
          <section className="rounded-xl border border-[#49d3a4]/35 bg-[#49d3a4]/10 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#70e0b9]">
                <Activity className="size-4" /> Fix outcome
              </p>
              <Badge className={monitoringActive ? 'bg-[#49d3a4]/20 text-[#70e0b9]' : 'bg-white/10 text-slate-300'}>
                {monitoringActive ? 'Monitoring' : 'Closed'}
              </Badge>
            </div>
            {outcome ? (
              <div className="space-y-2 text-sm text-slate-100">
                <p className="font-semibold">{verdictLabel(outcome.verdict)}</p>
                <p className="text-slate-300">
                  {outcome.target_metric.replace(/_/g, ' ')}: {outcome.before_value?.toFixed(3) ?? '—'} → {outcome.after_value?.toFixed(3) ?? '—'}
                  {outcome.delta_pct != null ? ` (${outcome.delta_pct >= 0 ? '+' : ''}${(outcome.delta_pct * 100).toFixed(1)}%)` : ''}
                </p>
                <p className="text-xs text-slate-400">
                  {outcome.before_days} days before · {outcome.after_days} days after apply
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-300">Measuring before/after on {selectedAction.target_metric.replace(/_/g, ' ')}…</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-[#49d3a4]/30 bg-[#10243a]/40 text-xs text-[#70e0b9] hover:bg-[#49d3a4]/10"
                disabled={actionBusy}
                onClick={() => onRefreshOutcome(selectedAction.id)}
              >
                Refresh outcome
              </Button>
              {monitoringActive ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-white/20 bg-transparent text-xs text-slate-200 hover:bg-white/10"
                  disabled={actionBusy}
                  onClick={() => onCloseMonitoring(selectedAction.id)}
                >
                  Stop monitoring
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-white/20 bg-transparent text-xs text-slate-200 hover:bg-white/10"
                  disabled={actionBusy}
                  onClick={() => onReopenMonitoring(selectedAction.id)}
                >
                  Resume monitoring
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
                onClick={onGoToMonitor}
              >
                All monitors
              </Button>
            </div>
          </section>
        )}

        <details className="group rounded-xl border border-white/10 bg-black/10">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-200 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              Evidence &amp; drill-down
              <ChevronRight className="size-4 transition group-open:rotate-90" />
            </span>
          </summary>
          <div className="space-y-4 border-t border-white/10 px-4 py-4">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Evidence</p>
              <ul className="space-y-2">
                {selected.evidence.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-slate-200">
                    <Eye className="mt-0.5 size-4 shrink-0 text-[#49d3a4]" />
                    {decodeDisplayText(item)}
                  </li>
                ))}
              </ul>
            </div>

            {activeInvestigation?.product_context?.length ? (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Catalog context</p>
                <ul className="space-y-2">
                  {activeInvestigation.product_context.slice(0, 4).map((product) => (
                    <li key={`${product.sku}-${product.name ?? ''}`} className="text-sm text-slate-200">
                      <span className="font-semibold text-white">{product.sku}</span>
                      {product.name ? ` · ${decodeDisplayText(product.name)}` : ''}
                      {product.manufacturer ? ` · ${decodeDisplayText(product.manufacturer)}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {activeInvestigation?.impact_math ? (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Impact math</p>
                <p className="text-sm font-semibold text-white">{activeInvestigation.impact_math.result}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{activeInvestigation.impact_math.formula}</p>
              </div>
            ) : null}

            {activeInvestigation ? (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">What we checked</p>
                <ol className="space-y-2">
                  {activeInvestigation.steps.map((step, index) => (
                    <li key={step.name} className="rounded-lg border border-white/10 bg-black/10 p-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-white">{index + 1}. {step.name}</p>
                        <Badge className={step.status === 'signal' ? 'bg-amber-400/20 text-amber-100' : step.status === 'clear' ? 'bg-emerald-400/15 text-emerald-100' : 'bg-white/10 text-slate-200'}>{step.status}</Badge>
                      </div>
                      <p className="text-sm text-slate-200">{step.summary}</p>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Run Investigate to populate drill-down steps.</p>
            )}
          </div>
        </details>
      </CardContent>

      {embedded ? (
        <div className="shrink-0 space-y-3 border-t border-white/10 bg-[#172a43] px-4 pb-5 pt-4">
          {footer}
        </div>
      ) : (
        <CardContent className="space-y-3 pt-0">
          {footer}
        </CardContent>
      )}
    </Card>
  );
}
