import { decodeDisplayText } from '@/lib/text';
import { sortSearchTermsByAttention } from '@/lib/search-attention';

export type Opportunity = {
  id: string;
  category: 'Inventory' | 'Search' | 'Funnel' | 'Anomaly' | 'Landing' | 'Taxonomy' | 'Acquisition';
  title: string;
  problem: string;
  likely_cause: string;
  evidence: string[];
  recommendation: string;
  confidence: number;
  date: string;
  estimated_monthly_revenue_usd: number | null;
  impact: 'High' | 'Medium' | 'Low';
  status: 'Open';
  metrics: Record<string, string | number | null>;
};

function sanitizeOpportunity(opportunity: Opportunity): Opportunity {
  const metrics = { ...opportunity.metrics };
  if (metrics.search_term != null) {
    metrics.search_term = decodeDisplayText(String(metrics.search_term));
  }
  return {
    ...opportunity,
    title: decodeDisplayText(opportunity.title),
    problem: decodeDisplayText(opportunity.problem),
    likely_cause: decodeDisplayText(opportunity.likely_cause),
    recommendation: decodeDisplayText(opportunity.recommendation),
    evidence: opportunity.evidence.map(decodeDisplayText),
    metrics,
  };
}

export type ReportInput = {
  report_date: string;
  revenue_usd: number;
  purchases: number;
  sessions: number;
  viewed_users: number;
  cart_users: number;
  checkout_users: number;
  purchasers: number;
  view_to_cart_rate: number;
  inventory: Array<{
    item_id: string;
    zero_stock_views: number;
    affected_users: number;
    cart_adds: number;
    cart_users: number;
    purchases: number;
    oos_pattern: 'backorder_allowed' | 'oos_messaging_only';
  }>;
  searches: Array<{
    search_term: string;
    searches: number;
    result_views: number;
    no_result_events: number;
    users: number;
  }>;
  products?: Array<{
    item_id: string;
    item_name: string;
    views: number;
    adds: number;
    add_rate: number;
    zero_stock_views?: number;
    oos_users?: number;
    oos_pattern?: 'backorder_allowed' | 'oos_messaging_only' | null;
  }>;
  history: Array<{
    report_date: string;
    sessions: number;
    revenue_usd: number;
    view_to_cart_rate: number;
  }>;
};

const BASELINE_READY_PRIOR_DAYS = 6;
const REVENUE_ANOMALY_THRESHOLD = 0.2;
const FUNNEL_ANOMALY_THRESHOLD = 0.15;
const INVENTORY_RECOVERY_RATE = 0.2;
const INVENTORY_BACKORDER_RECOVERY_RATE = 0.05;
const SEARCH_RECOVERY_RATE = 0.1;
const FUNNEL_RECOVERY_OF_NON_CART = 0.02;
const FUNNEL_REVENUE_SHARE_CAP = 0.15;

function impactFromRevenue(monthly: number | null): Opportunity['impact'] {
  if (monthly == null) return 'Medium';
  if (monthly >= 5000) return 'High';
  if (monthly >= 1000) return 'Medium';
  return 'Low';
}

function averageOrderValue(revenue: number, purchases: number) {
  if (purchases <= 0 || revenue <= 0) return null;
  return revenue / purchases;
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'term';
}

export function searchOpportunityId(searchTerm: string) {
  return `search-${slug(searchTerm)}`;
}

export function inventoryOpportunityId(itemId: string) {
  return `inventory-${itemId}`;
}

export function productOpportunityId(itemId: string) {
  return `product-${itemId}`;
}

/** UI label for opportunity type — SKU view→cart leaks read as Product, not Funnel. */
export function opportunityDisplayLabel(opportunity: Opportunity) {
  if (opportunity.category === 'Funnel' && opportunity.metrics.item_id) return 'Product';
  if (opportunity.category === 'Taxonomy') {
    return opportunity.metrics.dimension === 'category' ? 'Category' : 'Brand';
  }
  return opportunity.category;
}

/** True when GA4 zero_stock_view (or merged metrics) indicate the SKU showed as unavailable. */
export function opportunityShowsOutOfStock(opportunity: Opportunity) {
  if (Number(opportunity.metrics.out_of_stock) === 1) return true;
  if ((Number(opportunity.metrics.zero_stock_views) || 0) > 0) return true;
  return false;
}

const PRODUCT_FUNNEL_RECOVERY_RATE = 0.08;

