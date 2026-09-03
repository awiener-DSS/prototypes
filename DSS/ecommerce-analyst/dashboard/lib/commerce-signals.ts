import { getOrFetchCached, ttlForRangeAggregate, type FetchCacheOptions } from '@/lib/analytics-cache';
import { runBigQuery, type BigQueryConfig } from '@/lib/bigquery';

export type LandingPageRow = {
  landing_path: string;
  sessions: number;
  viewed_sessions: number;
  cart_sessions: number;
  purchase_sessions: number;
  revenue_usd: number;
  purchase_rate: number;
  view_to_cart_rate: number | null;
  avg_engagement_sec: number | null;
  top_source: string | null;
  top_campaign: string | null;
};

export type TaxonomyRow = {
  taxonomy_value: string;
  dimension: 'brand' | 'category';
  views: number;
  adds: number;
  purchases: number;
  viewing_users: number;
  item_revenue_usd: number;
  add_rate: number | null;
  conversion_rate: number | null;
};

export type AcquisitionRow = {
  source: string;
  medium: string;
  campaign: string;
  sessions: number;
  purchase_sessions: number;
  revenue_usd: number;
  purchase_rate: number;
};

function eventsTable(config: BigQueryConfig) {
  return `\`${config.project}.${config.dataset}.events_*\``;
}

const PURCHASE_ITEM_REVENUE_USD = `COALESCE(
  NULLIF(item.item_revenue_in_usd, 0),
  SAFE_MULTIPLY(
    COALESCE(NULLIF(item.price_in_usd, 0), NULLIF(item.price, 0)),
    COALESCE(item.quantity, 1)
  ),
  0
)`;

export async function fetchLandingPagePerformance(
  config: BigQueryConfig,
  startDate: string,
  endDate: string,
  options?: FetchCacheOptions,
): Promise<LandingPageRow[]> {
  return getOrFetchCached(
    config.siteId,
    `landing-pages:${startDate}:${endDate}`,
    async () => {
      const events = eventsTable(config);
      return runBigQuery<LandingPageRow>(config, `
        WITH hits AS (
          SELECT
            user_pseudo_id,
            COALESCE(
              (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id'),
              FARM_FINGERPRINT(CONCAT(user_pseudo_id, CAST(event_timestamp AS STRING)))
            ) AS session_id,
            event_timestamp,
            event_name,
            ecommerce.purchase_revenue_in_usd AS purchase_revenue_usd,
            (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'engagement_time_msec') AS engagement_msec,
            COALESCE(
              traffic_source.source,
              (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'source'),
              '(direct)'
            ) AS source,
            COALESCE(
              traffic_source.name,
              (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'campaign'),
              '(not set)'
            ) AS campaign,
            COALESCE(
              REGEXP_EXTRACT(
                COALESCE(
                  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location'),
                  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_path'),
                  ''
                ),
                r'^(?:https?://[^/]+)?([^?#]*)'
              ),
              '(unknown)'
            ) AS page_path
          FROM ${events}
          WHERE _TABLE_SUFFIX BETWEEN '${startDate}' AND '${endDate}'
        ), ranked AS (
          SELECT *,
            ROW_NUMBER() OVER (PARTITION BY user_pseudo_id, session_id ORDER BY event_timestamp) AS hit_n
          FROM hits
        ), landings AS (
          SELECT user_pseudo_id, session_id,
            NULLIF(page_path, '') AS landing_path,
            source,
            campaign
          FROM ranked
          WHERE hit_n = 1
        ), outcomes AS (
          SELECT user_pseudo_id, session_id,
            LOGICAL_OR(event_name = 'view_item') AS viewed,
            LOGICAL_OR(event_name = 'add_to_cart') AS added,
            LOGICAL_OR(event_name = 'purchase') AS purchased,
            ROUND(SUM(IF(event_name = 'purchase', COALESCE(purchase_revenue_usd, 0), 0)), 2) AS revenue_usd,
            SUM(COALESCE(engagement_msec, 0)) AS engagement_msec
          FROM ranked
          GROUP BY user_pseudo_id, session_id
        )
        SELECT
          COALESCE(l.landing_path, '(unknown)') AS landing_path,
          COUNT(*) AS sessions,
          COUNTIF(o.viewed) AS viewed_sessions,
          COUNTIF(o.added) AS cart_sessions,
          COUNTIF(o.purchased) AS purchase_sessions,
          ROUND(SUM(o.revenue_usd), 2) AS revenue_usd,
          SAFE_DIVIDE(COUNTIF(o.purchased), COUNT(*)) AS purchase_rate,
          SAFE_DIVIDE(COUNTIF(o.added), COUNTIF(o.viewed)) AS view_to_cart_rate,
          ROUND(SAFE_DIVIDE(AVG(o.engagement_msec), 1000), 1) AS avg_engagement_sec,
          APPROX_TOP_COUNT(l.source, 1)[OFFSET(0)].value AS top_source,
          APPROX_TOP_COUNT(l.campaign, 1)[OFFSET(0)].value AS top_campaign
        FROM landings AS l
        JOIN outcomes AS o USING (user_pseudo_id, session_id)
        GROUP BY landing_path
        HAVING sessions >= 5
        ORDER BY sessions DESC
        LIMIT 40
      `);
    },
    { ...options, ttlMs: ttlForRangeAggregate() },
  );
}

