import type { Opportunity } from '@/lib/opportunities';
import { getBigQueryConfig, runBigQuery, type BigQueryConfig } from '@/lib/bigquery';
import { writeInvestigationBrief } from '@/lib/analyst';
import { getProduct, searchCatalog, type ProductContext } from '@/lib/catalog';
import { ITEM_ID_FROM_EVENT_PARAMS } from '@/lib/inventory';
import { decodeDisplayText } from '@/lib/text';

export type InvestigationStep = {
  name: string;
  status: 'checked' | 'signal' | 'clear';
  summary: string;
  details?: string[];
};

export type ImpactMath = {
  label: string;
  formula: string;
  inputs: Array<{ label: string; value: string }>;
  result: string;
};

export type AutomationFix = {
  ready: boolean;
  headline: string;
  summary: string;
  steps: string[];
};

export type Investigation = {
  opportunity_id: string;
  category: Opportunity['category'];
  title: string;
  narrative: string;
  likely_cause: string;
  steps: InvestigationStep[];
  impact_math: ImpactMath | null;
  recommendation: string;
  confidence: number;
  product_context: ProductContext[];
  automation?: AutomationFix;
  source: 'deterministic-investigation' | 'groq-investigation';
};

function money(value: number | null | undefined) {
  if (value == null) return 'n/a';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function pct(value: number | null | undefined) {
  if (value == null) return 'n/a';
  return `${(value * 100).toFixed(1)}%`;
}

function escapeLiteral(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function buildImpactMath(opportunity: Opportunity, aov: number | null): ImpactMath | null {
  const monthly = opportunity.estimated_monthly_revenue_usd;
  if (monthly == null) return null;
  const m = opportunity.metrics;

  if (opportunity.category === 'Inventory') {
    return {
      label: 'Inventory recovery estimate',
      formula: 'affected users × AOV × 20% recovery × 30 days',
      inputs: [
        { label: 'Affected users', value: String(m.affected_users ?? '—') },
        { label: 'Site AOV', value: money(aov) },
        { label: 'Recovery rate', value: '20%' },
      ],
      result: `${money(monthly)}/mo`,
    };
  }
  if (opportunity.category === 'Search') {
    return {
      label: 'Search recovery estimate',
      formula: 'searching users × AOV × 10% recovery × 30 days',
      inputs: [
        { label: 'Users', value: String(m.users ?? '—') },
        { label: 'Site AOV', value: money(aov) },
        { label: 'Recovery rate', value: '10%' },
      ],
      result: `${money(monthly)}/mo`,
    };
  }
  if (opportunity.category === 'Funnel') {
    return {
      label: 'Funnel lift estimate',
      formula: 'non-cart viewers × 2% recovery × cart→purchase × AOV × 30 (capped at 15% of daily revenue run-rate)',
      inputs: [
        { label: 'Viewers', value: String(m.viewed_users ?? '—') },
        { label: 'Cart users', value: String(m.cart_users ?? '—') },
        { label: 'View→cart', value: pct(Number(m.view_to_cart_rate ?? 0)) },
        { label: 'Site AOV', value: money(aov) },
      ],
      result: `${money(monthly)}/mo`,
    };
  }
  if (opportunity.category === 'Anomaly') {
    return {
      label: 'Baseline gap estimate',
      formula: 'relative drop × baseline revenue/session × sessions × 30 days',
      inputs: [
        { label: 'Current RPS', value: String(m.current_revenue_per_session ?? '—') },
        { label: 'Baseline RPS', value: String(m.baseline_revenue_per_session ?? '—') },
        { label: 'Prior days', value: String(m.prior_days ?? '—') },
      ],
      result: `${money(monthly)}/mo`,
    };
  }
  return {
    label: 'Estimated monthly impact',
    formula: 'Detector estimate from observed daily pattern × 30',
    inputs: [],
    result: `${money(monthly)}/mo`,
  };
}

export async function investigateOpportunity(
  opportunity: Opportunity,
  options: { aov?: number | null; learning_context?: string } = {},
): Promise<Investigation> {
  const config = await getBigQueryConfig();
  const date = opportunity.date;
  const events = `\`${config.project}.${config.dataset}.events_*\``;
  const steps: InvestigationStep[] = [
    {
      name: 'Confirm detector signal',
      status: 'signal',
      summary: opportunity.problem,
      details: opportunity.evidence,
    },
  ];

  if (opportunity.category === 'Funnel') {
    steps.push(...await investigateFunnel(config, events, date));
    const itemId = String(opportunity.metrics.item_id ?? '').trim();
    if (itemId) {
      steps.push(...await investigateInventory(config, events, date, itemId));
    }
  } else if (opportunity.category === 'Inventory') {
    steps.push(...await investigateInventory(config, events, date, String(opportunity.metrics.item_id ?? '')));
  } else if (opportunity.category === 'Search') {
    steps.push(...await investigateSearch(config, events, date, String(opportunity.metrics.search_term ?? '')));
  } else if (opportunity.category === 'Landing' || opportunity.category === 'Acquisition' || opportunity.category === 'Taxonomy') {
    steps.push({
      name: 'Confirm commerce-signal detector',
      status: 'signal',
      summary: opportunity.problem,
      details: opportunity.evidence,
    });
    steps.push(...await investigateFunnel(config, events, date));
  } else {
    steps.push(...await investigateAnomaly(config, events, date));
  }

  const { productSteps, productContext } = await enrichWithCatalog(opportunity, steps);
  steps.push(...productSteps);

  steps.push({
    name: 'Estimate revenue impact',
    status: 'checked',
    summary: opportunity.estimated_monthly_revenue_usd == null
      ? 'Impact left qualitative until more baseline days exist.'
      : `Estimated ${money(opportunity.estimated_monthly_revenue_usd)}/mo if the daily pattern persists.`,
  });

  const impact_math = buildImpactMath(opportunity, options.aov ?? null);
  const fallback: Investigation = {
    opportunity_id: opportunity.id,
    category: opportunity.category,
    title: opportunity.title,
    narrative: buildNarrative(opportunity, steps),
    likely_cause: opportunity.likely_cause,
    steps,
    impact_math,
    recommendation: opportunity.recommendation,
    confidence: opportunity.confidence,
    product_context: productContext,
    source: 'deterministic-investigation',
  };

  try {
    const brief = await writeInvestigationBrief({
      opportunity,
      steps,
      impact_math,
      product_context: productContext,
      learning_context: options.learning_context,
    });
    if (!brief) return fallback;
    return {
      ...fallback,
      narrative: decodeDisplayText(brief.narrative),
      likely_cause: decodeDisplayText(brief.likely_cause),
      recommendation: decodeDisplayText(brief.recommendation),
      confidence: brief.confidence,
      source: 'groq-investigation',
    };
  } catch (error) {
    // Keep the deterministic brief if the model is unavailable.
    console.error('Groq investigation write-up failed', error instanceof Error ? error.message : error);
    return fallback;
  }
}

async function enrichWithCatalog(
  opportunity: Opportunity,
  steps: InvestigationStep[],
): Promise<{ productSteps: InvestigationStep[]; productContext: ProductContext[] }> {
  const skus = new Set<string>();
  const itemId = String(opportunity.metrics.item_id ?? '').trim();
  if (itemId) skus.add(itemId);

  for (const step of steps) {
    for (const detail of step.details ?? []) {
      const match = detail.match(/^([A-Za-z0-9][A-Za-z0-9._-]{2,})\s·/);
      if (match) skus.add(match[1]);
    }
  }

  const productContext: ProductContext[] = [];
  for (const sku of [...skus].slice(0, 5)) {
    try {
      const product = await getProduct(sku);
      if (product) productContext.push(product);
    } catch (error) {
      productContext.push({
        sku,
        name: null,
        manufacturer: null,
        detail_available: false,
        related: [],
        source: 'icm',
        warnings: [error instanceof Error ? error.message : 'Catalog lookup failed'],
      });
    }
  }

  let searchHits: ProductContext[] = [];
  if (opportunity.category === 'Search') {
    const term = String(opportunity.metrics.search_term ?? '').trim();
    if (term) {
      try {
        searchHits = await searchCatalog(term, 5);
      } catch {
        searchHits = [];
      }
    }
  }

  const productSteps: InvestigationStep[] = [];
  if (productContext.length) {
    productSteps.push({
      name: 'Enrich with ICM product context',
      status: 'checked',
      summary: `Loaded catalog identity/related context for ${productContext.length} SKU(s). ICM stock is not used (not loaded for this site).`,
      details: productContext.map((item) => {
        const related = item.related[0] ? ` · related: ${item.related[0].sku}` : '';
        const mfr = item.manufacturer ? ` · ${item.manufacturer}` : '';
        return `${item.sku}${item.name ? ` · ${item.name}` : ''}${mfr}${related}`;
      }),
    });
  } else if (skus.size) {
    productSteps.push({
      name: 'Enrich with ICM product context',
      status: 'checked',
      summary: 'Catalog enrichment is not configured or returned no product rows for these SKUs.',
      details: [...skus].slice(0, 5),
    });
  }

  if (opportunity.category === 'Search') {
    productSteps.push({
      name: 'Check catalog coverage for search term',
      status: searchHits.length ? 'checked' : 'signal',
      summary: searchHits.length
        ? `ICM catalog returned ${searchHits.length} hit(s) for “${opportunity.metrics.search_term}”.`
        : `ICM catalog returned no hits for “${opportunity.metrics.search_term}”.`,
      details: searchHits.map((item) => `${item.sku}${item.name ? ` · ${item.name}` : ''}${item.manufacturer ? ` · ${item.manufacturer}` : ''}`),
    });
  }

  if (!productSteps.length) {
    productSteps.push({
      name: 'Enrich with ICM product context',
      status: 'checked',
      summary: 'No SKU/search term available for catalog enrichment on this opportunity.',
    });
  }

  return { productSteps, productContext: [...productContext, ...searchHits] };
}

async function investigateFunnel(config: BigQueryConfig, events: string, date: string): Promise<InvestigationStep[]> {
  const products = await runBigQuery<{
    item_id: string;
    item_name: string;
    views: number;
    adds: number;
    add_rate: number;
  }>(config, `
    SELECT item.item_id AS item_id,
      ANY_VALUE(item.item_name) AS item_name,
      COUNTIF(event_name = 'view_item') AS views,
      COUNTIF(event_name = 'add_to_cart') AS adds,
      SAFE_DIVIDE(COUNTIF(event_name = 'add_to_cart'), COUNTIF(event_name = 'view_item')) AS add_rate
    FROM ${events}, UNNEST(items) AS item
    WHERE _TABLE_SUFFIX = '${date}'
      AND event_name IN ('view_item', 'add_to_cart')
    GROUP BY item_id
    HAVING views >= 8
    ORDER BY views DESC
    LIMIT 8
  `);

  const devices = await runBigQuery<{
    device: string;
    viewed_users: number;
    cart_users: number;
    view_to_cart_rate: number;
  }>(config, `
    WITH actors AS (
      SELECT COALESCE(NULLIF(user_id, ''), user_pseudo_id) AS actor_id,
        COALESCE(device.category, 'unknown') AS device,
        LOGICAL_OR(event_name = 'view_item') AS viewed,
        LOGICAL_OR(event_name = 'add_to_cart') AS added
      FROM ${events}
      WHERE _TABLE_SUFFIX = '${date}'
      GROUP BY actor_id, device
    )
    SELECT device,
      COUNTIF(viewed) AS viewed_users,
      COUNTIF(added) AS cart_users,
      SAFE_DIVIDE(COUNTIF(added), COUNTIF(viewed)) AS view_to_cart_rate
    FROM actors
    GROUP BY device
    ORDER BY viewed_users DESC
  `);

  const stock = await runBigQuery<{ zero_stock_users: number; zero_stock_views: number }>(config, `
    SELECT COUNT(DISTINCT COALESCE(NULLIF(user_id, ''), user_pseudo_id)) AS zero_stock_users,
      COUNT(*) AS zero_stock_views
    FROM ${events}
    WHERE _TABLE_SUFFIX = '${date}' AND event_name = 'zero_stock_view'
  `);

  const weak = products.filter((row) => (row.add_rate ?? 1) < 0.08).slice(0, 4);
  const stockRow = stock[0];
  return [
    {
      name: 'Break down high-view products',
      status: weak.length ? 'signal' : 'checked',
      summary: weak.length
        ? `${weak.length} high-view products convert to cart below 8%.`
        : 'No extreme product-level view→cart outliers in the top viewed set.',
      details: products.slice(0, 5).map((row) => (
        `${row.item_id} · ${row.views} views · ${row.adds} adds · ${pct(row.add_rate)}`
      )),
    },
    {
      name: 'Check device mix',
      status: 'checked',
      summary: 'Compared view→cart by device category.',
      details: devices.map((row) => (
        `${row.device}: ${row.viewed_users} viewers → ${row.cart_users} cart (${pct(row.view_to_cart_rate)})`
      )),
    },
    {
      name: 'Cross-check inventory friction',
      status: (stockRow?.zero_stock_views ?? 0) > 0 ? 'signal' : 'clear',
      summary: (stockRow?.zero_stock_views ?? 0) > 0
        ? `${stockRow!.zero_stock_views} zero-stock views affected ${stockRow!.zero_stock_users} users the same day.`
        : 'No zero-stock views observed on this day.',
    },
  ];
}

async function investigateInventory(
  config: BigQueryConfig,
  events: string,
  date: string,
  itemId: string,
): Promise<InvestigationStep[]> {
  if (!itemId) {
    return [{ name: 'Inspect SKU family', status: 'checked', summary: 'No item id available for deeper inventory drill-down.' }];
  }
  const safeItem = escapeLiteral(itemId);
  const prefix = escapeLiteral(itemId.replace(/-[A-Z0-9]+$/i, ''));

  const [family, skuFriction] = await Promise.all([
    runBigQuery<{
      item_id: string;
      zero_stock_views: number;
      affected_users: number;
    }>(config, `
      SELECT ${ITEM_ID_FROM_EVENT_PARAMS} AS item_id,
        COUNT(*) AS zero_stock_views,
        COUNT(DISTINCT COALESCE(NULLIF(user_id, ''), user_pseudo_id)) AS affected_users
      FROM ${events}
      WHERE _TABLE_SUFFIX = '${date}'
        AND event_name = 'zero_stock_view'
        AND ${ITEM_ID_FROM_EVENT_PARAMS} LIKE '${prefix}%'
      GROUP BY item_id
      ORDER BY zero_stock_views DESC
      LIMIT 8
    `),
    runBigQuery<{
      zero_stock_views: number;
      affected_users: number;
      cart_adds: number;
      cart_users: number;
      purchases: number;
      same_session_cart_adds: number;
    }>(config, `
      WITH zero_stock AS (
        SELECT
          COALESCE(NULLIF(user_id, ''), user_pseudo_id) AS actor_id,
          CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING) AS session_id,
          COUNT(*) AS zero_stock_views
        FROM ${events}
        WHERE _TABLE_SUFFIX = '${date}'
          AND event_name = 'zero_stock_view'
          AND ${ITEM_ID_FROM_EVENT_PARAMS} = '${safeItem}'
        GROUP BY actor_id, session_id
      ), cart_events AS (
        SELECT
          COALESCE(NULLIF(user_id, ''), user_pseudo_id) AS actor_id,
          CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING) AS session_id,
          COUNT(*) AS cart_adds
        FROM ${events}, UNNEST(items) AS item
        WHERE _TABLE_SUFFIX = '${date}'
          AND event_name = 'add_to_cart'
          AND item.item_id = '${safeItem}'
        GROUP BY actor_id, session_id
      ), purchases AS (
        SELECT COUNT(*) AS purchases
        FROM ${events}, UNNEST(items) AS item
        WHERE _TABLE_SUFFIX = '${date}'
          AND event_name = 'purchase'
          AND item.item_id = '${safeItem}'
      )
      SELECT
        (SELECT COALESCE(SUM(zero_stock_views), 0) FROM zero_stock) AS zero_stock_views,
        (SELECT COUNT(DISTINCT actor_id) FROM zero_stock) AS affected_users,
        (SELECT COALESCE(SUM(cart_adds), 0) FROM cart_events) AS cart_adds,
        (SELECT COUNT(DISTINCT actor_id) FROM cart_events) AS cart_users,
        (SELECT purchases FROM purchases) AS purchases,
        (
          SELECT COUNT(*)
          FROM zero_stock AS z
          JOIN cart_events AS c
            ON z.actor_id = c.actor_id AND z.session_id = c.session_id
        ) AS same_session_cart_adds
    `),
  ]);

  const friction = skuFriction[0];
  const backorderAllowed = (friction?.cart_adds ?? 0) > 0;

  return [
    {
      name: 'Cross-check OOS messaging vs cart adds',
      status: backorderAllowed ? 'signal' : (friction?.zero_stock_views ?? 0) > 0 ? 'checked' : 'clear',
      summary: backorderAllowed
        ? `${friction!.zero_stock_views} zero-stock views and ${friction!.cart_adds} cart adds on ${itemId} — cart is not blocked at zero inventory.`
        : (friction?.zero_stock_views ?? 0) > 0
          ? `${friction!.zero_stock_views} zero-stock views on ${itemId} with no cart adds the same day.`
          : `No zero-stock views recorded for ${itemId} on this day.`,
      details: friction ? [
        `${friction.zero_stock_views} OOS views · ${friction.affected_users} users`,
        `${friction.cart_adds} cart adds · ${friction.cart_users} cart users`,
        `${friction.same_session_cart_adds} same-session OOS-then-cart journeys`,
        `${friction.purchases} purchase line(s)`,
      ] : [],
    },
    {
      name: 'Inspect SKU family / variants',
      status: family.length > 1 ? 'signal' : 'checked',
      summary: family.length > 1
        ? `${family.length} related SKUs show zero-stock pressure around ${prefix}.`
        : `Friction is concentrated on ${itemId}.`,
      details: family.map((row) => (
        `${row.item_id} · ${row.zero_stock_views} views · ${row.affected_users} users`
      )),
    },
    {
      name: 'Recommend merchandising response',
      status: 'checked',
      summary: backorderAllowed
        ? 'Prioritize backorder clarity, promise dates, and post-cart fulfillment tracking over blocking PDP views.'
        : 'If replenishment is slow, surface in-stock substitutes on PDP and search for this family.',
    },
  ];
}

async function investigateSearch(
  config: BigQueryConfig,
  events: string,
  date: string,
  term: string,
): Promise<InvestigationStep[]> {
  if (!term) {
    return [{ name: 'Inspect search term', status: 'checked', summary: 'No search term available for drill-down.' }];
  }
  const safe = escapeLiteral(term);
  const rows = await runBigQuery<{
    event_name: string;
    events: number;
    users: number;
  }>(config, `
    SELECT event_name,
      COUNT(*) AS events,
      COUNT(DISTINCT COALESCE(NULLIF(user_id, ''), user_pseudo_id)) AS users
    FROM ${events}
    WHERE _TABLE_SUFFIX = '${date}'
      AND event_name IN ('search', 'search_page_view', 'view_search_results', 'search_no_results')
      AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'search_term') = '${safe}'
    GROUP BY event_name
    ORDER BY events DESC
  `);

  const resultViews = rows.find((row) => row.event_name === 'view_search_results')?.events ?? 0;
  const searches = rows.find((row) => row.event_name === 'search')?.events ?? 0;
  return [
    {
      name: 'Inspect term event mix',
      status: resultViews === 0 && searches > 0 ? 'signal' : 'checked',
      summary: resultViews === 0
        ? `“${term}” produced searches without correlated result-view events.`
        : `“${term}” has ${resultViews} result-view events against ${searches} searches.`,
      details: rows.map((row) => `${row.event_name}: ${row.events} events · ${row.users} users`),
    },
    {
      name: 'Check tracking vs relevance',
      status: 'checked',
      summary: 'Next human check: reproduce the query in Sparque/storefront and verify result-view tagging carries search_term.',
    },
  ];
}

async function investigateAnomaly(config: BigQueryConfig, events: string, date: string): Promise<InvestigationStep[]> {
  const segments = await runBigQuery<{
    device: string;
    source: string;
    users: number;
    purchases: number;
    revenue_usd: number;
  }>(config, `
    SELECT COALESCE(device.category, 'unknown') AS device,
      COALESCE(traffic_source.source, 'unknown') AS source,
      COUNT(DISTINCT user_pseudo_id) AS users,
      COUNTIF(event_name = 'purchase') AS purchases,
      ROUND(SUM(IF(event_name = 'purchase', ecommerce.purchase_revenue_in_usd, 0)), 2) AS revenue_usd
    FROM ${events}
    WHERE _TABLE_SUFFIX = '${date}'
    GROUP BY device, source
    ORDER BY revenue_usd DESC
    LIMIT 8
  `);

  return [
    {
      name: 'Segment the anomaly day',
      status: 'checked',
      summary: 'Ranked device × source contribution for the anomaly date.',
      details: segments.map((row) => (
        `${row.device} / ${row.source}: ${money(row.revenue_usd)} · ${row.purchases} purchases · ${row.users} users`
      )),
    },
  ];
}

function buildNarrative(opportunity: Opportunity, steps: InvestigationStep[]) {
  const signals = steps.filter((step) => step.status === 'signal').map((step) => step.summary);
  const lead = `Investigated “${opportunity.title}”. ${opportunity.problem}`;
  const middle = signals.length
    ? ` Supporting signals: ${signals.join(' ')}`
    : ' Deeper checks did not uncover a sharper single root cause beyond the detector signal.';
  const close = ` Recommended next step: ${opportunity.recommendation}`;
  return `${lead}${middle}${close}`;
}
