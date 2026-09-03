import { detectOpportunities, type ReportInput } from '@/lib/opportunities';
import {
  getOrFetchCached,
  ttlForAvailableDates,
  ttlForExportDay,
  ttlForRangeAggregate,
  type FetchCacheOptions,
} from '@/lib/analytics-cache';
import { getBigQueryConfig, runBigQuery, type BigQueryConfig } from '@/lib/bigquery';
import { ITEM_ID_FROM_EVENT_PARAMS, inventoryFrictionSql, type InventoryFrictionRow } from '@/lib/inventory';
import { decodeDisplayText, decodeProductName } from '@/lib/text';

export type DayReportRow = {
  report_date: string;
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
  inventory_json: string | null;
  searches_json: string | null;
  products_json: string | null;
  history_json: string | null;
};

function dayReportSql(project: string, dataset: string, reportDate: string) {
  return `
    WITH latest AS (
      SELECT '${reportDate}' AS report_date
    ), daily_events AS (
      SELECT *, _TABLE_SUFFIX AS report_date
      FROM \`${project}.${dataset}.events_*\`
      WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(PARSE_DATE('%Y%m%d', (SELECT report_date FROM latest)), INTERVAL 29 DAY))
        AND (SELECT report_date FROM latest)
    ), events AS (
      SELECT * FROM \`${project}.${dataset}.events_*\`
      WHERE _TABLE_SUFFIX = (SELECT report_date FROM latest)
    ), daily_metrics AS (
      SELECT report_date,
        COUNT(*) AS events,
        COUNT(DISTINCT user_pseudo_id) AS users,
        COUNTIF(event_name = 'session_start') AS sessions,
        COUNTIF(event_name = 'purchase') AS purchases,
        ROUND(SUM(IF(event_name = 'purchase', ecommerce.purchase_revenue_in_usd, 0)), 2) AS revenue_usd
      FROM daily_events GROUP BY report_date
    ), daily_actor_steps AS (
      SELECT report_date, COALESCE(NULLIF(user_id, ''), user_pseudo_id) AS actor_id,
        LOGICAL_OR(event_name = 'view_item') AS viewed,
        LOGICAL_OR(event_name = 'add_to_cart') AS added,
        LOGICAL_OR(event_name = 'begin_checkout') AS checkout,
        LOGICAL_OR(event_name = 'purchase') AS purchased
      FROM daily_events GROUP BY report_date, actor_id
    ), daily_funnel AS (
      SELECT report_date,
        SAFE_DIVIDE(COUNTIF(added), COUNTIF(viewed)) AS view_to_cart_rate,
        SAFE_DIVIDE(COUNTIF(purchased), COUNTIF(checkout)) AS checkout_conversion_rate
      FROM daily_actor_steps GROUP BY report_date
    ), history AS (
      SELECT m.report_date, m.events, m.users, m.sessions, m.purchases, m.revenue_usd,
        f.view_to_cart_rate, f.checkout_conversion_rate
      FROM daily_metrics AS m JOIN daily_funnel AS f USING (report_date)
    ), actors AS (
      SELECT COALESCE(NULLIF(user_id, ''), user_pseudo_id) AS actor_id,
        LOGICAL_OR(event_name = 'view_item') AS viewed,
        LOGICAL_OR(event_name = 'add_to_cart') AS added,
        LOGICAL_OR(event_name = 'begin_checkout') AS checkout,
        LOGICAL_OR(event_name = 'purchase') AS purchased
      FROM events GROUP BY actor_id
    ), inventory AS (
      ${inventoryFrictionSql('events', 5).trim()}
    ), searches AS (
      SELECT (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'search_term') AS search_term,
        COUNTIF(event_name = 'search') AS searches,
        COUNTIF(event_name = 'view_search_results') AS result_views,
        COUNTIF(event_name = 'search_no_results') AS no_result_events,
        COUNT(DISTINCT COALESCE(NULLIF(user_id, ''), user_pseudo_id)) AS users
      FROM events WHERE event_name IN ('search', 'search_page_view', 'view_search_results', 'search_no_results')
      GROUP BY search_term HAVING search_term IS NOT NULL
      ORDER BY searches DESC, result_views ASC LIMIT 8
    ), product_base AS (
      SELECT item.item_id AS item_id,
        ANY_VALUE(item.item_name) AS item_name,
        COUNTIF(event_name = 'view_item') AS views,
        COUNTIF(event_name = 'add_to_cart') AS adds,
        COUNTIF(event_name = 'purchase') AS purchases,
        ROUND(SUM(IF(event_name = 'purchase', item.item_revenue_in_usd, 0)), 2) AS item_revenue_usd,
        SAFE_DIVIDE(COUNTIF(event_name = 'add_to_cart'), COUNTIF(event_name = 'view_item')) AS add_rate
      FROM events, UNNEST(items) AS item
      WHERE event_name IN ('view_item', 'add_to_cart', 'purchase')
      GROUP BY item_id
      HAVING views >= 3
      ORDER BY views DESC
      LIMIT 12
    ), product_oos AS (
      SELECT
        ${ITEM_ID_FROM_EVENT_PARAMS} AS item_id,
        COUNT(*) AS zero_stock_views,
        COUNT(DISTINCT COALESCE(NULLIF(user_id, ''), user_pseudo_id)) AS oos_users
      FROM events
      WHERE event_name = 'zero_stock_view'
      GROUP BY item_id
      HAVING item_id IS NOT NULL AND item_id != ''
    ), products AS (
      SELECT
        p.item_id,
        p.item_name,
        p.views,
        p.adds,
        p.purchases,
        p.item_revenue_usd,
        p.add_rate,
        COALESCE(o.zero_stock_views, 0) AS zero_stock_views,
        COALESCE(o.oos_users, 0) AS oos_users,
        CASE
          WHEN COALESCE(o.zero_stock_views, 0) > 0 AND p.adds > 0 THEN 'backorder_allowed'
          WHEN COALESCE(o.zero_stock_views, 0) > 0 THEN 'oos_messaging_only'
          ELSE CAST(NULL AS STRING)
        END AS oos_pattern
      FROM product_base AS p
      LEFT JOIN product_oos AS o USING (item_id)
    )
    SELECT (SELECT report_date FROM latest) AS report_date,
      (SELECT COUNT(*) FROM events) AS events,
      (SELECT COUNT(DISTINCT user_pseudo_id) FROM events) AS users,
      (SELECT COUNT(DISTINCT NULLIF(user_id, '')) FROM events) AS authenticated_users,
      (SELECT COUNTIF(event_name = 'session_start') FROM events) AS sessions,
      (SELECT COUNTIF(event_name = 'purchase') FROM events) AS purchases,
      (SELECT COUNT(DISTINCT IF(event_name = 'purchase', COALESCE(NULLIF(user_id, ''), user_pseudo_id), NULL)) FROM events) AS purchasing_users,
      (SELECT ROUND(SUM(IF(event_name = 'purchase', ecommerce.purchase_revenue_in_usd, 0)), 2) FROM events) AS revenue_usd,
      (SELECT COUNTIF(viewed) FROM actors) AS viewed_users,
      (SELECT COUNTIF(added) FROM actors) AS cart_users,
      (SELECT COUNTIF(checkout) FROM actors) AS checkout_users,
      (SELECT COUNTIF(purchased) FROM actors) AS purchasers,
      (SELECT SAFE_DIVIDE(COUNTIF(added), COUNTIF(viewed)) FROM actors) AS view_to_cart_rate,
      (SELECT SAFE_DIVIDE(COUNTIF(purchased), COUNTIF(checkout)) FROM actors) AS checkout_conversion_rate,
      (SELECT TO_JSON_STRING(ARRAY_AGG(STRUCT(
        item_id, zero_stock_views, affected_users, cart_adds, cart_users, purchases, oos_pattern
      ))) FROM inventory) AS inventory_json,
      (SELECT TO_JSON_STRING(ARRAY_AGG(STRUCT(s.search_term AS search_term, s.searches AS searches, s.result_views AS result_views, s.no_result_events AS no_result_events, s.users AS users))) FROM searches AS s) AS searches_json,
      (SELECT TO_JSON_STRING(ARRAY_AGG(STRUCT(
        p.item_id AS item_id,
        p.item_name AS item_name,
        p.views AS views,
        p.adds AS adds,
        p.purchases AS purchases,
        p.item_revenue_usd AS item_revenue_usd,
        p.add_rate AS add_rate,
        p.zero_stock_views AS zero_stock_views,
        p.oos_users AS oos_users,
        p.oos_pattern AS oos_pattern
      ))) FROM products AS p) AS products_json,
      (SELECT TO_JSON_STRING(ARRAY_AGG(STRUCT(report_date, events, users, sessions, purchases, revenue_usd, view_to_cart_rate, checkout_conversion_rate) ORDER BY report_date)) FROM history) AS history_json
  `;
}

