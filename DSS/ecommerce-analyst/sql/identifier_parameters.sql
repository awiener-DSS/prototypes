SELECT
  parameter.key AS parameter_name,
  COUNT(*) AS occurrences,
  COUNT(DISTINCT COALESCE(
    parameter.value.string_value,
    CAST(parameter.value.int_value AS STRING)
  )) AS distinct_values
FROM ${EVENTS_TABLE}, UNNEST(event_params) AS parameter
WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
  AND REGEXP_CONTAINS(
    LOWER(parameter.key),
    r'(account|customer|company|organization|user|dealer|branch)'
  )
GROUP BY parameter_name
ORDER BY occurrences DESC

