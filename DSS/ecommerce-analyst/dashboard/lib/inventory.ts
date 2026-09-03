/** Resolve SKU / item_id from GA4 event params (zero_stock_view) or items[] (commerce). */
export const ITEM_ID_FROM_EVENT_PARAMS = `COALESCE(
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'item_id'),
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'product_id'),
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'sku'),
  CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'sku') AS STRING)
)`;

export const ITEM_ID_FROM_ITEMS = 'item.item_id';

export type InventoryFrictionRow = {
  item_id: string;
  zero_stock_views: number;
  affected_users: number;
  cart_adds: number;
  cart_users: number;
  purchases: number;
  oos_pattern: 'backorder_allowed' | 'oos_messaging_only';
};

export function classifyOosPattern(zeroStockViews: number, cartAdds: number): InventoryFrictionRow['oos_pattern'] {
  if (zeroStockViews > 0 && cartAdds > 0) return 'backorder_allowed';
  return 'oos_messaging_only';
}

export function oosPatternLabel(pattern: InventoryFrictionRow['oos_pattern']) {
  return pattern === 'backorder_allowed'
    ? 'OOS shown · cart still allowed'
    : 'OOS messaging only';
}

export function inventoryFrictionSql(eventsTable: string, limit = 5) {
  return `
    WITH zero_stock AS (
      SELECT
        ${ITEM_ID_FROM_EVENT_PARAMS} AS item_id,
        COUNT(*) AS zero_stock_views,
        COUNT(DISTINCT COALESCE(NULLIF(user_id, ''), user_pseudo_id)) AS affected_users
      FROM ${eventsTable}
      WHERE event_name = 'zero_stock_view'
      GROUP BY item_id
      HAVING item_id IS NOT NULL AND item_id != ''
    ), commerce AS (
      SELECT
        ${ITEM_ID_FROM_ITEMS} AS item_id,
        COUNTIF(event_name = 'add_to_cart') AS cart_adds,
        COUNTIF(event_name = 'purchase') AS purchases,
        COUNT(DISTINCT IF(
          event_name = 'add_to_cart',
          COALESCE(NULLIF(user_id, ''), user_pseudo_id),
          NULL
        )) AS cart_users
      FROM ${eventsTable}, UNNEST(items) AS item
      WHERE event_name IN ('add_to_cart', 'purchase')
        AND item.item_id IS NOT NULL AND item.item_id != ''
      GROUP BY item_id
    )
    SELECT
      z.item_id,
      z.zero_stock_views,
      z.affected_users,
      COALESCE(c.cart_adds, 0) AS cart_adds,
      COALESCE(c.cart_users, 0) AS cart_users,
      COALESCE(c.purchases, 0) AS purchases,
      IF(COALESCE(c.cart_adds, 0) > 0, 'backorder_allowed', 'oos_messaging_only') AS oos_pattern
    FROM zero_stock AS z
    LEFT JOIN commerce AS c USING (item_id)
    ORDER BY z.zero_stock_views DESC
    LIMIT ${limit}
  `;
}
