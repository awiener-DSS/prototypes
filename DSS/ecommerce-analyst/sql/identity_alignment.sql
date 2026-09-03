WITH identity_events AS (
  SELECT
    user_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'userid') AS userid_parameter,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'connect_user_id') AS connect_user_id
  FROM ${EVENTS_TABLE}
  WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
)
SELECT
  COUNT(*) AS events,
  COUNTIF(user_id IS NOT NULL AND user_id != '') AS events_with_ga4_user_id,
  COUNTIF(userid_parameter IS NOT NULL AND userid_parameter != '') AS events_with_userid_parameter,
  COUNTIF(connect_user_id IS NOT NULL AND connect_user_id != '') AS events_with_connect_user_id,
  COUNTIF(user_id = userid_parameter) AS ga4_user_id_matches_userid,
  COUNTIF(user_id = connect_user_id) AS ga4_user_id_matches_connect_user_id
FROM identity_events

