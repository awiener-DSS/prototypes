SELECT
  NET.HOST((
    SELECT value.string_value
    FROM UNNEST(event_params)
    WHERE key = 'page_location'
  )) AS hostname,
  COUNT(*) AS events,
  COUNT(DISTINCT user_pseudo_id) AS users
FROM ${EVENTS_TABLE}
WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
GROUP BY hostname
ORDER BY events DESC
