WITH ecommerce_events AS (
  SELECT event_name, user_pseudo_id, user_id, ecommerce, items
  FROM ${EVENTS_TABLE}
  WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
    AND event_name IN ('view_item', 'add_to_cart', 'begin_checkout', 'purchase')
)
SELECT
  event_name,
  COUNT(*) AS events,
  COUNT(DISTINCT user_pseudo_id) AS browser_users,
  COUNT(DISTINCT user_id) AS authenticated_users,
  COUNTIF(ARRAY_LENGTH(items) > 0) AS events_with_items,
  COUNTIF(EXISTS(
    SELECT 1 FROM UNNEST(items) AS item
    WHERE item.item_id IS NOT NULL AND item.item_id != ''
  )) AS events_with_item_id,
  COUNTIF(ecommerce.transaction_id IS NOT NULL AND ecommerce.transaction_id != '') AS events_with_transaction_id,
  COUNTIF(ecommerce.purchase_revenue IS NOT NULL) AS events_with_revenue,
  ROUND(SUM(IFNULL(ecommerce.purchase_revenue, 0)), 2) AS revenue
FROM ecommerce_events
GROUP BY event_name
ORDER BY CASE event_name
  WHEN 'view_item' THEN 1
  WHEN 'add_to_cart' THEN 2
  WHEN 'begin_checkout' THEN 3
  WHEN 'purchase' THEN 4
END