function mean(values: Array<number | null>) {
  const present = values.filter((value): value is number => value != null);
  if (!present.length) return null;
  return present.reduce((sum, value) => sum + value, 0) / present.length;
}

/** Mirror of Python `detect_opportunities` for the dashboard API. */
export function detectOpportunities(report: ReportInput, limit?: number) {
  const date = report.report_date;
  const aov = averageOrderValue(report.revenue_usd, report.purchases);
  const history = [...report.history].sort((a, b) => a.report_date.localeCompare(b.report_date));
  const prior = history.filter((day) => day.report_date < date).slice(-7);
  const baselineReady = prior.length >= BASELINE_READY_PRIOR_DAYS;

  const ranked = [
    ...inventoryOpportunities(date, report.inventory, aov),
    ...searchOpportunities(date, report.searches, aov),
    ...productOpportunities(date, report.products ?? [], aov, report.inventory),
    ...funnelOpportunities(date, report, aov),
    ...baselineOpportunities(date, history, prior, baselineReady),
  ]
    .sort((a, b) => {
      const revenueDelta = (b.estimated_monthly_revenue_usd ?? -1) - (a.estimated_monthly_revenue_usd ?? -1);
      if (revenueDelta !== 0) return revenueDelta;
      return b.confidence - a.confidence;
    });
  const opportunities = (limit ? ranked.slice(0, limit) : ranked).map(sanitizeOpportunity);

  return {
    baseline_days: prior.length,
    baseline_ready: baselineReady,
    site_aov_usd: aov == null ? null : Math.round(aov * 100) / 100,
    opportunity_count: opportunities.length,
    opportunities,
    notes: [
      'Opportunities are generated by deterministic detectors; no model was invoked.',
      'Estimated monthly revenue assumes the observed daily pattern persists for 30 days.',
      'Multi-day ranges average daily estimates per opportunity (they are not summed).',
      'Recovery rates are conservative placeholders until experiment results exist.',
      baselineReady
        ? 'Baseline anomaly detection is active.'
        : `Baseline anomaly detection activates after ${BASELINE_READY_PRIOR_DAYS} prior daily exports.`,
    ],
  };
}

function buildInventoryOpportunity(
  date: string,
  top: ReportInput['inventory'][number],
  aov: number | null,
): Opportunity | null {
  if (!top || top.item_id === '(unidentified)') return null;
  if (top.zero_stock_views < 3 || top.affected_users < 1) return null;

  const backorderAllowed = top.oos_pattern === 'backorder_allowed' || top.cart_adds > 0;
  const recoveryRate = backorderAllowed ? INVENTORY_BACKORDER_RECOVERY_RATE : INVENTORY_RECOVERY_RATE;
  const monthly = aov == null
    ? null
    : Math.round(top.affected_users * aov * recoveryRate * 30 * 100) / 100;

  const title = backorderAllowed
    ? `OOS messaging on ${top.item_id}, but cart adds still occur`
    : `Demand is hitting unavailable ${top.item_id}`;

  const problem = backorderAllowed
    ? `${top.affected_users} users saw ${top.zero_stock_views} zero-stock messages for ${top.item_id}, while ${top.cart_adds} add-to-cart events still fired for the same SKU.`
    : `${top.affected_users} buyers encountered ${top.zero_stock_views} zero-stock views for ${top.item_id}.`;

  const likelyCause = backorderAllowed
    ? 'The storefront shows out-of-stock messaging but still allows backorder/cart adds — friction may appear later in checkout or fulfillment.'
    : 'Shoppers are reaching products that show as unavailable on the PDP.';

  const recommendation = backorderAllowed
    ? 'Clarify backorder/availability on PDP and cart. Track checkout completion and post-order cancellations for this SKU; consider separate oos_add_to_cart tagging.'
    : 'Confirm replenishment timing. If inventory cannot be restored, surface compatible in-stock alternatives on the PDP and in search.';

  const evidence = [
    `${top.item_id} · ${top.zero_stock_views} zero-stock views`,
    `${top.affected_users} users saw OOS messaging`,
    ...(backorderAllowed
      ? [`${top.cart_adds} add-to-cart events on the same SKU`, `${top.purchases} purchase line(s) in the period`]
      : []),
  ];

  return {
    id: inventoryOpportunityId(top.item_id),
    category: 'Inventory',
    title,
    problem,
    likely_cause: likelyCause,
    evidence,
    recommendation,
    confidence: backorderAllowed ? (top.affected_users >= 3 ? 0.8 : 0.68) : (top.affected_users >= 3 ? 0.86 : 0.72),
    date,
    estimated_monthly_revenue_usd: monthly,
    impact: impactFromRevenue(monthly),
    status: 'Open',
    metrics: {
      item_id: top.item_id,
      zero_stock_views: top.zero_stock_views,
      affected_users: top.affected_users,
      cart_adds: top.cart_adds,
      cart_users: top.cart_users,
      purchases: top.purchases,
      oos_pattern: top.oos_pattern,
      recovery_rate: recoveryRate,
    },
  };
}

