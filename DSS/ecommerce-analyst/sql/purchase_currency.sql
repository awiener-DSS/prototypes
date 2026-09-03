SELECT
  COALESCE(
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'currency'),
    'missing'
  ) AS currency,
  COUNT(*) AS purchases,
  ROUND(SUM(ecommerce.purchase_revenue), 2) AS revenue
FROM ${EVENTS_TABLE}
WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
  AND event_name = 'purchase'
GROUP BY currency
ORDER BY purchases DESC
