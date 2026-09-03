WITH purchases AS (
  SELECT
    ecommerce,
    items,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'currency') AS currency
  FROM ${EVENTS_TABLE}
  WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
    AND event_name = 'purchase'
)
SELECT
  COUNT(*) AS purchase_events,
  COUNT(DISTINCT ecommerce.transaction_id) AS distinct_transactions,
  COUNTIF(ecommerce.transaction_id IS NULL OR ecommerce.transaction_id = '') AS missing_transaction_ids,
  COUNTIF(ecommerce.purchase_revenue IS NULL) AS missing_revenue,
  ROUND(SUM(ecommerce.purchase_revenue), 2) AS revenue,
  ROUND(AVG(ecommerce.purchase_revenue), 2) AS average_order_value,
  MIN(ARRAY_LENGTH(items)) AS minimum_line_items,
  MAX(ARRAY_LENGTH(items)) AS maximum_line_items,
  COUNT(DISTINCT currency) AS currencies
FROM purchases