function inventoryOpportunities(
  date: string,
  inventory: ReportInput['inventory'],
  aov: number | null,
): Opportunity[] {
  const candidates = inventory.filter((row) => row.zero_stock_views >= 3 && row.affected_users >= 1);
  return candidates
    .slice(0, 3)
    .map((row) => buildInventoryOpportunity(date, row, aov))
    .filter((row): row is Opportunity => row != null);
}

function buildSearchOpportunity(
  date: string,
  row: ReportInput['searches'][number],
  aov: number | null,
  options?: { repeatIntent?: boolean; demandHealthy?: boolean },
): Opportunity {
  const monthly = aov == null || options?.demandHealthy
    ? null
    : Math.round(row.users * aov * SEARCH_RECOVERY_RATE * 30 * 100) / 100;
  const repeatIntent = options?.repeatIntent ?? (row.searches >= row.users * 3 && row.searches >= 5);

  if (options?.demandHealthy) {
    return {
      id: searchOpportunityId(row.search_term),
      category: 'Search',
      title: `Customers are searching for “${row.search_term}”`,
      problem: `${row.users} user${row.users === 1 ? '' : 's'} searched “${row.search_term}” ${row.searches} times with solid result engagement.`,
      likely_cause: 'High-demand query — protect ranking, synonyms, and in-stock coverage so supply keeps up with intent.',
      evidence: [
        `${row.searches} searches from ${row.users} journey${row.users === 1 ? '' : 's'}`,
        `${row.result_views} result-view and ${row.no_result_events} no-result events observed`,
      ],
      recommendation: 'Confirm top results match intent; keep key SKUs discoverable and in stock for this demand.',
      confidence: 0.62,
      date,
      estimated_monthly_revenue_usd: monthly,
      impact: impactFromRevenue(monthly),
      status: 'Open',
      metrics: {
        search_term: row.search_term,
        searches: row.searches,
        result_views: row.result_views,
        no_result_events: row.no_result_events,
        users: row.users,
        recovery_rate: SEARCH_RECOVERY_RATE,
      },
    };
  }

  return {
    id: searchOpportunityId(row.search_term),
    category: 'Search',
    title: repeatIntent
      ? `Repeat search intent on “${row.search_term}”`
      : `“${row.search_term}” shows unresolved intent`,
    problem: repeatIntent
      ? `${row.searches} searches from ${row.users} user${row.users === 1 ? '' : 's'} — possible unresolved need on “${row.search_term}”.`
      : `${row.users} buyer${row.users === 1 ? '' : 's'} searched “${row.search_term}” ${row.searches} times with weak result engagement.`,
    likely_cause: 'Search ranking, synonyms, or result-view tracking may be failing for this query.',
    evidence: [
      `${row.searches} searches from ${row.users} journey${row.users === 1 ? '' : 's'}`,
      `${row.result_views} result-view and ${row.no_result_events} no-result events observed`,
    ],
    recommendation: 'Test this query in production, review matching products and synonyms, and verify result-view tracking carries the search term.',
    confidence: row.result_views === 0 ? 0.78 : 0.7,
    date,
    estimated_monthly_revenue_usd: monthly,
    impact: impactFromRevenue(monthly),
    status: 'Open',
    metrics: {
      search_term: row.search_term,
      searches: row.searches,
      result_views: row.result_views,
      no_result_events: row.no_result_events,
      users: row.users,
      recovery_rate: SEARCH_RECOVERY_RATE,
    },
  };
}

