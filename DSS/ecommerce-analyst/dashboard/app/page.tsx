'use client';

import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Boxes, CheckCircle2, ChevronRight, CircleDollarSign, Clock3, Eye, Gauge, LayoutDashboard, LayoutTemplate, LoaderCircle, Megaphone, PackageSearch, Search, ShieldCheck, ShoppingCart, Sparkles, Tags, Wand2, Wrench, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Progress } from '@/components/ui/progress';
import { opportunityDisplayLabel, opportunityShowsOutOfStock, type Opportunity } from '@/lib/opportunities';
import type { Investigation } from '@/lib/investigate';
import type { ActionRecord } from '@/lib/actions';
import { activeMonitors, appliedActions, isMonitoringActive, latestActionForOpportunity, pendingActions } from '@/lib/actions';
import type { LearningSummary, OutcomeRecord } from '@/lib/learning';
import type { WeekOpportunity } from '@/lib/week';
import { decodeDisplayText } from '@/lib/text';
import { oosPatternLabel } from '@/lib/inventory';
import { DateRangeSelector } from '@/components/date-range-selector';
import { BriefingSignalModal } from '@/components/briefing-signal-modal';
import { HomeBriefing } from '@/components/home-briefing';
import { LogoLoader } from '@/components/logo-loader';
import { OpportunityDrawer } from '@/components/opportunity-drawer';
import { OpportunityDetailPanel } from '@/components/opportunity-detail-panel';
import { RevenueImpactExplainer } from '@/components/revenue-impact-explainer';
import {
  dateRangeSearchParams,
  defaultDateRangeSelection,
  type DateRangeSelection,
} from '@/lib/date-range';
import { searchMatchRate, sortSearchTermsByAttention } from '@/lib/search-attention';
import { buildHiddenSignals, hiddenActionLabel, resolveHiddenOpportunity, type HiddenSignal } from '@/lib/home-briefing';

type TopSellingProduct = {
  item_id: string;
  item_name: string;
  units_sold: number;
  orders: number;
  item_revenue_usd: number;
};

type ProductMatch = {
  item_id: string;
  item_name: string;
  event_rows: number;
};

type AffinityRow = {
  item_id: string;
  item_name: string;
  co_occurrences: number;
};

type ProductAffinities = {
  anchor_item_id: string;
  anchor_item_name: string | null;
  anchor_orders: number;
  anchor_cart_sessions: number;
  purchased_together: AffinityRow[];
  cart_together: AffinityRow[];
  start_date: string;
  end_date: string;
};

type ProductsWindow = {
  start_date: string;
  end_date: string;
  window_days: number;
  days_available: number;
  label?: string;
};

function buildApiQuery(dateRange: DateRangeSelection, extra?: Record<string, string>) {
  const params = new URLSearchParams(dateRangeSearchParams(dateRange));
  if (extra) {
    for (const [key, value] of Object.entries(extra)) params.set(key, value);
  }
  return params.toString();
}

const fallbackMetrics = [
  { label: 'Revenue', value: '$79,668', detail: 'Selected period · 4 GA4 export days', icon: CircleDollarSign },
  { label: 'Purchases', value: '100', detail: 'Selected period · latest export day may still be partial', icon: ShoppingCart },
  { label: 'View → cart', value: '15.5%', detail: 'Selected period · unique product viewers', icon: ArrowDownRight },
  { label: 'Checkout rate', value: '95.6%', detail: 'Selected period · checkout → purchase', icon: Gauge },
];

const categoryIcon = {
  Inventory: Boxes,
  Search: Search,
  Funnel: ArrowDownRight,
  Anomaly: Activity,
  Landing: LayoutTemplate,
  Taxonomy: Tags,
  Acquisition: Megaphone,
} as const;

const fallbackFindings: Opportunity[] = [
  {
    id: 'funnel-view-cart',
    category: 'Funnel',
    title: 'Product-view to cart is the largest funnel drop',
    problem: 'Only 60 of 388 product-viewing users added an item to cart.',
    likely_cause: 'Friction after product discovery (availability, variants, pricing, or PDP clarity).',
    evidence: ['388 product viewers', '60 cart users', '45 checkout users', '43 purchasing users', '15.5% view-to-cart rate'],
    recommendation: 'Segment the drop by product, stock state, and search entry. Prioritize high-view products with low cart progression.',
    confidence: 0.74,
    date: '20260827',
    estimated_monthly_revenue_usd: 112647.72,
    impact: 'High',
    status: 'Open',
    metrics: { viewed_users: 388, cart_users: 60, view_to_cart_rate: 0.1546 },
  },
];

type LiveReport = {
  source: string;
  refreshed_at: string;
  report_date: string;
  week_end?: string;
  week_start?: string;
  week_dates?: string[];
  week_totals?: { revenue_usd: number; purchases: number; sessions: number; days: number };
  week_metrics?: {
    start_date: string;
    end_date: string;
    days: number;
    revenue_usd: number;
    purchases: number;
    sessions: number;
    authenticated_users: number;
    authenticated_viewed_users: number;
    authenticated_cart_users: number;
    authenticated_checkout_users: number;
    authenticated_purchasers: number;
    authenticated_to_pdp_rate: number;
    authenticated_view_to_cart_rate: number;
    authenticated_checkout_conversion_rate: number;
    purchasing_users: number;
    viewed_users: number;
    cart_users: number;
    checkout_users: number;
    purchasers: number;
    view_to_cart_rate: number;
    checkout_conversion_rate: number;
  };
  date_range?: {
    preset: string;
    start_date: string;
    end_date: string;
    export_dates: string[];
    export_days: number;
    label: string;
  };
  latest_day?: {
    report_date: string;
    revenue_usd: number;
    purchases: number;
    sessions: number;
    events: number;
  };
  events: number;
  users: number;
  authenticated_users: number;
  sessions: number;
  purchases: number;
  purchasing_users: number;
  revenue_usd: number;
  viewed_users: number;
  cart_users: number;
  checkout_users: number;
  purchasers: number;
  view_to_cart_rate: number;
  checkout_conversion_rate: number;
  inventory: Array<{
    item_id: string;
    zero_stock_views: number;
    affected_users: number;
    cart_adds: number;
    cart_users: number;
    purchases: number;
    oos_pattern: 'backorder_allowed' | 'oos_messaging_only';
  }>;
  searches: Array<{ search_term: string; searches: number; result_views: number; no_result_events: number; users: number }>;
  products?: Array<{
    item_id: string;
    item_name: string;
    views: number;
    adds: number;
    purchases: number;
    item_revenue_usd: number;
    add_rate: number;
    zero_stock_views?: number;
    oos_users?: number;
    oos_pattern?: 'backorder_allowed' | 'oos_messaging_only' | null;
  }>;
  history: Array<{ report_date: string; events: number; users: number; sessions: number; purchases: number; revenue_usd: number; view_to_cart_rate: number; checkout_conversion_rate: number }>;
  opportunities?: WeekOpportunity[];
  all_opportunities?: WeekOpportunity[];
  learning?: LearningSummary;
  detection?: {
    baseline_days: number;
    baseline_ready: boolean;
    site_aov_usd: number | null;
    notes: string[];
  };
  data_cache?: {
    hits: number;
    misses: number;
    sources: Array<'memory' | 'disk' | 'bigquery'>;
  };
};

type NavView = 'Overview' | 'Opportunities' | 'Products' | 'Recommendations AI' | 'Search' | 'Funnel' | 'Monitor';
type MonitorFilter = 'pending' | 'active' | 'closed' | 'all';

const trendConfig = {
  revenue_usd: { label: 'Revenue', color: '#1f6f62' },
  purchases: { label: 'Purchases', color: '#d28b2d' },
} satisfies ChartConfig;

