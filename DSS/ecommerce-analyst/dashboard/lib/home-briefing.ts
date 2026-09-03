import type { Opportunity } from '@/lib/opportunities';
import { classifySearchTerm, sortSearchTermsByAttention, type SearchTermRow } from '@/lib/search-attention';
import { decodeDisplayText } from '@/lib/text';

export type HistoryDay = {
  report_date: string;
  revenue_usd: number;
  purchases: number;
  sessions: number;
  view_to_cart_rate: number;
  checkout_conversion_rate: number;
};

export type InventoryRow = {
  item_id: string;
  zero_stock_views: number;
  affected_users: number;
  cart_adds: number;
  oos_pattern: 'backorder_allowed' | 'oos_messaging_only';
};

export type ProductRow = {
  item_id: string;
  item_name: string;
  views: number;
  adds: number;
  add_rate: number;
  zero_stock_views?: number;
  oos_users?: number;
  oos_pattern?: 'backorder_allowed' | 'oos_messaging_only' | null;
};

export type PeriodDelta = {
  label: string;
  current: number;
  previous: number;
  deltaPct: number | null;
  format: 'currency' | 'percent' | 'count';
  significant: boolean;
};

export type FrictionSignal = {
  id: string;
  category: 'Search' | 'Inventory' | 'Funnel' | 'Anomaly';
  title: string;
  detail: string;
  severity: 'high' | 'medium';
  itemId?: string;
};

export type HiddenSignal = {
  id: string;
  title: string;
  detail: string;
  kind: 'product' | 'inventory' | 'search';
  itemId?: string;
  searchTerm?: string;
};

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

export function computePeriodDeltas(history: HistoryDay[]): PeriodDelta[] {
  if (history.length < 4) return [];
  const mid = Math.floor(history.length / 2);
  const first = history.slice(0, mid);
  const second = history.slice(mid);
  if (!first.length || !second.length) return [];

  const specs: Array<Omit<PeriodDelta, 'current' | 'previous' | 'deltaPct' | 'significant'> & {
    pick: (day: HistoryDay) => number;
    threshold: number;
  }> = [
    { label: 'Revenue', format: 'currency', pick: (day) => day.revenue_usd, threshold: 0.15 },
    { label: 'Purchases', format: 'count', pick: (day) => day.purchases, threshold: 0.15 },
    { label: 'View → cart', format: 'percent', pick: (day) => day.view_to_cart_rate, threshold: 0.1 },
    { label: 'Sessions', format: 'count', pick: (day) => day.sessions, threshold: 0.15 },
  ];

  return specs.map((spec) => {
    const current = average(second.map(spec.pick));
    const previous = average(first.map(spec.pick));
    const change = deltaPct(current, previous);
    return {
      label: spec.label,
      format: spec.format,
      current,
      previous,
      deltaPct: change,
      significant: change != null && Math.abs(change) >= spec.threshold,
    };
  });
}

export function totalMonthlyRevenueAtRisk(opportunities: Opportunity[]): number | null {
  const total = opportunities.reduce((sum, item) => sum + (item.estimated_monthly_revenue_usd ?? 0), 0);
  return total > 0 ? total : null;
}

export function buildFrictionSignals(
  opportunities: Opportunity[],
  searches: SearchTermRow[],
  inventory: InventoryRow[],
  viewToCartRate: number | null,
): FrictionSignal[] {
  const signals: FrictionSignal[] = [];

  const searchIssues = searches.filter((term) => classifySearchTerm(term).needsAttention);
  if (searchIssues.length) {
    const top = searchIssues[0];
    signals.push({
      id: 'friction-search',
      category: 'Search',
      title: `${searchIssues.length} search term${searchIssues.length === 1 ? '' : 's'} need attention`,
      detail: `Top: “${top.search_term}” · ${top.searches} searches · ${top.result_views} result views`,
      severity: searchIssues.some((term) => term.no_result_events > 0 || term.result_views === 0) ? 'high' : 'medium',
    });
  }

  const inventoryHits = inventory.filter((row) => row.zero_stock_views >= 3);
  if (inventoryHits.length) {
    const top = inventoryHits[0];
    signals.push({
      id: 'friction-inventory',
      category: 'Inventory',
      title: `${inventoryHits.length} SKU${inventoryHits.length === 1 ? '' : 's'} with zero-stock friction`,
      detail: `${top.item_id} · ${top.zero_stock_views} OOS views · ${top.affected_users} users`,
      severity: top.cart_adds > 0 ? 'high' : 'medium',
      itemId: top.item_id,
    });
  }

  if (viewToCartRate != null && viewToCartRate < 0.2) {
    signals.push({
      id: 'friction-funnel',
      category: 'Funnel',
      title: 'Weak view-to-cart progression',
      detail: `${(viewToCartRate * 100).toFixed(1)}% of product viewers added to cart in this period`,
      severity: viewToCartRate < 0.12 ? 'high' : 'medium',
    });
  }

  for (const opportunity of opportunities.filter((item) => item.category === 'Anomaly')) {
    signals.push({
      id: opportunity.id,
      category: 'Anomaly',
      title: opportunity.title,
      detail: opportunity.problem,
      severity: 'high',
    });
  }

  return signals;
}

export function resolveFrictionOpportunity(signal: FrictionSignal, findings: Opportunity[]): Opportunity | undefined {
  if (signal.category === 'Anomaly') {
    return findings.find((finding) => finding.id === signal.id);
  }
  if (signal.category === 'Inventory') {
    if (signal.itemId) {
      return findings.find((finding) => finding.category === 'Inventory' && finding.metrics.item_id === signal.itemId)
        ?? findings.find((finding) => finding.category === 'Inventory');
    }
    return findings.find((finding) => finding.category === 'Inventory');
  }
  if (signal.category === 'Search') {
    return findings.find((finding) => finding.category === 'Search');
  }
  if (signal.category === 'Funnel') {
    return findings.find((finding) => finding.category === 'Funnel' && !finding.metrics.item_id)
      ?? findings.find((finding) => finding.category === 'Funnel');
  }
  return undefined;
}