function searchOpportunities(
  date: string,
  searches: ReportInput['searches'],
  aov: number | null,
): Opportunity[] {
  const unresolved = searches.filter((row) => (
    row.search_term
    && row.searches >= 5
    && row.users >= 1
    && !(row.result_views > 0 && row.result_views >= row.searches)
  ));
  const repeat = searches.filter((row) => (
    row.search_term
    && row.users >= 1
    && row.searches >= row.users * 3
    && row.searches >= 5
  ));

  const selected = new Map<string, ReportInput['searches'][number]>();
  if (unresolved.length) {
    const top = unresolved.reduce((best, row) => (
      row.searches > best.searches || (row.searches === best.searches && row.users > best.users) ? row : best
    ));
    selected.set(top.search_term, top);
  }
  for (const row of repeat.sort((left, right) => right.searches - left.searches).slice(0, 2)) {
    selected.set(row.search_term, row);
  }

  return [...selected.values()].map((row) => buildSearchOpportunity(
    date,
    row,
    aov,
    { repeatIntent: row.searches >= row.users * 3 && row.searches >= 5 },
  ));
}

function resolveProductStock(
  product: NonNullable<ReportInput['products']>[number],
  inventoryById: Map<string, ReportInput['inventory'][number]>,
) {
  const inv = inventoryById.get(product.item_id);
  const zeroStockViews = Math.max(Number(product.zero_stock_views ?? 0), Number(inv?.zero_stock_views ?? 0));
  const oosUsers = Math.max(Number(product.oos_users ?? 0), Number(inv?.affected_users ?? 0));
  const cartAdds = Math.max(Number(product.adds ?? 0), Number(inv?.cart_adds ?? 0));
  const oosPattern = product.oos_pattern
    ?? inv?.oos_pattern
    ?? (zeroStockViews > 0
      ? (cartAdds > 0 ? 'backorder_allowed' as const : 'oos_messaging_only' as const)
      : null);
  return {
    zeroStockViews,
    oosUsers,
    oosPattern,
    outOfStock: zeroStockViews > 0,
  };
}

function productOpportunities(
  date: string,
  products: NonNullable<ReportInput['products']>,
  aov: number | null,
  inventory: ReportInput['inventory'] = [],
): Opportunity[] {
  const inventoryById = new Map(inventory.map((row) => [row.item_id, row]));

  return [...products]
    .filter((product) => product.views >= 8 && product.add_rate < 0.12)
    .sort((left, right) => right.views - left.views)
    .slice(0, 3)
    .map((product) => {
      const stock = resolveProductStock(product, inventoryById);
      const monthly = aov == null
        ? null
        : Math.round(product.views * aov * PRODUCT_FUNNEL_RECOVERY_RATE * 30 * 100) / 100;

      if (stock.outOfStock) {
        const backorder = stock.oosPattern === 'backorder_allowed';
        return {
          id: productOpportunityId(product.item_id),
          category: 'Funnel' as const,
          title: `${product.item_id} gets views but rarely carts — out of stock`,
          problem: backorder
            ? `${product.views} product views and only ${(product.add_rate * 100).toFixed(1)}% add-to-cart on ${product.item_id}, while shoppers also hit ${stock.zeroStockViews} zero-stock messages (cart still allowed).`
            : `${product.views} product views and only ${(product.add_rate * 100).toFixed(1)}% add-to-cart on ${product.item_id} — GA4 recorded ${stock.zeroStockViews} zero-stock views for this SKU.`,
          likely_cause: backorder
            ? 'Availability messaging is conflicting: the PDP shows out of stock while add-to-cart still fires, which suppresses conversion and creates fulfillment risk.'
            : 'Demand is landing on an unavailable PDP — low cart rate is driven by stock, not lack of interest.',
          evidence: [
            `${product.item_id} · ${product.views} views`,
            `${product.adds} add-to-cart events`,
            `${(product.add_rate * 100).toFixed(1)}% add rate`,
            `${stock.zeroStockViews} zero-stock views${stock.oosUsers ? ` · ${stock.oosUsers} users` : ''}`,
            backorder ? 'OOS shown · cart still allowed' : 'Out of stock messaging on PDP',
          ],
          recommendation: backorder
            ? `Clarify availability for ${product.item_id} on the PDP and cart. If backorders are intentional, say so; otherwise block cart and surface in-stock alternatives.`
            : `Confirm replenishment for ${product.item_id}. Until stock returns, surface compatible in-stock alternatives on the PDP and in search.`,
          confidence: product.views >= 20 ? 0.82 : 0.74,
          date,
          estimated_monthly_revenue_usd: monthly,
          impact: impactFromRevenue(monthly),
          status: 'Open' as const,
          metrics: {
            item_id: product.item_id,
            item_name: product.item_name,
            views: product.views,
            adds: product.adds,
            add_rate: product.add_rate,
            recovery_rate: PRODUCT_FUNNEL_RECOVERY_RATE,
            zero_stock_views: stock.zeroStockViews,
            oos_users: stock.oosUsers,
            oos_pattern: stock.oosPattern,
            out_of_stock: 1,
          },
        };
      }

      return {
        id: productOpportunityId(product.item_id),
        category: 'Funnel' as const,
        title: `${product.item_id} gets views but rarely carts`,
        problem: `${product.views} product views but only ${(product.add_rate * 100).toFixed(1)}% add-to-cart on ${product.item_id}.`,
        likely_cause: 'PDP friction — pricing, stock messaging, imagery, or missing specs — rather than lack of demand.',
        evidence: [
          `${product.item_id} · ${product.views} views`,
          `${product.adds} add-to-cart events`,
          `${(product.add_rate * 100).toFixed(1)}% add rate`,
          'No zero-stock views detected for this SKU in the period',
        ],
        recommendation: `Review the PDP for ${product.item_id}: confirm price competitiveness, stock status, and key specs above the fold. Test clearer add-to-cart placement or stronger imagery.`,
        confidence: product.views >= 20 ? 0.74 : 0.66,
        date,
        estimated_monthly_revenue_usd: monthly,
        impact: impactFromRevenue(monthly),
        status: 'Open' as const,
        metrics: {
          item_id: product.item_id,
          item_name: product.item_name,
          views: product.views,
          adds: product.adds,
          add_rate: product.add_rate,
          recovery_rate: PRODUCT_FUNNEL_RECOVERY_RATE,
          zero_stock_views: 0,
          out_of_stock: 0,
        },
      };
    });
}