function formatReportDate(value?: string) {
  if (!value || value.length !== 8) return 'Aug 27, 2026';
  const date = new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function formatMoney(value: number | null | undefined) {
  if (value == null) return 'Est. impact TBD';
  return `Est. ${value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}/mo`;
}

function formatUsd(value: number | null | undefined) {
  if (value == null) return '—';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function formatShortDate(value: string) {
  if (value.length !== 8) return value;
  return `${value.slice(4, 6)}/${value.slice(6, 8)}`;
}

function formatProductsWindowLabel(window: ProductsWindow | null) {
  if (!window) return 'Selected date range';
  if (window.label) {
    const dayLabel = window.days_available === 1 ? '1 export day' : `${window.days_available} export days`;
    return `${window.label} · ${dayLabel}`;
  }
  const range = `${formatShortDate(window.start_date)}–${formatShortDate(window.end_date)}`;
  const dayLabel = window.days_available === 1 ? '1 export day' : `${window.days_available} export days`;
  return `${range} · ${dayLabel}`;
}

function statusLabel(action: ActionRecord | null, fallback = 'Open') {
  if (!action || action.status === 'dismissed') return fallback;
  if (action.status === 'created') return 'Action created';
  if (action.status === 'applied') return 'Applied';
  return fallback;
}

function verdictLabel(verdict: OutcomeRecord['verdict']) {
  if (verdict === 'lift') return 'Lift detected';
  if (verdict === 'worse') return 'Metric worsened';
  if (verdict === 'flat') return 'No material change';
  return 'Collecting data';
}

function automationPreview(opportunity: Opportunity) {
  if (opportunity.category === 'Search') {
    return {
      ready: false,
      headline: 'Search relevance & tracking fix',
      summary: 'Propose synonyms, boost rules, or GA4 result-view validation for the flagged term.',
      steps: ['Replay the query in production', 'Patch synonym / ranking rule', 'Verify result-view events carry search_term'],
    };
  }
  if (opportunity.category === 'Inventory') {
    return {
      ready: false,
      headline: 'Substitute & PDP availability messaging',
      summary: 'Surface in-stock alternatives on PDP and search when GA4 shows zero-stock friction.',
      steps: ['Identify substitute SKUs in catalog', 'Update PDP availability messaging', 'Promote substitutes in search for the family'],
    };
  }
  if (opportunity.category === 'Funnel') {
    return {
      ready: false,
      headline: 'PDP conversion recovery test',
      summary: 'Target high-view, low cart-progression products with merchandising or UX experiments.',
      steps: ['Segment drop by device and entry path', 'Prioritize top-view underperformers', 'Launch PDP or cart nudge experiment'],
    };
  }
  if (opportunity.category === 'Landing') {
    return {
      ready: false,
      headline: 'Landing quality & routing fix',
      summary: 'Improve high-traffic landings that fail to produce commerce sessions.',
      steps: ['Compare landing intent vs campaign', 'Test stronger commerce CTA / PDP routing', 'Measure purchase rate not just sessions'],
    };
  }
  if (opportunity.category === 'Taxonomy') {
    return {
      ready: false,
      headline: 'Category merchandising pass',
      summary: 'Lift add-to-cart for high-view leaf categories that under-convert.',
      steps: ['Review top SKUs in the category', 'Fix stock/content gaps', 'Boost converters in search and category'],
    };
  }
  if (opportunity.category === 'Acquisition') {
    return {
      ready: false,
      headline: 'Acquisition quality reallocation',
      summary: 'Shift spend/attention toward sources that create purchasers, not just traffic.',
      steps: ['Benchmark purchase rate vs site', 'Align landing to campaign intent', 'Pause or retarget low-intent placements'],
    };
  }
  return {
    ready: false,
    headline: 'Merchandising recovery action',
    summary: 'Investigate the anomaly window and apply a bounded merchandising or messaging change.',
    steps: ['Confirm segment driving the shift', 'Validate with product/search drill-down', 'Propose a reversible merchandising change'],
  };
}

const nav: Array<{ label: NavView; icon: typeof LayoutDashboard }> = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Opportunities', icon: Sparkles },
  { label: 'Monitor', icon: Activity },
  { label: 'Products', icon: PackageSearch },
  { label: 'Search', icon: Search },
  { label: 'Funnel', icon: Gauge },
  { label: 'Recommendations AI', icon: Wand2 },
];

export default function Home() {
  const [view, setView] = useState<NavView>('Overview');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');
  const [notice, setNotice] = useState('');
  const [warningNotice, setWarningNotice] = useState('');
  const [hiddenBehaviorNotice, setHiddenBehaviorNotice] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeSelection>(defaultDateRangeSelection);
  const [liveReport, setLiveReport] = useState<LiveReport | null>(null);
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeRecord[]>([]);
  const [monitorFilter, setMonitorFilter] = useState<MonitorFilter>('active');
  const [monitorBusyId, setMonitorBusyId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<OutcomeRecord | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [dataError, setDataError] = useState(false);
  const [reportLoading, setReportLoading] = useState(true);
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [investigationLoading, setInvestigationLoading] = useState(false);
  const [investigationError, setInvestigationError] = useState('');
  const [topSellers, setTopSellers] = useState<TopSellingProduct[]>([]);
  const [topSellersSort, setTopSellersSort] = useState<'revenue' | 'units' | 'orders'>('orders');
  const [productQuery, setProductQuery] = useState('');
  const [productMatches, setProductMatches] = useState<ProductMatch[]>([]);
  const [affinities, setAffinities] = useState<ProductAffinities | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [productsWindow, setProductsWindow] = useState<ProductsWindow | null>(null);
  const [siteName, setSiteName] = useState('Commerce Signals');
  const [overviewModalOpen, setOverviewModalOpen] = useState(false);
  const [briefingSignalModalOpen, setBriefingSignalModalOpen] = useState(false);
  const [briefingSignalModal, setBriefingSignalModal] = useState<{
    title: string;
    detail: string;
    badge?: string;
    severity?: 'high' | 'medium';
    analysis?: string;
    suggestion?: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);
  const affinityExplorerRef = useRef<HTMLDivElement>(null);

  function selectOpportunity(id: string, options?: { openModal?: boolean }) {
    setSelectedId(id);
    setInvestigation(null);
    setInvestigationError('');
    setOutcome(null);
    if (options?.openModal) setOverviewModalOpen(true);
  }

  useEffect(() => {
    fetch('/api/session', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json() as { siteName?: string };
        if (payload.siteName) setSiteName(payload.siteName);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setReportLoading(true);
    setDataError(false);
    Promise.all([
      fetch(`/api/report?${buildApiQuery(dateRange)}`, { signal: controller.signal }),
      fetch(`/api/actions?ts=${Date.now()}`, { signal: controller.signal, cache: 'no-store' }),
    ])
      .then(async ([reportResponse, actionsResponse]) => {
        if (!reportResponse.ok) throw new Error('Live report unavailable');
        const report = await reportResponse.json() as LiveReport;
        setLiveReport(report);
        setSelectedId((current) => current ?? report.opportunities?.[0]?.id ?? null);
        if (actionsResponse.ok) {
          const payload = await actionsResponse.json() as { actions?: ActionRecord[]; outcomes?: OutcomeRecord[] };
          setActions(payload.actions ?? []);
          setOutcomes(payload.outcomes ?? []);
        }
      })
      .catch((error) => { if (error.name !== 'AbortError') setDataError(true); })
      .finally(() => {
        if (!controller.signal.aborted) setReportLoading(false);
      });
    return () => controller.abort();
  }, [dateRange]);

  useEffect(() => {
    setInvestigation(null);
    setInvestigationError('');
    setOutcome(null);
  }, [dateRange]);

  useEffect(() => {
    setInvestigation(null);
    setInvestigationError('');
    setOutcome(null);
  }, [selectedId]);

  const selectedAction = selectedId ? latestActionForOpportunity(actions, selectedId) : null;

  useEffect(() => {
    if (!selectedId || selectedAction?.status !== 'applied') return;
    const controller = new AbortController();
    fetch(`/api/outcomes?opportunity_id=${encodeURIComponent(selectedId)}&ts=${Date.now()}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json() as { outcome?: OutcomeRecord | null };
        setOutcome(payload.outcome ?? null);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [selectedId, selectedAction?.status, selectedAction?.id]);

  useEffect(() => {
    if (view !== 'Recommendations AI') return;
    const controller = new AbortController();
    setProductsLoading(true);
    setProductsError('');
    fetch(`/api/products?${buildApiQuery(dateRange, { sort: topSellersSort })}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Top sellers unavailable');
        const payload = await response.json() as {
          products?: TopSellingProduct[];
          start_date?: string;
          end_date?: string;
          window_days?: number;
          days_available?: number;
          date_range?: { label: string };
        };
        setTopSellers(payload.products ?? []);
        if (
          payload.start_date
          && payload.end_date
          && payload.window_days != null
          && payload.days_available != null
        ) {
          setProductsWindow({
            start_date: payload.start_date,
            end_date: payload.end_date,
            window_days: payload.window_days,
            days_available: payload.days_available,
            label: payload.date_range?.label,
          });
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setProductsError(error instanceof Error ? error.message : 'Product data unavailable');
      })
      .finally(() => {
        if (!controller.signal.aborted) setProductsLoading(false);
      });
    return () => controller.abort();
  }, [view, topSellersSort, dateRange]);

  async function searchProductsForAffinity() {
    const query = productQuery.trim();
    if (query.length < 2) return;
    setProductsLoading(true);
    setProductsError('');
    setAffinities(null);
    try {
      const response = await fetch(`/api/products?${buildApiQuery(dateRange, { q: query })}`);
      const payload = await response.json() as {
        matches?: ProductMatch[];
        error?: string;
        start_date?: string;
        end_date?: string;
        window_days?: number;
        days_available?: number;
        date_range?: { label: string };
      };
      if (!response.ok) throw new Error(payload.error ?? 'Product search failed');
      setProductMatches(payload.matches ?? []);
      if (
        payload.start_date
        && payload.end_date
        && payload.window_days != null
        && payload.days_available != null
      ) {
        setProductsWindow({
          start_date: payload.start_date,
          end_date: payload.end_date,
          window_days: payload.window_days,
          days_available: payload.days_available,
          label: payload.date_range?.label,
        });
      }
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : 'Product search failed');
      setProductMatches([]);
    } finally {
      setProductsLoading(false);
    }
  }

  async function loadProductAffinities(itemId: string, options?: { navigate?: boolean }) {
    if (options?.navigate) setView('Recommendations AI');
    setProductsLoading(true);
    setProductsError('');
    setProductQuery(itemId);
    try {
      const response = await fetch(`/api/products?${buildApiQuery(dateRange, { item_id: itemId })}`);
      const payload = await response.json() as ProductAffinities & {
        error?: string;
        window_days?: number;
        days_available?: number;
        date_range?: { label: string };
      };
      if (!response.ok) throw new Error(payload.error ?? 'Affinity lookup failed');
      setAffinities(payload);
      setProductMatches([]);
      if (payload.window_days != null && payload.days_available != null) {
        setProductsWindow({
          start_date: payload.start_date,
          end_date: payload.end_date,
          window_days: payload.window_days,
          days_available: payload.days_available,
          label: payload.date_range?.label,
        });
      }
      window.setTimeout(() => {
        affinityExplorerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, options?.navigate ? 120 : 0);
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : 'Affinity lookup failed');
    } finally {
      setProductsLoading(false);
    }
  }

  const weekMetrics = liveReport?.week_metrics;
  const periodLabel = liveReport?.date_range?.label ?? 'Selected period';
  const weekRangeLabel = weekMetrics
    ? `${formatShortDate(weekMetrics.start_date)}–${formatShortDate(weekMetrics.end_date)} · ${weekMetrics.days} export day${weekMetrics.days === 1 ? '' : 's'}`
    : liveReport?.week_start && liveReport?.week_end
      ? `${formatShortDate(liveReport.week_start)}–${formatShortDate(liveReport.week_end)}`
      : periodLabel;

  const exportDayCount = liveReport?.week_metrics?.days ?? liveReport?.week_dates?.length ?? 0;
  const exportStatusLine = liveReport?.week_dates?.length
    ? `${exportDayCount} GA4 export day${exportDayCount === 1 ? '' : 's'} loaded · latest ${formatShortDate(liveReport.latest_day?.report_date ?? liveReport.report_date)}${liveReport.latest_day && liveReport.latest_day.purchases < 10 ? ' (may still be partial)' : ''}`
    : null;
  const cacheStatusLine = liveReport?.data_cache
    ? liveReport.data_cache.misses === 0
      ? `Served from cache (${liveReport.data_cache.hits} hits, no BigQuery queries).`
      : `Cache: ${liveReport.data_cache.hits} hits · ${liveReport.data_cache.misses} BigQuery fetches.`
    : null;

  const metrics = weekMetrics ? [
    { label: 'Revenue', value: weekMetrics.revenue_usd.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }), detail: `${weekRangeLabel} · GA4 purchase revenue`, icon: CircleDollarSign },
    { label: 'Purchases', value: weekMetrics.purchases.toLocaleString(), detail: `${weekMetrics.purchasing_users.toLocaleString()} purchasing users · ${weekRangeLabel}`, icon: ShoppingCart },
    { label: 'View → cart', value: `${(weekMetrics.view_to_cart_rate * 100).toFixed(1)}%`, detail: `${weekMetrics.cart_users.toLocaleString()} of ${weekMetrics.viewed_users.toLocaleString()} viewers · ${weekRangeLabel}`, icon: ArrowDownRight },
    { label: 'Checkout rate', value: `${(weekMetrics.checkout_conversion_rate * 100).toFixed(1)}%`, detail: `${weekMetrics.purchasers} of ${weekMetrics.checkout_users} checkout users · ${weekRangeLabel}`, icon: Gauge },
  ] : fallbackMetrics;

  const history = liveReport?.history ?? [];
  const latestHistoryDay = history.at(-1);
  const priorDays = history.slice(0, -1);
  const baselineReady = liveReport?.detection?.baseline_ready ?? priorDays.length >= 6;
  const chartData = history.map((day) => ({ ...day, label: `${day.report_date.slice(4, 6)}/${day.report_date.slice(6, 8)}` }));
  const previousRevenueAverage = priorDays.length ? priorDays.reduce((sum, day) => sum + day.revenue_usd, 0) / priorDays.length : null;
  const revenueDelta = previousRevenueAverage && latestHistoryDay
    ? (latestHistoryDay.revenue_usd - previousRevenueAverage) / previousRevenueAverage
    : null;
  const anomalyMessage = baselineReady && revenueDelta !== null && Math.abs(revenueDelta) >= 0.2
    ? `Revenue is ${Math.abs(revenueDelta * 100).toFixed(0)}% ${revenueDelta < 0 ? 'below' : 'above'} the prior-day average.`
    : baselineReady ? 'No material revenue anomaly detected against the current baseline.' : null;

  const findings = liveReport?.opportunities?.length ? liveReport.opportunities : fallbackFindings;
  const inspectableFindings = liveReport?.all_opportunities?.length ? liveReport.all_opportunities : findings;
  const opportunityById = new Map(inspectableFindings.map((finding) => [finding.id, finding]));
  const selected = inspectableFindings.find((finding) => finding.id === selectedId) ?? findings[0];
  const selectedStatus = statusLabel(selectedAction, selected.status);
  const filterOptions = ['All', ...Array.from(new Set(inspectableFindings.map((finding) => finding.category)))];
  const opportunityFilter = view === 'Opportunities' ? filter : view === 'Search' ? 'Search' : view === 'Funnel' ? 'Funnel' : filter;
  const visibleFindings = useMemo(() => {
    if (view === 'Search') {
      return inspectableFindings.filter((finding) => finding.category === 'Search');
    }
    if (view === 'Funnel') {
      return inspectableFindings.filter((finding) => finding.category === 'Funnel');
    }
    if (opportunityFilter === 'All') return inspectableFindings;
    return inspectableFindings.filter((finding) => finding.category === opportunityFilter);
  }, [view, inspectableFindings, opportunityFilter]);
  const activeInvestigation = investigation?.opportunity_id === selected.id ? investigation : null;
  const confidencePct = Math.round((activeInvestigation?.confidence ?? selected.confidence) * 100);
  const automation = activeInvestigation?.automation ?? automationPreview(selected);
  const fixBrief = activeInvestigation ?? selected;
  const searches = liveReport?.searches ?? [];
  const rankedSearches = useMemo(() => sortSearchTermsByAttention(searches), [searches]);
  const searchAttentionCount = rankedSearches.filter((term) => term.attention.needsAttention).length;
  const inventory = liveReport?.inventory ?? [];
  const briefingProducts = liveReport?.products;
  const hiddenSignals = useMemo(
    () => buildHiddenSignals(briefingProducts ?? [], inventory, searches, 5),
    [briefingProducts, inventory, searches],
  );
  const showOverviewChrome = false;
  const showOpportunityFeed = view === 'Opportunities' || view === 'Funnel';
  const dateRangeLoading = reportLoading || (view === 'Recommendations AI' && productsLoading);

  useEffect(() => {
    if (view !== 'Products') return;
    const firstHidden = hiddenSignals
      .map((signal) => resolveHiddenOpportunity(signal, inspectableFindings))
      .find(Boolean);
    if (!firstHidden) return;
    setSelectedId((current) => {
      const currentIsHidden = hiddenSignals.some(
        (signal) => resolveHiddenOpportunity(signal, inspectableFindings)?.id === current,
      );
      return currentIsHidden ? current : firstHidden.id;
    });
  }, [view, hiddenSignals, inspectableFindings]);

  useEffect(() => {
    if (view !== 'Search') return;
    const firstSearch = inspectableFindings.find((finding) => finding.category === 'Search');
    if (!firstSearch) return;
    setSelectedId((current) => {
      const currentIsSearch = inspectableFindings.some(
        (finding) => finding.category === 'Search' && finding.id === current,
      );
      return currentIsSearch ? current : firstSearch.id;
    });
  }, [view, inspectableFindings]);

  useEffect(() => {
    if (!visibleFindings.length) return;
    setSelectedId((current) => {
      if (current && visibleFindings.some((finding) => finding.id === current)) return current;
      return visibleFindings[0].id;
    });
  }, [visibleFindings]);

  function goTo(next: NavView, options?: { monitorFilter?: MonitorFilter }) {
    setView(next);
    if (next === 'Overview' || next === 'Opportunities') setFilter('All');
    if (next === 'Search') setFilter('Search');
    if (next === 'Funnel') setFilter('Funnel');
    if (next === 'Monitor') {
      setMonitorFilter(options?.monitorFilter ?? (pendingActions(actions).length ? 'pending' : 'active'));
    }
  }

  function handleHiddenSignal(signal: HiddenSignal, options?: { openModal?: boolean }) {
    const opportunity = resolveHiddenOpportunity(signal, inspectableFindings);
    const message = 'No ranked opportunity matches this hidden signal yet — widen the date range or check back after more exports.';
    if (!opportunity) {
      setHiddenBehaviorNotice(message);
      setWarningNotice(message);
      setNotice('');
      return;
    }
    setHiddenBehaviorNotice('');
    setWarningNotice('');
    selectOpportunity(opportunity.id, { openModal: options?.openModal ?? true });
  }

  function renderOpportunityCard(finding: Opportunity) {
    const Icon = categoryIcon[finding.category];
    const weekFinding = finding as WeekOpportunity;
    const cardAction = latestActionForOpportunity(actions, finding.id);
    const cardStatus = statusLabel(cardAction, finding.status);
    return (
      <button
        key={finding.id}
        type="button"
        onClick={() => selectOpportunity(finding.id)}
        className={`group flex w-full gap-3 rounded-xl border bg-card p-4 text-left transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${selected.id === finding.id ? 'border-primary/45 bg-primary/[.04] ring-1 ring-primary/15' : 'border-border/70'}`}
      >
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="border-border/80 bg-background text-[10px] font-medium text-muted-foreground">{opportunityDisplayLabel(finding)}</Badge>
            {opportunityShowsOutOfStock(finding) ? (
              <Badge variant="outline" className="border-amber-300/80 bg-amber-50 text-[10px] font-medium text-amber-900">Out of stock</Badge>
            ) : null}
            {cardStatus !== 'Open' ? <Badge variant="outline" className="border-border/80 bg-background text-[10px] font-medium text-muted-foreground">{cardStatus}</Badge> : null}
            <Badge variant="outline" className="border-border/80 bg-background text-[10px] font-medium text-muted-foreground">{finding.impact} impact</Badge>
            {weekFinding.day_count ? <span className="text-[11px] text-muted-foreground">{weekFinding.day_count}d in range</span> : null}
            {weekFinding.learning_boost && weekFinding.learning_boost !== 1 ? (
              <span className="text-[11px] font-medium text-emerald-700">{(weekFinding.learning_boost * 100 - 100).toFixed(0)}% learning boost</span>
            ) : null}
          </div>
          <h3 className="font-heading text-sm font-semibold leading-snug sm:text-base">{decodeDisplayText(finding.title)}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{decodeDisplayText(finding.problem)}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="mb-0.5 text-[10px] font-medium uppercase tracking-[.08em] text-muted-foreground">Est. monthly impact</p>
              <RevenueImpactExplainer
                opportunity={{
                  category: finding.category,
                  estimated_monthly_revenue_usd: finding.estimated_monthly_revenue_usd,
                  metrics: finding.metrics,
                  day_count: weekFinding.day_count,
                }}
                stopPropagation
              />
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-primary">
              Inspect <ChevronRight className="size-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </button>
    );
  }

  function renderOpportunityDetailAside() {
    const selectedWeek = selected as WeekOpportunity;
    return (
      <aside className="xl:sticky xl:top-24 xl:h-[calc(100dvh-9rem)] xl:max-h-[calc(100dvh-9rem)] xl:min-h-0 xl:self-start">
        <OpportunityDetailPanel
          embedded
          selected={selected}
          dayCount={selectedWeek.day_count}
          selectedStatus={selectedStatus}
          confidencePct={confidencePct}
          automation={automation}
          fixBrief={fixBrief}
          investigationLoading={investigationLoading}
          investigationError={investigationError}
          activeInvestigation={activeInvestigation}
          selectedAction={selectedAction}
          outcome={outcome}
          actionBusy={actionBusy}
          monitoringActive={selectedAction ? isMonitoringActive(selectedAction) : false}
          onInvestigate={() => void runExplain(selected.id)}
          onUpdateStatus={updateStatus}
          onRefreshOutcome={refreshMonitorOutcome}
          onCloseMonitoring={closeMonitoring}
          onReopenMonitoring={reopenMonitoring}
          onGoToMonitor={() => {
            setOverviewModalOpen(false);
            goTo('Monitor', { monitorFilter: 'pending' });
          }}
        />
      </aside>
    );
  }

  function renderProductsHiddenBehavior() {
    const items = hiddenSignals.map((signal) => ({
      signal,
      opportunity: resolveHiddenOpportunity(signal, inspectableFindings),
    }));
    const matched = items.filter((item) => item.opportunity);

    return (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(480px,42%)]">
        <div className="min-w-0">
          <div className="mb-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[.14em] text-primary">Hidden behavior</p>
            <h2 className="font-heading text-base font-semibold">What opportunities are buried in behavior?</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {periodLabel} · patterns detectors don&apos;t always rank first — low convert views, OOS demand, and repeat search intent
            </p>
          </div>

          {hiddenBehaviorNotice ? (
            <output className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <span className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {hiddenBehaviorNotice}
              </span>
              <button className="shrink-0 text-xs font-semibold" onClick={() => setHiddenBehaviorNotice('')}>Close</button>
            </output>
          ) : null}

          <div className="space-y-3">
            {items.length ? items.map(({ signal, opportunity }) => (
              opportunity ? (
                renderOpportunityCard(opportunity)
              ) : (
                <button
                  key={signal.id}
                  type="button"
                  onClick={() => handleHiddenSignal(signal, { openModal: false })}
                  className="block w-full rounded-xl border border-border/70 bg-muted/20 p-4 text-left transition hover:border-amber-200 hover:bg-amber-50/60"
                >
                  <p className="text-sm font-semibold">{signal.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{signal.detail}</p>
                  <p className="mt-2 text-[11px] font-medium text-amber-800">{hiddenActionLabel(signal, inspectableFindings)}</p>
                </button>
              )
            )) : (
              <p className="text-sm text-muted-foreground">No secondary behavioral edges surfaced yet — widen the date range or check back after more exports.</p>
            )}
          </div>
        </div>

        {matched.length ? renderOpportunityDetailAside() : (
          <aside className="xl:sticky xl:top-24 xl:h-[calc(100dvh-9rem)] xl:max-h-[calc(100dvh-9rem)] xl:min-h-0 xl:self-start">
            <Card className="border-dashed border-border/80">
              <CardContent className="py-10 text-center">
                <p className="text-sm font-medium">No inspectable hidden opportunities yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Select a matched signal on the left to review analysis and apply a fix.</p>
              </CardContent>
            </Card>
          </aside>
        )}
      </div>
    );
  }

  async function runExplain(opportunityId: string) {
    setSelectedId(opportunityId);
    setInvestigationLoading(true);
    setInvestigationError('');
    setNotice('');
    try {
      const response = await fetch(`/api/explain?${buildApiQuery(dateRange, { opportunity_id: opportunityId })}`);
      const payload = await response.json() as { investigation?: Investigation; error?: string };
      if (!response.ok || !payload.investigation) throw new Error(payload.error ?? 'Investigation failed');
      setInvestigation(payload.investigation);
    } catch (error) {
      setInvestigationError(error instanceof Error ? error.message : 'Investigation failed');
    } finally {
      setInvestigationLoading(false);
    }
  }

  async function postAction(body: Record<string, unknown>) {
    const response = await fetch('/api/actions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json() as {
      action?: ActionRecord;
      outcome?: OutcomeRecord;
      error?: string;
    };
    if (!response.ok || !payload.action) {
      throw new Error(payload.error ?? 'Action update failed');
    }
    setActions((current) => {
      const without = current.filter((item) => item.id !== payload.action!.id);
      return [...without, payload.action!];
    });
    if (payload.outcome) setOutcome(payload.outcome);
    if (payload.outcome) {
      setOutcomes((current) => {
        const without = current.filter((item) => item.action_id !== payload.outcome!.action_id);
        return [...without, payload.outcome!];
      });
    }
    return payload;
  }

  async function ensureActionRecord() {
    const existing = latestActionForOpportunity(actions, selected.id);
    if (existing) return existing;
    const recommendation = activeInvestigation?.recommendation ?? selected.recommendation;
    const payload = await postAction({
      action: 'create',
      opportunity_id: selected.id,
      category: selected.category,
      title: selected.title,
      recommendation,
      week_end: liveReport?.week_end ?? liveReport?.report_date,
      metadata: {
        item_id: selected.metrics.item_id ?? null,
        search_term: selected.metrics.search_term ?? null,
      },
    });
    return payload.action!;
  }

  async function createAction() {
    setActionBusy(true);
    setNotice('');
    try {
      const existing = latestActionForOpportunity(actions, selected.id);
      if (existing?.status === 'created') {
        setNotice('Manual action already logged. Open Monitor → Pending, or record the fix applied when the change is live.');
        return;
      }
      if (existing?.status === 'applied') {
        setNotice('This opportunity already has an applied fix in Monitor.');
        return;
      }
      await ensureActionRecord();
      setNotice('Manual action logged. Find it in Monitor → Pending, then record fix applied to start monitoring.');
    } catch (error) {
      setInvestigationError(error instanceof Error ? error.message : 'Failed to create action');
    } finally {
      setActionBusy(false);
    }
  }

  async function applyAction(actionId?: string) {
    setActionBusy(true);
    setNotice('');
    try {
      const action = actionId
        ? actions.find((item) => item.id === actionId) ?? await ensureActionRecord()
        : await ensureActionRecord();
      await postAction({ action: 'apply', action_id: action.id });
      setOverviewModalOpen(false);
      setNotice('Fix marked applied — now tracking before/after in Monitor.');
      goTo('Monitor', { monitorFilter: 'active' });
    } catch (error) {
      setInvestigationError(error instanceof Error ? error.message : 'Failed to apply action');
    } finally {
      setActionBusy(false);
    }
  }

  async function refreshMonitorOutcome(actionId: string) {
    setMonitorBusyId(actionId);
    try {
      const payload = await postAction({ action: 'refresh_outcome', action_id: actionId });
      setNotice('Outcome refreshed from latest GA4 exports.');
      if (payload.action?.opportunity_id === selectedId) setOutcome(payload.outcome ?? null);
    } catch (error) {
      setInvestigationError(error instanceof Error ? error.message : 'Failed to refresh outcome');
    } finally {
      setMonitorBusyId(null);
    }
  }

  async function closeMonitoring(actionId: string) {
    setMonitorBusyId(actionId);
    try {
      await postAction({ action: 'close_monitoring', action_id: actionId });
      setNotice('Monitoring closed. The fix stays in the log and still informs learning.');
    } catch (error) {
      setInvestigationError(error instanceof Error ? error.message : 'Failed to close monitoring');
    } finally {
      setMonitorBusyId(null);
    }
  }

  async function reopenMonitoring(actionId: string) {
    setMonitorBusyId(actionId);
    try {
      await postAction({ action: 'reopen_monitoring', action_id: actionId });
      setNotice('Monitoring resumed for this fix.');
    } catch (error) {
      setInvestigationError(error instanceof Error ? error.message : 'Failed to reopen monitoring');
    } finally {
      setMonitorBusyId(null);
    }
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/sign-in';
  }

  function outcomeForAction(actionId: string) {
    return outcomes.find((item) => item.action_id === actionId) ?? null;
  }

  const appliedFixes = appliedActions(actions);
  const pendingFixes = pendingActions(actions);
  const activelyMonitored = activeMonitors(actions);
  const monitoredFixes = monitorFilter === 'pending'
    ? pendingFixes
    : appliedFixes.filter((action) => {
      if (monitorFilter === 'active') return isMonitoringActive(action);
      if (monitorFilter === 'closed') return !isMonitoringActive(action);
      return true;
    });

  function updateStatus(status: string) {
    if (status === 'Action created') void createAction();
    else if (status === 'Fix applied') void applyAction();
  }

  function renderOpportunityFeed() {
    const feedTitle = view === 'Search'
      ? 'Search opportunities'
      : view === 'Funnel'
        ? 'Funnel opportunities'
        : 'Opportunity feed';

    return (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(480px,42%)]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-heading text-base font-semibold">{feedTitle}</h2>
              <p className="text-xs text-muted-foreground">{periodLabel} · period-merged · learning-adjusted ranking</p>
            </div>
            {view === 'Opportunities' ? (
              <div className="flex gap-1 self-start rounded-lg bg-muted p-1">
                {filterOptions.map((item) => (
                  <button
                    key={item}
                    onClick={() => setFilter(item)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${filter === item ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="space-y-3">
            {visibleFindings.length ? visibleFindings.map((finding) => renderOpportunityCard(finding)) : (
              <Card className="border-dashed border-border/80">
                <CardContent className="py-8 text-center">
                  <p className="text-sm font-medium">No {view === 'Search' ? 'search' : view === 'Funnel' ? 'funnel' : ''} opportunities in this period</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try widening the date range or check back after more GA4 exports.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {renderOpportunityDetailAside()}
      </div>
    );
  }

  return (
    <main className="app-shell min-h-screen text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1540px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25"><ArrowUpRight className="size-5" /></div><div><p className="font-heading text-sm font-semibold tracking-tight">Commerce Signals</p><p className="text-[11px] text-muted-foreground">{siteName}</p></div></div>
          <div className="flex items-center gap-2"><Badge variant="outline" className="hidden gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-800 sm:flex"><ShieldCheck className="size-3" /> Read-only</Badge><DateRangeSelector value={dateRange} onChange={setDateRange} loading={dateRangeLoading} resolvedLabel={liveReport?.date_range?.label ?? periodLabel} exportDays={liveReport?.date_range?.export_days ?? exportDayCount} /><Button variant="ghost" size="sm" className="hidden h-8 text-xs text-muted-foreground sm:inline-flex" onClick={() => void signOut()}>Sign out</Button><div className="grid size-8 place-items-center rounded-full bg-[#182a43] text-xs font-semibold text-white">SW</div></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1540px] grid-cols-1 lg:grid-cols-[190px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-64px)] border-r border-border/70 px-3 py-6 lg:block">
          <nav className="space-y-1">{nav.map((item) => <button key={item.label} onClick={() => goTo(item.label)} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${view === item.label ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><span className="flex items-center gap-3"><item.icon className="size-4" /> {item.label}</span>{item.label === 'Monitor' && activelyMonitored.length > 0 ? <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${view === item.label ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>{activelyMonitored.length}</span> : null}</button>)}</nav>
          <div className="mt-8 rounded-xl border border-border bg-card p-3"><div className="mb-2 flex items-center gap-2 text-xs font-medium">{reportLoading ? <LogoLoader size="sm" inline label="Loading data…" /> : <><CheckCircle2 className={`size-4 ${dataError ? 'text-amber-600' : 'text-emerald-600'}`} />{dataError ? 'Snapshot shown' : liveReport ? (liveReport.data_cache?.misses === 0 && (liveReport.data_cache?.hits ?? 0) > 0 ? 'Cached data' : 'Live data connected') : 'Refreshing data'}</>}</div><p className="text-[11px] leading-relaxed text-muted-foreground">{reportLoading ? 'Loading analytics for the selected date range.' : dataError ? 'The last validated snapshot is shown while BigQuery reconnects.' : liveReport ? <>{periodLabel} through {formatReportDate(liveReport.week_end ?? liveReport.report_date)}.{cacheStatusLine ? <> {cacheStatusLine}</> : null}</> : 'Reading the latest completed GA4 export…'}</p>{actions.length > 0 && <div className="mt-3 border-t border-border/70 pt-3"><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.1em] text-muted-foreground">Action log</p><ul className="space-y-2">{actions.slice(-4).reverse().map((action) => <li key={action.id} className="text-[11px] leading-snug text-muted-foreground"><span className="font-medium text-foreground">{action.status}</span> · {decodeDisplayText(action.title).slice(0, 42)}{action.title.length > 42 ? '…' : ''}</li>)}</ul></div>}</div>
        </aside>

        <section className="relative min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {dateRangeLoading ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center bg-background/60 pt-20 backdrop-blur-sm sm:pt-28">
              <div className="rounded-2xl border border-border/80 bg-card/95 px-8 py-10 shadow-[0_24px_80px_rgba(15,23,42,.12)]">
                <LogoLoader
                  size="lg"
                  label="Loading data for selected range"
                  description="Querying BigQuery for GA4 exports…"
                />
              </div>
            </div>
          ) : null}
          <div className={dateRangeLoading ? 'pointer-events-none opacity-50 transition-opacity' : 'transition-opacity'}>
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">{view === 'Overview' ? `${periodLabel} briefing` : view}</p>
              <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{view === 'Overview' ? 'Your commerce briefing' : view === 'Opportunities' ? 'Ranked revenue opportunities' : view === 'Monitor' ? 'Applied fixes & outcomes' : view === 'Products' ? 'Product friction & demand' : view === 'Recommendations AI' ? 'Recommendations AI' : view === 'Search' ? 'On-site search performance' : 'Conversion funnel'}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {view === 'Overview' ? (
                  <>Five questions: money left on the table, search demand, friction, hidden behavior, and what changed.{liveReport && <span className="ml-1 text-emerald-700">Live from BigQuery.</span>}</>
                ) : view === 'Monitor' ? (
                  <>Track before/after metrics for applied fixes. Close monitoring when a fix is validated or no longer needs watching — it stays in the log for learning.</>
                ) : view === 'Products' ? (
                  <>{periodLabel} · hidden behavior patterns and zero-stock pressure from product and inventory events.</>
                ) : view === 'Recommendations AI' ? (
                  <>{formatProductsWindowLabel(productsWindow)} · top sellers and basket affinities from purchase and cart events.</>
                ) : view === 'Search' ? (
                  <>{periodLabel} · GA4 search events grouped by query text. Compare searches vs. result views to spot unresolved intent.</>
                ) : view === 'Funnel' ? (
                  <>{periodLabel} · logged-in users only, deduplicated across export days in the range.</>
                ) : (
                  'Period-merged opportunities with learning-adjusted ranking.'
                )}
              </p>
              {view === 'Overview' && exportStatusLine ? (
                <p className="mt-1 text-xs text-muted-foreground">{exportStatusLine}</p>
              ) : null}
            </div>
          </div>

          {warningNotice && <output className="mb-5 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"><span className="flex items-center gap-2"><AlertTriangle className="size-4" />{warningNotice}</span><button className="text-xs font-semibold" onClick={() => setWarningNotice('')}>Close</button></output>}

          {notice && <output className="mb-5 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"><span className="flex items-center gap-2"><CheckCircle2 className="size-4" />{notice}</span><button className="text-xs font-semibold" onClick={() => setNotice('')}>Close</button></output>}

          {view === 'Overview' && (
            <>
            <HomeBriefing
              periodLabel={periodLabel}
              findings={findings}
              inspectableFindings={inspectableFindings}
              searches={searches}
              inventory={inventory}
              products={liveReport?.products ?? []}
              history={history}
              baselineReady={baselineReady}
              onSelectOpportunity={(id) => selectOpportunity(id, { openModal: true })}
              onNavigate={goTo}
              onHiddenSignal={handleHiddenSignal}
            />
            </>
          )}

          {view === 'Products' && (
            <div className="mb-7 space-y-5">
              {renderProductsHiddenBehavior()}

              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="text-base">Zero-stock pressure</CardTitle>
                  <CardDescription>
                    OOS messaging from <code className="text-[11px]">zero_stock_view</code> events, cross-checked with cart adds on the same SKU
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {inventory.length ? (
                    <>
                      <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_4rem_4.5rem] gap-3 border-b border-border/60 pb-2 text-[10px] font-semibold uppercase tracking-[.08em] text-muted-foreground">
                        <span>SKU</span>
                        <span className="text-right">OOS views</span>
                        <span className="text-right">Cart adds</span>
                        <span className="text-right">Signal</span>
                      </div>
                      {inventory.map((item) => (
                        <div key={item.item_id} className="grid grid-cols-[minmax(0,1fr)_4.5rem_4rem_4.5rem] gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{item.item_id}</p>
                            <p className="text-xs text-muted-foreground">{item.affected_users} users · {item.purchases} purchases</p>
                          </div>
                          <p className="self-center text-right text-sm font-semibold tabular-nums">{item.zero_stock_views}</p>
                          <p className={`self-center text-right text-sm tabular-nums ${item.cart_adds > 0 ? 'font-semibold text-amber-700' : 'text-muted-foreground'}`}>
                            {item.cart_adds}
                          </p>
                          <p className={`self-center text-right text-[11px] leading-snug ${item.oos_pattern === 'backorder_allowed' ? 'font-medium text-amber-700' : 'text-muted-foreground'}`}>
                            {oosPatternLabel(item.oos_pattern)}
                          </p>
                        </div>
                      ))}
                    </>
                  ) : <p className="text-sm text-muted-foreground">No zero-stock events in the latest export.</p>}
                </CardContent>
              </Card>
            </div>
          )}

          {view === 'Recommendations AI' && (
            <div className="mb-7 space-y-5">
              <Card className="border-border/80">
                <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">Top selling products</CardTitle>
                    <CardDescription>
                      {formatProductsWindowLabel(productsWindow)} · ranked by {topSellersSort === 'revenue' ? 'revenue' : topSellersSort === 'units' ? 'units sold' : 'orders'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1 rounded-lg bg-muted p-1">
                    {(['orders', 'revenue', 'units'] as const).map((sort) => (
                      <button
                        key={sort}
                        onClick={() => setTopSellersSort(sort)}
                        className={`rounded-md px-2.5 py-1 text-sm font-medium transition ${topSellersSort === sort ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                      >
                        {sort === 'revenue' ? 'Revenue' : sort === 'units' ? 'Units' : 'Orders'}
                      </button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {productsLoading && !topSellers.length ? (
                    <div className="flex justify-center py-8">
                      <LogoLoader size="md" label="Loading top sellers…" />
                    </div>
                  ) : topSellers.length ? (
                    <>
                      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_4.5rem_4.5rem] gap-3 border-b border-border/60 pb-2 text-xs font-semibold uppercase tracking-[.08em] text-muted-foreground sm:grid-cols-[minmax(0,1fr)_6.5rem_5.5rem_5.5rem]">
                        <span>Product</span>
                        <span className="text-right">Revenue</span>
                        <span className="text-right">Units</span>
                        <span className="text-right">Orders</span>
                      </div>
                      {topSellers.map((product, index) => (
                        <button
                          key={product.item_id}
                          type="button"
                          onClick={() => loadProductAffinities(product.item_id)}
                          className="grid w-full grid-cols-[minmax(0,1fr)_5.5rem_4.5rem_4.5rem] gap-3 border-b border-border/60 pb-3 text-left last:border-0 last:pb-0 hover:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_6.5rem_5.5rem_5.5rem]"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-muted-foreground">#{index + 1}</p>
                            <p className="truncate font-heading text-sm font-semibold sm:text-base">{decodeDisplayText(product.item_name) || product.item_id}</p>
                            <p className="truncate text-sm text-muted-foreground">{product.item_id}</p>
                          </div>
                          <p className={`self-center text-right text-sm tabular-nums ${topSellersSort === 'revenue' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                            {formatUsd(product.item_revenue_usd)}
                          </p>
                          <p className={`self-center text-right text-sm tabular-nums ${topSellersSort === 'units' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                            {product.units_sold.toLocaleString()}
                          </p>
                          <p className={`self-center text-right text-sm tabular-nums ${topSellersSort === 'orders' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                            {product.orders.toLocaleString()}
                          </p>
                        </button>
                      ))}
                    </>
                  ) : <p className="text-sm text-muted-foreground">No purchase rows in the selected date range.</p>}
                </CardContent>
              </Card>

              <Card ref={affinityExplorerRef} className="border-border/80 scroll-mt-24">
                <CardHeader>
                  <CardTitle className="text-lg">Product affinity explorer</CardTitle>
                  <CardDescription>Search by SKU or name · {formatProductsWindowLabel(productsWindow)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={productQuery}
                      onChange={(event) => setProductQuery(event.target.value)}
                      onKeyDown={(event) => { if (event.key === 'Enter') void searchProductsForAffinity(); }}
                      placeholder="Search SKU or product name…"
                      className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
                    />
                    <Button size="sm" disabled={productsLoading || productQuery.trim().length < 2} onClick={() => searchProductsForAffinity()}>
                      {productsLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
                      Search
                    </Button>
                  </div>

                  {productsError && <p className="text-sm text-rose-600">{productsError}</p>}

                  {productMatches.length > 0 && (
                    <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[.1em] text-muted-foreground">Matches</p>
                      <div className="space-y-2">
                        {productMatches.map((match) => (
                          <button
                            key={match.item_id}
                            type="button"
                            onClick={() => loadProductAffinities(match.item_id)}
                            className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left hover:bg-background"
                          >
                            <span className="min-w-0 truncate font-heading text-sm font-medium sm:text-base">{decodeDisplayText(match.item_name) || match.item_id}</span>
                            <span className="shrink-0 text-sm text-muted-foreground">{match.item_id}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {affinities && (
                    <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/[.03] p-4">
                      <div>
                        <p className="font-heading text-sm font-semibold sm:text-base">{decodeDisplayText(affinities.anchor_item_name) || affinities.anchor_item_id}</p>
                        <p className="text-sm text-muted-foreground">
                          {affinities.anchor_item_id} · {affinities.anchor_orders} orders · {affinities.anchor_cart_sessions} cart sessions
                          {' · '}{formatShortDate(affinities.start_date)}–{formatShortDate(affinities.end_date)}
                        </p>
                      </div>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[.1em] text-muted-foreground">Purchased together</p>
                          {affinities.purchased_together.length ? (
                            <ul className="space-y-2">
                              {affinities.purchased_together.map((row) => (
                                <li key={row.item_id} className="flex items-center justify-between gap-3 text-sm">
                                  <span className="min-w-0 truncate">{decodeDisplayText(row.item_name) || row.item_id}</span>
                                  <span className="shrink-0 text-sm text-muted-foreground">{row.co_occurrences} orders</span>
                                </li>
                              ))}
                            </ul>
                          ) : <p className="text-sm text-muted-foreground">No co-purchase pairs in this window.</p>}
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[.1em] text-muted-foreground">Carted in same session</p>
                          {affinities.cart_together.length ? (
                            <ul className="space-y-2">
                              {affinities.cart_together.map((row) => (
                                <li key={row.item_id} className="flex items-center justify-between gap-3 text-sm">
                                  <span className="min-w-0 truncate">{decodeDisplayText(row.item_name) || row.item_id}</span>
                                  <span className="shrink-0 text-sm text-muted-foreground">{row.co_occurrences} sessions</span>
                                </li>
                              ))}
                            </ul>
                          ) : <p className="text-sm text-muted-foreground">No same-session cart pairs in this window.</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {view === 'Search' && (
            <div className="mb-7 space-y-7">
              {renderOpportunityFeed()}

              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="text-base">Search terms</CardTitle>
                  <CardDescription>
                    {periodLabel}
                    {searchAttentionCount > 0
                      ? ` · ${searchAttentionCount} need${searchAttentionCount === 1 ? 's' : ''} attention (sorted first)`
                      : ' · ranked by search volume'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rankedSearches.length ? (
                    <>
                      <div className="hidden gap-3 border-b border-border/60 pb-2 text-[10px] font-semibold uppercase tracking-[.08em] text-muted-foreground lg:grid lg:grid-cols-[minmax(0,1.4fr)_7rem_4.5rem_4.5rem_5rem_5rem_4.5rem]">
                        <span>Term</span>
                        <span>Status</span>
                        <span className="text-right" title="Unique visitors for this query">Users</span>
                        <span className="text-right" title="GA4 search events">Searches</span>
                        <span className="text-right" title="GA4 view_search_results events">Result views</span>
                        <span className="text-right" title="GA4 search_no_results events">No-result</span>
                        <span className="text-right" title="Result views divided by searches">Match rate</span>
                      </div>
                      {rankedSearches.map((term) => {
                        const matchRate = searchMatchRate(term);
                        const rowClass = term.attention.level === 'critical'
                          ? 'rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-3'
                          : term.attention.level === 'warning'
                            ? 'rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-3'
                            : 'rounded-xl border border-transparent px-3 py-3';
                        const badgeClass = term.attention.level === 'critical'
                          ? 'border-rose-200 bg-rose-100 text-rose-900'
                          : term.attention.level === 'warning'
                            ? 'border-amber-200 bg-amber-100 text-amber-900'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800';

                        return (
                          <div
                            key={term.search_term}
                            className={`grid gap-2 lg:grid-cols-[minmax(0,1.4fr)_7rem_4.5rem_4.5rem_5rem_5rem_4.5rem] lg:items-center lg:gap-3 ${rowClass}`}
                            title={term.attention.reason}
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold">“{decodeDisplayText(term.search_term)}”</p>
                                <Badge variant="outline" className={`text-[10px] lg:hidden ${badgeClass}`}>
                                  {term.attention.label}
                                </Badge>
                              </div>
                              <p className="mt-0.5 text-[11px] text-muted-foreground lg:hidden">
                                {term.attention.reason}
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground lg:hidden">
                                {term.users} users · {term.searches} searches · {term.result_views} result views · {term.no_result_events} no-result
                              </p>
                            </div>
                            <div className="hidden lg:block">
                              <Badge variant="outline" className={`text-[10px] ${badgeClass}`}>
                                {term.attention.label}
                              </Badge>
                            </div>
                            <p className="text-right text-sm tabular-nums lg:text-xs">{term.users.toLocaleString()}</p>
                            <p className="text-right text-sm font-semibold tabular-nums lg:text-xs">{term.searches.toLocaleString()}</p>
                            <p className={`text-right text-sm tabular-nums lg:text-xs ${term.attention.level !== 'healthy' ? 'font-semibold text-foreground' : ''}`}>
                              {term.result_views.toLocaleString()}
                            </p>
                            <p className={`text-right text-sm tabular-nums lg:text-xs ${term.no_result_events > 0 ? 'font-semibold text-rose-700' : ''}`}>
                              {term.no_result_events.toLocaleString()}
                            </p>
                            <div className="flex items-center justify-end gap-2">
                              <Progress
                                value={matchRate}
                                className={`h-1.5 w-14 ${term.attention.level === 'critical' ? '[&>div]:bg-rose-500' : term.attention.level === 'warning' ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`}
                              />
                              <span className="w-8 text-right text-[10px] font-medium tabular-nums text-muted-foreground">{matchRate}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Search rows will appear once live report data loads.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-muted/20">
                <CardContent className="space-y-3 pt-5">
                  <p className="text-sm font-medium">What these columns mean</p>
                  <dl className="grid gap-3 text-xs leading-relaxed text-muted-foreground sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-foreground">Users</dt>
                      <dd>Unique visitors who searched this term at least once in the period (deduplicated).</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-foreground">Searches</dt>
                      <dd>How many times the GA4 <code className="text-[11px]">search</code> event fired for this term — one person searching repeatedly adds multiple rows.</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-foreground">Result views</dt>
                      <dd>How many <code className="text-[11px]">view_search_results</code> events fired — the site reported that a results page was shown. Zero does not always mean zero products; tracking may not have fired.</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-foreground">No-result events</dt>
                      <dd>How many <code className="text-[11px]">search_no_results</code> events fired — the site explicitly reported an empty result set. Zero only means that signal was never sent.</dd>
                    </div>
                  </dl>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Terms flagged <span className="font-medium text-rose-800">No results</span> or <span className="font-medium text-amber-800">Weak engagement</span> need attention first — validate on the live site before changing synonyms or ranking.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {view === 'Funnel' && weekMetrics && (
            <div className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {[
                { label: 'Logged-in users', value: weekMetrics.authenticated_users, detail: `Unique users with a GA4 user ID · ${periodLabel}` },
                { label: 'Product viewers', value: weekMetrics.authenticated_viewed_users, detail: `${(weekMetrics.authenticated_to_pdp_rate * 100).toFixed(1)}% of logged-in users reached a PDP` },
                { label: 'Cart users', value: weekMetrics.authenticated_cart_users, detail: `${(weekMetrics.authenticated_view_to_cart_rate * 100).toFixed(1)}% of viewers added to cart` },
                { label: 'Checkout users', value: weekMetrics.authenticated_checkout_users, detail: 'Logged-in users who began checkout' },
                { label: 'Purchasers', value: weekMetrics.authenticated_purchasers, detail: `${(weekMetrics.authenticated_checkout_conversion_rate * 100).toFixed(1)}% checkout → purchase` },
              ].map((step) => (
                <Card key={step.label} className="border-border/80"><CardHeader><CardDescription>{step.label}</CardDescription><CardTitle className="font-heading text-2xl font-semibold tabular-nums">{step.value.toLocaleString()}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{step.detail}</CardContent></Card>
              ))}
            </div>
          )}

          {view === 'Monitor' && (
            <div className="mb-7 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span><strong className="text-foreground">{pendingFixes.length}</strong> pending</span>
                  <span>·</span>
                  <span><strong className="text-foreground">{activelyMonitored.length}</strong> actively monitored</span>
                  <span>·</span>
                  <span><strong className="text-foreground">{appliedFixes.length}</strong> applied total</span>
                </div>
                <div className="flex gap-1 rounded-lg bg-muted p-1">
                  {(['pending', 'active', 'closed', 'all'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setMonitorFilter(filter)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition ${monitorFilter === filter ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                    >
                      {filter}{filter === 'pending' && pendingFixes.length ? ` (${pendingFixes.length})` : ''}
                    </button>
                  ))}
                </div>
              </div>

              {monitoredFixes.length ? (
                <div className="space-y-3">
                  {monitoredFixes.map((action) => {
                    const actionOutcome = outcomeForAction(action.id);
                    const monitoringActive = isMonitoringActive(action);
                    const busy = monitorBusyId === action.id || (actionBusy && selectedAction?.id === action.id);
                    const opportunity = opportunityById.get(action.opportunity_id);
                    const OpportunityIcon = opportunity ? categoryIcon[opportunity.category] : Activity;
                    const isPending = action.status === 'created';
                    return (
                      <Card key={action.id} className="border-border/80">
                        <CardHeader className="gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">{action.category}</Badge>
                              <Badge variant={isPending ? 'outline' : monitoringActive ? 'default' : 'outline'}>
                                {isPending ? 'Pending apply' : monitoringActive ? 'Monitoring' : 'Closed'}
                              </Badge>
                              {opportunity ? (
                                <>
                                  <Badge variant="outline">{opportunity.impact} impact</Badge>
                                  <span className="text-xs font-semibold text-foreground">{formatMoney(opportunity.estimated_monthly_revenue_usd)}</span>
                                </>
                              ) : null}
                            </div>
                            <CardTitle className="text-base leading-snug">
                              {decodeDisplayText(opportunity?.title ?? action.title)}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {isPending
                                ? `Created ${formatReportDate(action.created_at.slice(0, 10).replace(/-/g, ''))} · waiting for fix to be recorded`
                                : <>Applied {action.applied_at ? formatReportDate(action.applied_at.slice(0, 10).replace(/-/g, '')) : '—'}{' · '}Target: {action.target_metric.replace(/_/g, ' ')}</>}
                            </CardDescription>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            {isPending ? (
                              <Button
                                size="sm"
                                disabled={busy}
                                onClick={() => void applyAction(action.id)}
                              >
                                {busy ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                                Record fix applied
                              </Button>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => refreshMonitorOutcome(action.id)}
                                >
                                  {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Activity className="size-4" />}
                                  Refresh
                                </Button>
                                {monitoringActive ? (
                                  <Button size="sm" variant="outline" disabled={busy} onClick={() => closeMonitoring(action.id)}>
                                    Stop monitoring
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="outline" disabled={busy} onClick={() => reopenMonitoring(action.id)}>
                                    Resume monitoring
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="grid gap-4 pt-5 lg:grid-cols-2">
                          <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                            <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
                              <OpportunityIcon className="size-3.5" />
                              Opportunity
                            </p>
                            {opportunity ? (
                              <div className="space-y-3">
                                <div>
                                  <p className="text-sm leading-relaxed text-foreground">{decodeDisplayText(opportunity.problem)}</p>
                                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                    Likely cause: {decodeDisplayText(opportunity.likely_cause)}
                                  </p>
                                </div>
                                <div>
                                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[.1em] text-muted-foreground">Recommendation</p>
                                  <p className="text-sm leading-relaxed">{decodeDisplayText(action.recommendation || opportunity.recommendation)}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2 text-sm text-muted-foreground">
                                <p>This opportunity is not in the current period feed. Showing the logged action instead.</p>
                                <p className="leading-relaxed">{decodeDisplayText(action.recommendation)}</p>
                              </div>
                            )}
                          </div>

                          <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                            {isPending ? (
                              <>
                                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[.12em] text-muted-foreground">Waiting on apply</p>
                                <p className="text-sm text-muted-foreground">
                                  Make the recommended change in your commerce systems, then click <span className="font-medium text-foreground">Record fix applied</span> to start before/after monitoring on {action.target_metric.replace(/_/g, ' ')}.
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[.12em] text-muted-foreground">Fix outcome</p>
                                {actionOutcome ? (
                                  <div className="space-y-2">
                                    <p className="text-sm font-semibold">{verdictLabel(actionOutcome.verdict)}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {actionOutcome.target_metric.replace(/_/g, ' ')}: {actionOutcome.before_value?.toFixed(3) ?? '—'} → {actionOutcome.after_value?.toFixed(3) ?? '—'}
                                      {actionOutcome.delta_pct != null ? ` (${actionOutcome.delta_pct >= 0 ? '+' : ''}${(actionOutcome.delta_pct * 100).toFixed(1)}%)` : ''}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {actionOutcome.before_days} days before · {actionOutcome.after_days} days after apply
                                      {actionOutcome.measured_at ? ` · measured ${formatReportDate(actionOutcome.measured_at.slice(0, 10).replace(/-/g, ''))}` : ''}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No outcome measured yet. Refresh to pull the latest before/after window from BigQuery.</p>
                                )}
                                {!monitoringActive && action.monitoring_closed_at ? (
                                  <p className="mt-3 text-xs text-muted-foreground">
                                    Monitoring closed {formatReportDate(action.monitoring_closed_at.slice(0, 10).replace(/-/g, ''))}. Outcome history is kept for the learning loop.
                                  </p>
                                ) : null}
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-dashed border-border/80">
                  <CardContent className="py-10 text-center">
                    <p className="text-sm font-medium">
                      {monitorFilter === 'pending'
                        ? 'No pending manual actions yet'
                        : monitorFilter === 'all'
                          ? 'No applied fixes yet'
                          : `No ${monitorFilter} monitors yet`}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {monitorFilter === 'pending'
                        ? 'Create a manual action from an opportunity. It will appear here until you record the fix as applied.'
                        : 'Create a manual action, then record the fix applied to start tracking before/after metrics here.'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {showOpportunityFeed && renderOpportunityFeed()}

          <OpportunityDrawer
            open={overviewModalOpen}
            onOpenChange={setOverviewModalOpen}
            opportunities={inspectableFindings}
            selectedId={selectedId}
            onSelectOpportunity={(id) => selectOpportunity(id)}
            panelProps={{
              selected,
              dayCount: (selected as WeekOpportunity).day_count,
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
              monitoringActive: selectedAction ? isMonitoringActive(selectedAction) : false,
              onInvestigate: () => void runExplain(selected.id),
              onUpdateStatus: updateStatus,
              onRefreshOutcome: refreshMonitorOutcome,
              onCloseMonitoring: closeMonitoring,
              onReopenMonitoring: reopenMonitoring,
              onGoToMonitor: () => {
                setOverviewModalOpen(false);
                goTo('Monitor', { monitorFilter: selectedAction?.status === 'created' ? 'pending' : 'active' });
              },
            }}
          />
          <BriefingSignalModal
            open={briefingSignalModalOpen}
            onOpenChange={setBriefingSignalModalOpen}
            title={briefingSignalModal?.title ?? ''}
            detail={briefingSignalModal?.detail ?? ''}
            badge={briefingSignalModal?.badge}
            severity={briefingSignalModal?.severity}
            analysis={briefingSignalModal?.analysis}
            suggestion={briefingSignalModal?.suggestion}
            actionLabel={briefingSignalModal?.actionLabel}
            onAction={briefingSignalModal?.onAction}
          />
          </div>
        </section>
      </div>
    </main>
  );
}