export function frictionOpensOpportunity(signal: FrictionSignal, findings: Opportunity[]) {
  return Boolean(resolveFrictionOpportunity(signal, findings));
}

export function frictionActionLabel(signal: FrictionSignal, findings: Opportunity[]) {
  return frictionOpensOpportunity(signal, findings) ? 'Inspect →' : 'No ranked match yet';
}

export function buildHiddenSignals(
  products: ProductRow[],
  inventory: InventoryRow[],
  searches: SearchTermRow[],
  limit = 5,
): HiddenSignal[] {
  const signals: HiddenSignal[] = [];

  const lowConvert = [...products]
    .filter((product) => product.views >= 8 && product.add_rate < 0.12)
    .sort((left, right) => right.views - left.views)
    .slice(0, limit);
  for (const product of lowConvert) {
    const inv = inventory.find((row) => row.item_id === product.item_id);
    const zeroStockViews = Math.max(Number(product.zero_stock_views ?? 0), Number(inv?.zero_stock_views ?? 0));
    const outOfStock = zeroStockViews > 0;
    signals.push({
      id: `hidden-product-${product.item_id}`,
      kind: 'product',
      itemId: product.item_id,
      title: outOfStock
        ? `${product.item_id} gets views but rarely carts — out of stock`
        : `${product.item_id} gets views but rarely carts`,
      detail: outOfStock
        ? `${product.views} views · ${(product.add_rate * 100).toFixed(1)}% add rate · ${zeroStockViews} OOS views`
        : `${product.views} views · ${(product.add_rate * 100).toFixed(1)}% add rate`,
    });
  }

  for (const row of inventory.filter((item) => item.cart_adds > 0 && item.zero_stock_views >= 3).slice(0, limit)) {
    signals.push({
      id: `hidden-oos-${row.item_id}`,
      kind: 'inventory',
      itemId: row.item_id,
      title: `Demand on unavailable ${row.item_id}`,
      detail: `${row.zero_stock_views} OOS views but ${row.cart_adds} cart adds still fired`,
    });
  }

  const repeatSearches = searches
    .filter((term) => term.users >= 1 && term.searches >= term.users * 3 && term.searches >= 5)
    .sort((left, right) => right.searches - left.searches)
    .slice(0, limit);
  for (const repeatSearch of repeatSearches) {
    signals.push({
      id: `hidden-repeat-${repeatSearch.search_term}`,
      kind: 'search',
      searchTerm: repeatSearch.search_term,
      title: `Repeat search intent on “${repeatSearch.search_term}”`,
      detail: `${repeatSearch.searches} searches from ${repeatSearch.users} user${repeatSearch.users === 1 ? '' : 's'} — possible unresolved need`,
    });
  }

  return signals.slice(0, limit);
}

function sameSearchTerm(left: string, right: string) {
  return decodeDisplayText(left).trim().toLowerCase() === decodeDisplayText(right).trim().toLowerCase();
}

export function resolveHiddenOpportunity(signal: HiddenSignal, findings: Opportunity[]): Opportunity | undefined {
  if (signal.kind === 'product' && signal.itemId) {
    return findings.find((finding) => finding.category === 'Funnel' && finding.metrics.item_id === signal.itemId);
  }

  if (signal.kind === 'inventory' && signal.itemId) {
    return findings.find((finding) => finding.category === 'Inventory' && finding.metrics.item_id === signal.itemId);
  }

  if (signal.kind === 'search' && signal.searchTerm) {
    return findings.find((finding) => (
      finding.category === 'Search'
      && typeof finding.metrics.search_term === 'string'
      && sameSearchTerm(String(finding.metrics.search_term), signal.searchTerm!)
    ));
  }

  return undefined;
}

export function hiddenOpensOpportunity(signal: HiddenSignal, findings: Opportunity[]) {
  return Boolean(resolveHiddenOpportunity(signal, findings));
}

export function hiddenActionLabel(signal: HiddenSignal, findings: Opportunity[]) {
  return hiddenOpensOpportunity(signal, findings) ? 'Inspect →' : 'No ranked match yet';
}

export function rankedSearchDemand(searches: SearchTermRow[], limit = 5) {
  return sortSearchTermsByAttention(searches).slice(0, limit);
}

export function resolveSearchDemandOpportunity(
  searchTerm: string,
  findings: Opportunity[],
): Opportunity | undefined {
  return findings.find((finding) => (
    finding.category === 'Search'
    && typeof finding.metrics.search_term === 'string'
    && sameSearchTerm(String(finding.metrics.search_term), searchTerm)
  ));
}

export function searchDemandOpensOpportunity(searchTerm: string, findings: Opportunity[]) {
  return Boolean(resolveSearchDemandOpportunity(searchTerm, findings));
}

export function formatDelta(value: number | null, format: PeriodDelta['format']) {
  if (value == null) return '—';
  if (format === 'currency') {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(0)}%`;
  }
  if (format === 'percent') {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(1)} pp`;
  }
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(0)}%`;
}

export function formatMetricValue(value: number, format: PeriodDelta['format']) {
  if (format === 'currency') {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  }
  if (format === 'percent') return `${(value * 100).toFixed(1)}%`;
  return Math.round(value).toLocaleString();
}