function funnelOpportunities(date: string, report: ReportInput, aov: number | null): Opportunity[] {
  const { viewed_users: viewed, cart_users: cart, checkout_users: checkout, purchasers, view_to_cart_rate: viewToCart, revenue_usd: dailyRevenue } = report;
  if (viewed < 50 || cart >= viewed) return [];
  const nonCart = viewed - cart;
  const cartToPurchase = cart ? purchasers / cart : 0;
  let monthly: number | null = null;
  if (aov != null && cartToPurchase > 0) {
    let raw = nonCart * FUNNEL_RECOVERY_OF_NON_CART * cartToPurchase * aov * 30;
    if (dailyRevenue > 0) raw = Math.min(raw, dailyRevenue * FUNNEL_REVENUE_SHARE_CAP * 30);
    monthly = Math.round(raw * 100) / 100;
  }
  return [{
    id: 'funnel-view-cart',
    category: 'Funnel',
    title: 'Product-view to cart is the largest funnel drop',
    problem: `Only ${cart} of ${viewed} product-viewing users added an item to cart.`,
    likely_cause: 'Friction after product discovery (availability, variants, pricing, or PDP clarity).',
    evidence: [
      `${viewed} product viewers`,
      `${cart} cart users`,
      `${checkout} checkout users`,
      `${purchasers} purchasing users`,
      `${(viewToCart * 100).toFixed(1)}% view-to-cart rate`,
    ],
    recommendation: 'Segment the drop by product, stock state, and search entry. Prioritize high-view products with low cart progression.',
    confidence: 0.74,
    date,
    estimated_monthly_revenue_usd: monthly,
    impact: impactFromRevenue(monthly),
    status: 'Open',
    metrics: {
      viewed_users: viewed,
      cart_users: cart,
      checkout_users: checkout,
      purchasers,
      view_to_cart_rate: viewToCart,
      assumed_recovery_of_non_cart: FUNNEL_RECOVERY_OF_NON_CART,
      revenue_share_cap: FUNNEL_REVENUE_SHARE_CAP,
    },
  }];
}

