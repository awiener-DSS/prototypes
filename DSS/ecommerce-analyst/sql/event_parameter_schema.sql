SELECT
  parameter.key AS parameter_name,
  COUNT(*) AS occurrences,
  COUNTIF(parameter.value.string_value IS NOT NULL) AS string_values,
  COUNTIF(parameter.value.int_value IS NOT NULL) AS integer_values,
  COUNTIF(parameter.value.double_value IS NOT NULL) AS double_values
FROM ${EVENTS_TABLE}, UNNEST(event_params) AS parameter
WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
  AND event_name = 'zero_stock_view'
GROUP BY parameter_name
ORDER BY occurrences DESC