export async function fetchAvailableDates(
  config: BigQueryConfig,
  options?: FetchCacheOptions,
): Promise<string[]> {
  return getOrFetchCached(
    config.siteId,
    'available-dates',
    async () => {
      const rows = await runBigQuery<{ report_date: string }>(config, `
        SELECT REGEXP_EXTRACT(table_name, r'^events_(\\d{8})$') AS report_date
        FROM \`${config.project}.${config.dataset}.INFORMATION_SCHEMA.TABLES\`
        WHERE REGEXP_CONTAINS(table_name, r'^events_\\d{8}$')
        ORDER BY report_date
      `);
      return rows.map((row) => String(row.report_date)).filter(Boolean);
    },
    { ...options, ttlMs: ttlForAvailableDates() },
  );
}

export type WeekMetrics = {
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

function weekMetricsSql(project: string, dataset: string, startDate: string, endDate: string) {
  return `
    WITH events AS (
      SELECT * FROM \`${project}.${dataset}.events_*\`
      WHERE _TABLE_SUFFIX BETWEEN '${startDate}' AND '${endDate}'
    ), actors AS (
      SELECT COALESCE(NULLIF(user_id, ''), user_pseudo_id) AS actor_id,
        LOGICAL_OR(event_name = 'view_item') AS viewed,
        LOGICAL_OR(event_name = 'add_to_cart') AS added,
        LOGICAL_OR(event_name = 'begin_checkout') AS checkout,
        LOGICAL_OR(event_name = 'purchase') AS purchased
      FROM events
      GROUP BY actor_id
    ), auth_actors AS (
      SELECT NULLIF(user_id, '') AS actor_id,
        LOGICAL_OR(event_name = 'view_item') AS viewed,
        LOGICAL_OR(event_name = 'add_to_cart') AS added,
        LOGICAL_OR(event_name = 'begin_checkout') AS checkout,
        LOGICAL_OR(event_name = 'purchase') AS purchased
      FROM events
      WHERE NULLIF(user_id, '') IS NOT NULL
      GROUP BY actor_id
    )
    SELECT
      COUNTIF(event_name = 'purchase') AS purchases,
      ROUND(SUM(IF(event_name = 'purchase', ecommerce.purchase_revenue_in_usd, 0)), 2) AS revenue_usd,
      COUNTIF(event_name = 'session_start') AS sessions,
      COUNT(DISTINCT IF(event_name = 'purchase', COALESCE(NULLIF(user_id, ''), user_pseudo_id), NULL)) AS purchasing_users,
      (SELECT COUNT(*) FROM auth_actors) AS authenticated_users,
      (SELECT COUNTIF(viewed) FROM auth_actors) AS authenticated_viewed_users,
      (SELECT COUNTIF(added) FROM auth_actors) AS authenticated_cart_users,
      (SELECT COUNTIF(checkout) FROM auth_actors) AS authenticated_checkout_users,
      (SELECT COUNTIF(purchased) FROM auth_actors) AS authenticated_purchasers,
      (SELECT SAFE_DIVIDE(COUNTIF(viewed), COUNT(*)) FROM auth_actors) AS authenticated_to_pdp_rate,
      (SELECT SAFE_DIVIDE(COUNTIF(added), COUNTIF(viewed)) FROM auth_actors) AS authenticated_view_to_cart_rate,
      (SELECT SAFE_DIVIDE(COUNTIF(purchased), COUNTIF(checkout)) FROM auth_actors) AS authenticated_checkout_conversion_rate,
      (SELECT COUNTIF(viewed) FROM actors) AS viewed_users,
      (SELECT COUNTIF(added) FROM actors) AS cart_users,
      (SELECT COUNTIF(checkout) FROM actors) AS checkout_users,
      (SELECT COUNTIF(purchased) FROM actors) AS purchasers,
      (SELECT SAFE_DIVIDE(COUNTIF(added), COUNTIF(viewed)) FROM actors) AS view_to_cart_rate,
      (SELECT SAFE_DIVIDE(COUNTIF(purchased), COUNTIF(checkout)) FROM actors) AS checkout_conversion_rate
    FROM events
  `;
}

export async function fetchWeekMetrics(
  config: BigQueryConfig,
  startDate: string,
  endDate: string,
  exportDays: number,
  options?: FetchCacheOptions,
): Promise<WeekMetrics> {
  return getOrFetchCached(
    config.siteId,
    `week-metrics:${startDate}:${endDate}`,
    async () => {
      const rows = await runBigQuery<{
        revenue_usd: number;
        purchases: number;
        sessions: number;
        purchasing_users: number;
        authenticated_users: number;
        authenticated_viewed_users: number;
        authenticated_cart_users: number;
        authenticated_checkout_users: number;
        authenticated_purchasers: number;
        authenticated_to_pdp_rate: number;
        authenticated_view_to_cart_rate: number;
        authenticated_checkout_conversion_rate: number;
        viewed_users: number;
        cart_users: number;
        checkout_users: number;
        purchasers: number;
        view_to_cart_rate: number;
        checkout_conversion_rate: number;
      }>(config, weekMetricsSql(config.project, config.dataset, startDate, endDate));
      const row = rows[0] ?? {};
      return {
        start_date: startDate,
        end_date: endDate,
        days: exportDays,
        revenue_usd: Number(row.revenue_usd ?? 0),
        purchases: Number(row.purchases ?? 0),
        sessions: Number(row.sessions ?? 0),
        authenticated_users: Number(row.authenticated_users ?? 0),
        authenticated_viewed_users: Number(row.authenticated_viewed_users ?? 0),
        authenticated_cart_users: Number(row.authenticated_cart_users ?? 0),
        authenticated_checkout_users: Number(row.authenticated_checkout_users ?? 0),
        authenticated_purchasers: Number(row.authenticated_purchasers ?? 0),
        authenticated_to_pdp_rate: Number(row.authenticated_to_pdp_rate ?? 0),
        authenticated_view_to_cart_rate: Number(row.authenticated_view_to_cart_rate ?? 0),
        authenticated_checkout_conversion_rate: Number(row.authenticated_checkout_conversion_rate ?? 0),
        purchasing_users: Number(row.purchasing_users ?? 0),
        viewed_users: Number(row.viewed_users ?? 0),
        cart_users: Number(row.cart_users ?? 0),
        checkout_users: Number(row.checkout_users ?? 0),
        purchasers: Number(row.purchasers ?? 0),
        view_to_cart_rate: Number(row.view_to_cart_rate ?? 0),
        checkout_conversion_rate: Number(row.checkout_conversion_rate ?? 0),
      };
    },
    { ...options, ttlMs: ttlForRangeAggregate() },
  );
}

export type PeriodSearchRow = {
  search_term: string;
  searches: number;
  result_views: number;
  no_result_events: number;
  users: number;
};

export async function fetchPeriodSearches(
  config: BigQueryConfig,
  startDate: string,
  endDate: string,
  limit = 25,
  options?: FetchCacheOptions,
): Promise<PeriodSearchRow[]> {
  return getOrFetchCached(
    config.siteId,
    `period-searches:${startDate}:${endDate}:${limit}`,
    async () => {
      const rows = await runBigQuery<PeriodSearchRow>(config, `
        SELECT (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'search_term') AS search_term,
          COUNTIF(event_name = 'search') AS searches,
          COUNTIF(event_name = 'view_search_results') AS result_views,
          COUNTIF(event_name = 'search_no_results') AS no_result_events,
          COUNT(DISTINCT COALESCE(NULLIF(user_id, ''), user_pseudo_id)) AS users
        FROM \`${config.project}.${config.dataset}.events_*\`
        WHERE _TABLE_SUFFIX BETWEEN '${startDate}' AND '${endDate}'
          AND event_name IN ('search', 'search_page_view', 'view_search_results', 'search_no_results')
        GROUP BY search_term
        HAVING search_term IS NOT NULL
        ORDER BY searches DESC, result_views ASC
        LIMIT ${limit}
      `);
      return rows.map((row) => ({
        search_term: decodeDisplayText(String(row.search_term)),
        searches: Number(row.searches ?? 0),
        result_views: Number(row.result_views ?? 0),
        no_result_events: Number(row.no_result_events ?? 0),
        users: Number(row.users ?? 0),
      }));
    },
    { ...options, ttlMs: ttlForRangeAggregate() },
  );
}

async function loadDayReportFromBigQuery(config: BigQueryConfig, reportDate: string) {
  const rows = await runBigQuery<DayReportRow>(config, dayReportSql(config.project, config.dataset, reportDate));
  const row = rows[0];
  if (!row) throw new Error(`No report for ${reportDate}`);

  const inventory = row.inventory_json
    ? JSON.parse(String(row.inventory_json)) as InventoryFrictionRow[]
    : [];
  const searches = row.searches_json
    ? (JSON.parse(String(row.searches_json)) as ReportInput['searches']).map((term) => ({
      ...term,
      search_term: decodeDisplayText(term.search_term),
    }))
    : [];
  const products = row.products_json
    ? (JSON.parse(String(row.products_json)) as Array<{
      item_id: string;
      item_name: string;
      views: number;
      adds: number;
      add_rate: number;
      zero_stock_views?: number;
      oos_users?: number;
      oos_pattern?: 'backorder_allowed' | 'oos_messaging_only' | null;
    }>).map((product) => ({
      ...product,
      item_name: decodeProductName(product.item_name),
      zero_stock_views: Number(product.zero_stock_views ?? 0),
      oos_users: Number(product.oos_users ?? 0),
      oos_pattern: product.oos_pattern ?? null,
    }))
    : [];
  const history = row.history_json ? JSON.parse(String(row.history_json)) : [];

  const reportInput: ReportInput = {
    report_date: String(row.report_date),
    revenue_usd: Number(row.revenue_usd ?? 0),
    purchases: Number(row.purchases ?? 0),
    sessions: Number(row.sessions ?? 0),
    viewed_users: Number(row.viewed_users ?? 0),
    cart_users: Number(row.cart_users ?? 0),
    checkout_users: Number(row.checkout_users ?? 0),
    purchasers: Number(row.purchasers ?? 0),
    view_to_cart_rate: Number(row.view_to_cart_rate ?? 0),
    inventory,
    searches,
    products,
    history,
  };

  const detection = detectOpportunities(reportInput);
  return {
    ...row,
    inventory,
    searches,
    products,
    history,
    opportunities: detection.opportunities,
    detection,
  };
}

export type DayReport = Awaited<ReturnType<typeof loadDayReportFromBigQuery>>;

export async function fetchDayReport(
  config: BigQueryConfig,
  reportDate: string,
  options?: FetchCacheOptions,
) {
  const latestExportDate = options?.latestExportDate ?? null;
  return getOrFetchCached(
    config.siteId,
    `day-report:v2:${reportDate}`,
    () => loadDayReportFromBigQuery(config, reportDate),
    {
      ...options,
      ttlMs: ttlForExportDay(reportDate, latestExportDate),
    },
  );
}