function baselineOpportunities(
  date: string,
  history: ReportInput['history'],
  prior: ReportInput['history'],
  baselineReady: boolean,
): Opportunity[] {
  if (!baselineReady) return [];
  const current = history.find((day) => day.report_date === date);
  if (!current || prior.length < BASELINE_READY_PRIOR_DAYS) return [];

  const opportunities: Opportunity[] = [];
  const currentRps = current.sessions ? current.revenue_usd / current.sessions : null;
  const priorRps = mean(prior.map((day) => (day.sessions ? day.revenue_usd / day.sessions : null)));
  if (currentRps != null && priorRps && priorRps > 0) {
    const delta = (currentRps - priorRps) / priorRps;
    if (delta <= -REVENUE_ANOMALY_THRESHOLD) {
      const monthly = Math.round(Math.abs(delta) * priorRps * current.sessions * 30 * 100) / 100;
      opportunities.push({
        id: 'anomaly-revenue-per-session',
        category: 'Anomaly',
        title: 'Revenue per session fell versus baseline',
        problem: `Revenue/session is ${Math.abs(delta * 100).toFixed(0)}% below the prior ${prior.length}-day average.`,
        likely_cause: 'Conversion, mix, or traffic-quality shift versus recent baseline.',
        evidence: [
          `Current revenue/session: ${currentRps.toFixed(2)}`,
          `Baseline revenue/session: ${priorRps.toFixed(2)}`,
          `Prior days used: ${prior.length}`,
        ],
        recommendation: 'Investigate device, source, funnel, and top products for the decline window.',
        confidence: 0.88,
        date,
        estimated_monthly_revenue_usd: monthly,
        impact: impactFromRevenue(monthly),
        status: 'Open',
        metrics: {
          current_revenue_per_session: currentRps,
          baseline_revenue_per_session: priorRps,
          delta,
          prior_days: prior.length,
        },
      });
    }
  }

  const priorVtc = mean(prior.map((day) => day.view_to_cart_rate));
  if (priorVtc && priorVtc > 0) {
    const delta = (current.view_to_cart_rate - priorVtc) / priorVtc;
    if (delta <= -FUNNEL_ANOMALY_THRESHOLD) {
      opportunities.push({
        id: 'anomaly-view-to-cart',
        category: 'Anomaly',
        title: 'View-to-cart rate deteriorated versus baseline',
        problem: `View-to-cart is ${Math.abs(delta * 100).toFixed(0)}% below the prior ${prior.length}-day average.`,
        likely_cause: 'PDP, availability, or merchandising friction increased.',
        evidence: [
          `Current view-to-cart: ${(current.view_to_cart_rate * 100).toFixed(1)}%`,
          `Baseline view-to-cart: ${(priorVtc * 100).toFixed(1)}%`,
          `Prior days used: ${prior.length}`,
        ],
        recommendation: 'Compare zero-stock views and top PDP performers against the baseline window.',
        confidence: 0.84,
        date,
        estimated_monthly_revenue_usd: null,
        impact: 'Medium',
        status: 'Open',
        metrics: {
          current_view_to_cart_rate: current.view_to_cart_rate,
          baseline_view_to_cart_rate: priorVtc,
          delta,
          prior_days: prior.length,
        },
      });
    }
  }
  return opportunities;
}

/** Period-level opportunities aligned with hidden-behavior detectors (not limited to top-ranked daily slice). */
export function hiddenAlignedOpportunities(
  date: string,
  searches: ReportInput['searches'],
  products: NonNullable<ReportInput['products']>,
  inventory: ReportInput['inventory'],
  aov: number | null,
): Opportunity[] {
  // Same top terms as Overview Search demand — always inspectable (healthy demand included).
  const attentionSearches = sortSearchTermsByAttention(searches)
    .slice(0, 5)
    .map((row) => buildSearchOpportunity(date, row, aov, {
      repeatIntent: row.searches >= row.users * 3 && row.searches >= 5,
      demandHealthy: !row.attention.needsAttention,
    }));

  const repeatSearches = searches
    .filter((term) => term.search_term && term.users >= 1 && term.searches >= term.users * 3 && term.searches >= 5)
    .sort((left, right) => right.searches - left.searches)
    .slice(0, 3)
    .map((row) => buildSearchOpportunity(date, row, aov, { repeatIntent: true }));

  const lowConvertProducts = productOpportunities(date, products, aov, inventory);
  const hiddenInventory = inventory
    .filter((row) => row.cart_adds > 0 && row.zero_stock_views >= 3)
    .slice(0, 2)
    .map((row) => buildInventoryOpportunity(date, row, aov))
    .filter((row): row is Opportunity => row != null);

  const byId = new Map<string, Opportunity>();
  for (const opportunity of [...attentionSearches, ...repeatSearches, ...lowConvertProducts, ...hiddenInventory]) {
    byId.set(opportunity.id, opportunity);
  }
  return [...byId.values()];
}

