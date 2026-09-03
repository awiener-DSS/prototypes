import { getOrFetchCached, ttlForRangeAggregate, type FetchCacheOptions } from '@/lib/analytics-cache';
import { runBigQuery, type BigQueryConfig } from '@/lib/bigquery';
import { decodeProductName } from '@/lib/text';

export type TopSellingProduct = {
  item_id: string;
  item_name: string;
  units_sold: number;
  purchase_lines: number;
  orders: number;
  item_revenue_usd: number;
};

export type ProductMatch = {
  item_id: string;
  item_name: string;
  event_rows: number;
};

export type AffinityRow = {
  item_id: string;
  item_name: string;
  co_occurrences: number;
};

export type ProductAffinities = {
  anchor_item_id: string;
  anchor_item_name: string | null;
  anchor_orders: number;
  anchor_cart_sessions: number;
  purchased_together: AffinityRow[];
  cart_together: AffinityRow[];
  start_date: string;
  end_date: string;
};

function escapeLiteral(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function decodeProductRow<T extends { item_name?: string | null }>(row: T): T {
  return { ...row, item_name: decodeProductName(row.item_name) };
}

function decodeProductRows<T extends { item_name?: string | null }>(rows: T[]): T[] {
  return rows.map(decodeProductRow);
}

function eventsTable(config: BigQueryConfig) {
  return `\`${config.project}.${config.dataset}.events_*\``;
}

function purchaseItemRevenueUsdSql() {
  return `COALESCE(
    NULLIF(item.item_revenue_in_usd, 0),
    SAFE_MULTIPLY(
      COALESCE(NULLIF(item.price_in_usd, 0), NULLIF(item.price, 0)),
      COALESCE(item.quantity, 1)
    ),
    0
  )`;
}

function topSellersOrderBy(sort: 'revenue' | 'units' | 'orders'): string {
  if (sort === 'units') return 'units_sold DESC, orders DESC, item_revenue_usd DESC';
  if (sort === 'orders') return 'orders DESC, units_sold DESC, item_revenue_usd DESC';
  return 'item_revenue_usd DESC, units_sold DESC, orders DESC';
}

export async function fetchTopSellingProducts(
  config: BigQueryConfig,
  startDate: string,
  endDate: string,
  limit = 25,
  sort: 'revenue' | 'units' | 'orders' = 'orders',
  options?: FetchCacheOptions,
): Promise<TopSellingProduct[]> {
  return getOrFetchCached(
    config.siteId,
    `top-sellers:${startDate}:${endDate}:${limit}:${sort}`,
    async () => {
      const orderBy = topSellersOrderBy(sort);
      const events = eventsTable(config);
      const rows = await runBigQuery<TopSellingProduct>(config, `
        SELECT item.item_id, ANY_VALUE(item.item_name) AS item_name,
          SUM(COALESCE(item.quantity, 1)) AS units_sold,
          COUNT(*) AS purchase_lines,
          COUNT(DISTINCT COALESCE(
            NULLIF(ecommerce.transaction_id, ''),
            (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'transaction_id')
          )) AS orders,
          ROUND(SUM(${purchaseItemRevenueUsdSql()}), 2) AS item_revenue_usd
        FROM ${events}, UNNEST(items) AS item
        WHERE _TABLE_SUFFIX BETWEEN '${startDate}' AND '${endDate}'
          AND event_name = 'purchase'
          AND item.item_id IS NOT NULL AND item.item_id != ''
        GROUP BY item.item_id
        ORDER BY ${orderBy}
        LIMIT ${limit}
      `);
      return decodeProductRows(rows);
    },
    { ...options, ttlMs: ttlForRangeAggregate() },
  );
}

export async function searchProducts(
  config: BigQueryConfig,
  startDate: string,
  endDate: string,
  query: string,
  limit = 10,
  options?: FetchCacheOptions,
): Promise<ProductMatch[]> {
  const safeQuery = query.trim();
  return getOrFetchCached(
    config.siteId,
    `product-search:${startDate}:${endDate}:${limit}:${safeQuery.toLowerCase()}`,
    async () => {
      const safe = escapeLiteral(safeQuery);
      const events = eventsTable(config);
      const rows = await runBigQuery<ProductMatch>(config, `
        WITH product_rows AS (
          SELECT item.item_id, item.item_name
          FROM ${events}, UNNEST(items) AS item
          WHERE _TABLE_SUFFIX BETWEEN '${startDate}' AND '${endDate}'
            AND event_name IN ('view_item', 'add_to_cart', 'purchase')
            AND item.item_id IS NOT NULL AND item.item_id != ''
        )
        SELECT item_id, ANY_VALUE(item_name) AS item_name, COUNT(*) AS event_rows
        FROM product_rows
        WHERE LOWER(item_id) LIKE CONCAT('%', LOWER('${safe}'), '%')
          OR LOWER(COALESCE(item_name, '')) LIKE CONCAT('%', LOWER('${safe}'), '%')
        GROUP BY item_id
        ORDER BY event_rows DESC
        LIMIT ${limit}
      `);
      return decodeProductRows(rows);
    },
    { ...options, ttlMs: ttlForRangeAggregate() },
  );
}

async function loadProductAffinitiesFromBigQuery(
  config: BigQueryConfig,
  startDate: string,
  endDate: string,
  itemId: string,
  limit = 15,
): Promise<ProductAffinities> {
  const anchor = escapeLiteral(itemId.trim());
  const events = eventsTable(config);

  const [purchased, cart, anchorMeta, anchorOrders, anchorSessions] = await Promise.all([
    runBigQuery<AffinityRow>(config, `
      WITH order_lines AS (
        SELECT
          COALESCE(
            NULLIF(ecommerce.transaction_id, ''),
            (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'transaction_id'),
            CONCAT(COALESCE(NULLIF(user_id, ''), user_pseudo_id), '-', CAST(event_timestamp AS STRING))
          ) AS order_id,
          item.item_id,
          item.item_name
        FROM ${events}, UNNEST(items) AS item
        WHERE _TABLE_SUFFIX BETWEEN '${startDate}' AND '${endDate}'
          AND event_name = 'purchase'
          AND item.item_id IS NOT NULL AND item.item_id != ''
      ), anchor_orders AS (
        SELECT DISTINCT order_id FROM order_lines WHERE item_id = '${anchor}'
      )
      SELECT ol.item_id, ANY_VALUE(ol.item_name) AS item_name,
        COUNT(DISTINCT ol.order_id) AS co_occurrences
      FROM order_lines AS ol
      JOIN anchor_orders AS ao ON ol.order_id = ao.order_id
      WHERE ol.item_id != '${anchor}'
      GROUP BY ol.item_id
      ORDER BY co_occurrences DESC
      LIMIT ${limit}
    `),
    runBigQuery<AffinityRow>(config, `
      WITH cart_lines AS (
        SELECT
          CONCAT(
            COALESCE(NULLIF(user_id, ''), user_pseudo_id),
            '-',
            CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING)
          ) AS session_key,
          item.item_id,
          item.item_name
        FROM ${events}, UNNEST(items) AS item
        WHERE _TABLE_SUFFIX BETWEEN '${startDate}' AND '${endDate}'
          AND event_name = 'add_to_cart'
          AND item.item_id IS NOT NULL AND item.item_id != ''
      ), anchor_sessions AS (
        SELECT DISTINCT session_key FROM cart_lines WHERE item_id = '${anchor}'
      )
      SELECT cl.item_id, ANY_VALUE(cl.item_name) AS item_name,
        COUNT(DISTINCT cl.session_key) AS co_occurrences
      FROM cart_lines AS cl
      JOIN anchor_sessions AS aos ON cl.session_key = aos.session_key
      WHERE cl.item_id != '${anchor}'
      GROUP BY cl.item_id
      ORDER BY co_occurrences DESC
      LIMIT ${limit}
    `),
    runBigQuery<{ item_name: string }>(config, `
      SELECT ANY_VALUE(item.item_name) AS item_name
      FROM ${events}, UNNEST(items) AS item
      WHERE _TABLE_SUFFIX BETWEEN '${startDate}' AND '${endDate}'
        AND event_name = 'purchase'
        AND item.item_id = '${anchor}'
    `),
    runBigQuery<{ anchor_orders: number }>(config, `
      SELECT COUNT(DISTINCT COALESCE(
        NULLIF(ecommerce.transaction_id, ''),
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'transaction_id'),
        CONCAT(COALESCE(NULLIF(user_id, ''), user_pseudo_id), '-', CAST(event_timestamp AS STRING))
      )) AS anchor_orders
      FROM ${events}, UNNEST(items) AS item
      WHERE _TABLE_SUFFIX BETWEEN '${startDate}' AND '${endDate}'
        AND event_name = 'purchase'
        AND item.item_id = '${anchor}'
    `),
    runBigQuery<{ anchor_sessions: number }>(config, `
      SELECT COUNT(DISTINCT CONCAT(
        COALESCE(NULLIF(user_id, ''), user_pseudo_id),
        '-',
        CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING)
      )) AS anchor_sessions
      FROM ${events}, UNNEST(items) AS item
      WHERE _TABLE_SUFFIX BETWEEN '${startDate}' AND '${endDate}'
        AND event_name = 'add_to_cart'
        AND item.item_id = '${anchor}'
    `),
  ]);

  return {
    anchor_item_id: itemId.trim(),
    anchor_item_name: decodeProductName(anchorMeta[0]?.item_name ?? null) || null,
    anchor_orders: Number(anchorOrders[0]?.anchor_orders ?? 0),
    anchor_cart_sessions: Number(anchorSessions[0]?.anchor_sessions ?? 0),
    purchased_together: decodeProductRows(purchased),
    cart_together: decodeProductRows(cart),
    start_date: startDate,
    end_date: endDate,
  };
}

export async function fetchProductAffinities(
  config: BigQueryConfig,
  startDate: string,
  endDate: string,
  itemId: string,
  limit = 15,
  options?: FetchCacheOptions,
): Promise<ProductAffinities> {
  const anchorId = itemId.trim();
  return getOrFetchCached(
    config.siteId,
    `product-affinity:${startDate}:${endDate}:${limit}:${anchorId}`,
    () => loadProductAffinitiesFromBigQuery(config, startDate, endDate, anchorId, limit),
    { ...options, ttlMs: ttlForRangeAggregate() },
  );
}
