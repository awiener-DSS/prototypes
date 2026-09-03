WITH searches AS (
  SELECT
    event_name,
    user_pseudo_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'search_term') AS search_term
  FROM ${EVENTS_TABLE}
  WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
    AND event_name IN ('search', 'search_page_view', 'view_search_results', 'search_no_results')
)
SELECT
  event_name,
  COUNT(*) AS events,
  COUNT(DISTINCT user_pseudo_id) AS users,
  COUNTIF(search_term IS NOT NULL AND search_term != '') AS events_with_search_term,
  COUNT(DISTINCT NULLIF(search_term, '')) AS distinct_search_terms
FROM searches
GROUP BY event_name
ORDER BY events DESC
