WITH product_items AS (
  SELECT event_name, item
  FROM ${EVENTS_TABLE}, UNNEST(items) AS item
  WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
    AND event_name IN ('view_item', 'add_to_cart', 'purchase')
)
SELECT
  event_name,
  COUNT(*) AS item_rows,
  COUNT(DISTINCT NULLIF(item.item_id, '')) AS distinct_item_ids,
  COUNTIF(item.item_id IS NULL OR item.item_id = '') AS missing_item_ids,
  COUNTIF(item.item_name IS NULL OR item.item_name = '') AS missing_item_names,
  COUNTIF(item.price IS NULL) AS missing_prices,
  COUNTIF(item.quantity IS NULL) AS missing_quantities
FROM product_items
GROUP BY event_name
ORDER BY CASE event_name
  WHEN 'view_item' THEN 1
  WHEN 'add_to_cart' THEN 2
  WHEN 'purchase' THEN 3
END