export async function fetchTaxonomyPerformance(
  config: BigQueryConfig,
  startDate: string,
  endDate: string,
  dimension: 'brand' | 'category' = 'brand',
  options?: FetchCacheOptions,
): Promise<TaxonomyRow[]> {
  // Lowest non-empty item_categoryN (GA4: category5 → category); skip root/unset nodes.
  const leafCategory = (field: string) =>
    `NULLIF(IF(LOWER(TRIM(COALESCE(${field}, ''))) IN ('', 'shop', '(not set)'), NULL, NULLIF(${field}, '')), NULL)`;
  const dimExpr = dimension === 'brand'
    ? "COALESCE(NULLIF(item.item_brand, ''), '(unknown)')"
    : `COALESCE(
        ${leafCategory('item.item_category5')},
        ${leafCategory('item.item_category4')},
        ${leafCategory('item.item_category3')},
        ${leafCategory('item.item_category2')},
        ${leafCategory('item.item_category')},
        '(unknown)'
      )`;

  return getOrFetchCached(
    config.siteId,
    `taxonomy:v4:${dimension}:${startDate}:${endDate}`,
    async () => {
      const events = eventsTable(config);
      const rows = await runBigQuery<Omit<TaxonomyRow, 'dimension'>>(config, `
        SELECT
          ${dimExpr} AS taxonomy_value,
          COUNTIF(event_name = 'view_item') AS views,
          COUNTIF(event_name = 'add_to_cart') AS adds,
          COUNTIF(event_name = 'purchase') AS purchases,
          COUNT(DISTINCT IF(event_name = 'view_item', COALESCE(NULLIF(user_id, ''), user_pseudo_id), NULL)) AS viewing_users,
          ROUND(SUM(IF(event_name = 'purchase', ${PURCHASE_ITEM_REVENUE_USD}, 0)), 2) AS item_revenue_usd,
          SAFE_DIVIDE(COUNTIF(event_name = 'add_to_cart'), COUNTIF(event_name = 'view_item')) AS add_rate,
          SAFE_DIVIDE(COUNTIF(event_name = 'purchase'), COUNTIF(event_name = 'view_item')) AS conversion_rate
        FROM ${events}, UNNEST(items) AS item
        WHERE _TABLE_SUFFIX BETWEEN '${startDate}' AND '${endDate}'
          AND event_name IN ('view_item', 'add_to_cart', 'purchase')
        GROUP BY taxonomy_value
        HAVING views >= 8
          AND LOWER(taxonomy_value) NOT IN ('shop', '(not set)')
        ORDER BY views DESC
        LIMIT 40
      `);
      return rows.map((row) => ({ ...row, dimension }));
    },
    { ...options, ttlMs: ttlForRangeAggregate() },
  );
}

export async function fetchAcquisitionQuality(
  config: BigQueryConfig,
  startDate: string,
  endDate: string,
  options?: FetchCacheOptions,
): Promise<AcquisitionRow[]> {
  return getOrFetchCached(
    config.siteId,
    `acquisition-quality:${startDate}:${endDate}`,
    async () => {
      const events = eventsTable(config);
      return runBigQuery<AcquisitionRow>(config, `
        WITH hits AS (
          SELECT
            user_pseudo_id,
            COALESCE(
              (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id'),
              FARM_FINGERPRINT(CONCAT(user_pseudo_id, CAST(event_timestamp AS STRING)))
            ) AS session_id,
            event_name,
            ecommerce.purchase_revenue_in_usd AS purchase_revenue_usd,
            COALESCE(traffic_source.source, '(direct)') AS source,
            COALESCE(traffic_source.medium, '(none)') AS medium,
            COALESCE(
              traffic_source.name,
              (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'campaign'),
              '(not set)'
            ) AS campaign
          FROM ${events}
          WHERE _TABLE_SUFFIX BETWEEN '${startDate}' AND '${endDate}'
        ), sessions AS (
          SELECT
            ANY_VALUE(source) AS source,
            ANY_VALUE(medium) AS medium,
            ANY_VALUE(campaign) AS campaign,
            user_pseudo_id,
            session_id,
            LOGICAL_OR(event_name = 'purchase') AS purchased,
            ROUND(SUM(IF(event_name = 'purchase', COALESCE(purchase_revenue_usd, 0), 0)), 2) AS revenue_usd
          FROM hits
          GROUP BY user_pseudo_id, session_id
        )
        SELECT
          source,
          medium,
          campaign,
          COUNT(*) AS sessions,
          COUNTIF(purchased) AS purchase_sessions,
          ROUND(SUM(revenue_usd), 2) AS revenue_usd,
          SAFE_DIVIDE(COUNTIF(purchased), COUNT(*)) AS purchase_rate
        FROM sessions
        GROUP BY source, medium, campaign
        HAVING sessions >= 8
        ORDER BY sessions DESC
        LIMIT 40
      `);
    },
    { ...options, ttlMs: ttlForRangeAggregate() },
  );
}