type LandingSignal = {
  landing_path: string;
  sessions: number;
  purchase_sessions: number;
  revenue_usd: number;
  purchase_rate: number;
  view_to_cart_rate: number | null;
  avg_engagement_sec: number | null;
  top_source: string | null;
  top_campaign: string | null;
};

type TaxonomySignal = {
  taxonomy_value: string;
  dimension: 'brand' | 'category';
  views: number;
  adds: number;
  purchases: number;
  item_revenue_usd: number;
  add_rate: number | null;
  conversion_rate: number | null;
};

type AcquisitionSignal = {
  source: string;
  medium: string;
  campaign: string;
  sessions: number;
  purchase_sessions: number;
  revenue_usd: number;
  purchase_rate: number;
};

/** High-traffic landings / weak categories / low-quality acquisition — period-level commerce signals. */
export function commerceSignalOpportunities(
  date: string,
  landings: LandingSignal[],
  categories: TaxonomySignal[],
  acquisition: AcquisitionSignal[],
  aov: number | null,
): Opportunity[] {
  const opportunities: Opportunity[] = [];

  const sitePurchaseRate = (() => {
    const sessions = landings.reduce((sum, row) => sum + row.sessions, 0);
    const purchases = landings.reduce((sum, row) => sum + row.purchase_sessions, 0);
    return sessions > 0 ? purchases / sessions : null;
  })();

  for (const row of [...landings]
    .filter((item) => item.sessions >= 20 && item.landing_path && item.landing_path !== '(unknown)')
    .sort((left, right) => right.sessions - left.sessions)
    .slice(0, 12)) {
    const weakVsSite = sitePurchaseRate != null && row.purchase_rate < sitePurchaseRate * 0.55;
    const absolutelyWeak = row.purchase_rate < 0.02 && row.sessions >= 30;
    if (!weakVsSite && !absolutelyWeak) continue;

    const lostSessions = Math.max(0, row.sessions - row.purchase_sessions);
    const monthly = aov == null
      ? null
      : Math.round(lostSessions * 0.03 * aov * 30 * 100) / 100;
    const pathLabel = row.landing_path.length > 64 ? `${row.landing_path.slice(0, 61)}…` : row.landing_path;

    opportunities.push(sanitizeOpportunity({
      id: `landing-${slug(row.landing_path)}`,
      category: 'Landing',
      title: `High traffic, low commerce quality on ${pathLabel}`,
      problem: `${row.sessions} sessions landed on ${pathLabel} with only ${(row.purchase_rate * 100).toFixed(1)}% purchasing`
        + (sitePurchaseRate != null ? ` (site avg ${(sitePurchaseRate * 100).toFixed(1)}%).` : '.'),
      likely_cause: 'Landing audience or page experience is weak for commerce — campaign mismatch, thin PDP entry, or low engagement.',
      evidence: [
        `${row.sessions} sessions · ${row.purchase_sessions} purchases`,
        `${(row.purchase_rate * 100).toFixed(1)}% purchase rate`,
        row.avg_engagement_sec != null ? `${row.avg_engagement_sec}s avg engagement` : 'Engagement n/a',
        row.top_source ? `Top source: ${row.top_source}` : 'Source n/a',
        row.top_campaign && row.top_campaign !== '(not set)' ? `Top campaign: ${row.top_campaign}` : null,
      ].filter((item): item is string => Boolean(item)),
      recommendation: `Audit ${pathLabel}: match campaign intent, strengthen above-the-fold commerce cues, and route high-intent traffic to stronger converting paths.`,
      confidence: row.sessions >= 50 ? 0.78 : 0.68,
      date,
      estimated_monthly_revenue_usd: monthly,
      impact: impactFromRevenue(monthly),
      status: 'Open',
      metrics: {
        landing_path: row.landing_path,
        sessions: row.sessions,
        purchase_sessions: row.purchase_sessions,
        purchase_rate: row.purchase_rate,
        avg_engagement_sec: row.avg_engagement_sec,
        top_source: row.top_source,
        top_campaign: row.top_campaign,
        revenue_usd: row.revenue_usd,
      },
    }));
  }

  // Brand taxonomy opportunities are intentionally skipped — category leaf signals only.
  for (const row of categories
    .filter((item) => {
      if (item.views < 25 || item.taxonomy_value === '(unknown)' || (item.add_rate ?? 1) >= 0.1) return false;
      const leaf = item.taxonomy_value.trim().toLowerCase();
      if (leaf === 'shop' || leaf === '(not set)') return false;
      return true;
    })
    .sort((left, right) => right.views - left.views)
    .slice(0, 8)) {
    const monthly = aov == null
      ? null
      : Math.round(row.views * (0.1 - (row.add_rate ?? 0)) * aov * 0.15 * 30 * 100) / 100;
    opportunities.push(sanitizeOpportunity({
      id: `taxonomy-category-${slug(row.taxonomy_value)}`,
      category: 'Taxonomy',
      title: `Category “${row.taxonomy_value}” gets views but rarely carts`,
      problem: `${row.views} views on category “${row.taxonomy_value}” with only ${((row.add_rate ?? 0) * 100).toFixed(1)}% add-to-cart.`,
      likely_cause: 'Category traffic is not progressing to cart — merchandising, filters, or PDP clarity.',
      evidence: [
        `${row.views} views · ${row.adds} adds · ${row.purchases} purchases`,
        `${((row.add_rate ?? 0) * 100).toFixed(1)}% add rate`,
        `$${row.item_revenue_usd.toLocaleString('en-US')} item revenue`,
      ],
      recommendation: `Review top SKUs in category “${row.taxonomy_value}”: stock, pricing, and PDP content; boost stronger converters in search and category pages.`,
      confidence: row.views >= 60 ? 0.76 : 0.66,
      date,
      estimated_monthly_revenue_usd: monthly,
      impact: impactFromRevenue(monthly),
      status: 'Open',
      metrics: {
        dimension: 'category',
        taxonomy_value: row.taxonomy_value,
        views: row.views,
        adds: row.adds,
        purchases: row.purchases,
        add_rate: row.add_rate,
        item_revenue_usd: row.item_revenue_usd,
      },
    }));
  }

  const siteAcqRate = (() => {
    const sessions = acquisition.reduce((sum, row) => sum + row.sessions, 0);
    const purchases = acquisition.reduce((sum, row) => sum + row.purchase_sessions, 0);
    return sessions > 0 ? purchases / sessions : null;
  })();

  for (const row of [...acquisition]
    .filter((item) => item.sessions >= 25)
    .sort((left, right) => right.sessions - left.sessions)
    .slice(0, 12)) {
    if (siteAcqRate == null || row.purchase_rate >= siteAcqRate * 0.5) continue;
    if (row.purchase_rate >= 0.03 && row.sessions < 80) continue;

    const monthly = aov == null
      ? null
      : Math.round((row.sessions - row.purchase_sessions) * 0.025 * aov * 30 * 100) / 100;
    const campaignBit = row.campaign && row.campaign !== '(not set)' ? ` / ${row.campaign}` : '';
    opportunities.push(sanitizeOpportunity({
      id: `acq-${slug(`${row.source}-${row.medium}-${row.campaign}`)}`,
      category: 'Acquisition',
      title: `${row.source} / ${row.medium}${campaignBit} drives traffic more than customers`,
      problem: `${row.sessions} sessions from ${row.source}/${row.medium} purchased at ${(row.purchase_rate * 100).toFixed(1)}% vs site ${(siteAcqRate * 100).toFixed(1)}%.`,
      likely_cause: 'Acquisition mix is optimized for volume, not commerce intent — landing/campaign mismatch or low-quality paid/referral traffic.',
      evidence: [
        `${row.sessions} sessions · ${row.purchase_sessions} purchases`,
        `${(row.purchase_rate * 100).toFixed(1)}% purchase rate`,
        `$${row.revenue_usd.toLocaleString('en-US')} revenue`,
      ],
      recommendation: `Reallocate or retarget ${row.source}/${row.medium}${campaignBit}: tighten landing alignment, pause low-intent placements, and measure purchasers not just sessions.`,
      confidence: row.sessions >= 80 ? 0.74 : 0.64,
      date,
      estimated_monthly_revenue_usd: monthly,
      impact: impactFromRevenue(monthly),
      status: 'Open',
      metrics: {
        source: row.source,
        medium: row.medium,
        campaign: row.campaign,
        sessions: row.sessions,
        purchase_sessions: row.purchase_sessions,
        purchase_rate: row.purchase_rate,
        revenue_usd: row.revenue_usd,
      },
    }));
  }

  return opportunities
    .sort((a, b) => (b.estimated_monthly_revenue_usd ?? -1) - (a.estimated_monthly_revenue_usd ?? -1))
    .slice(0, 10);
}
