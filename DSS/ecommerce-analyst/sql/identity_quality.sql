SELECT
  COUNT(*) AS events,
  COUNT(DISTINCT user_pseudo_id) AS browser_users,
  COUNT(DISTINCT user_id) AS authenticated_users,
  COUNTIF(user_id IS NOT NULL AND user_id != '') AS identified_events,
  SAFE_DIVIDE(
    COUNTIF(user_id IS NOT NULL AND user_id != ''),
    COUNT(*)
  ) AS identified_event_rate
FROM ${EVENTS_TABLE}
WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date

