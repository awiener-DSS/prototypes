import type { ActionRecord } from '@/lib/actions';
import { verdictFromDelta, type OutcomeRecord } from '@/lib/learning';
import { getBigQueryConfig, runBigQuery, type BigQueryConfig } from '@/lib/bigquery';

type DailyMetricRow = {
  report_date: string;
  metric_value: number;
};

function dateShift(reportDate: string, days: number): string {
  const year = Number(reportDate.slice(0, 4));
  const month = Number(reportDate.slice(4, 6)) - 1;
  const day = Number(reportDate.slice(6, 8));
  const shifted = new Date(Date.UTC(year, month, day + days));
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function metricSeries(
  config: BigQueryConfig,
  action: ActionRecord,
  startDate: string,
  endDate: string,
): Promise<DailyMetricRow[]> {
  const events = `\`${config.project}.${config.dataset}.events_*\``;
  const sku = String(action.metadata?.item_id ?? '').replace(/'/g, "\\'");
  const term = String(action.metadata?.search_term ?? '').replace(/'/g, "\\'");

  if (action.target_metric === 'zero_stock_views' && sku) {
    return runBigQuery<DailyMetricRow>(config, `
      SELECT _TABLE_SUFFIX AS report_date, COUNT(*) AS metric_value
      FROM ${events}
      WHERE _TABLE_SUFFIX BETWEEN '${startDate}' AND '${endDate}'
        AND event_name = 'zero_stock_view'
        AND COALESCE(
          (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'item_id'),
          (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'product_id'),
          (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'sku'),
          ''
        ) = '${sku}'
      GROUP BY report_date
      ORDER BY report_date
    `);
  }

  if (action.target_metric === 'search_result_view_rate' && term) {
    return runBigQuery<DailyMetricRow>(config, `
      SELECT _TABLE_SUFFIX AS report_date,
        SAFE_DIVIDE(
          COUNTIF(event_name = 'view_search_results'),
          NULLIF(COUNTIF(event_name = 'search'), 0)
        ) AS metric_value
      FROM ${events}
      WHERE _TABLE_SUFFIX BETWEEN '${startDate}' AND '${endDate}'
        AND event_name IN ('search', 'view_search_results', 'search_no_results', 'search_page_view')
        AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'search_term') = '${term}'
      GROUP BY report_date
      HAVING metric_value IS NOT NULL
      ORDER BY report_date
    `);
  }

  if (action.target_metric === 'view_to_cart_rate') {
    return runBigQuery<DailyMetricRow>(config, `
      WITH actors AS (
        SELECT _TABLE_SUFFIX AS report_date,
          COALESCE(NULLIF(user_id, ''), user_pseudo_id) AS actor_id,
          LOGICAL_OR(event_name = 'view_item') AS viewed,
          LOGICAL_OR(event_name = 'add_to_cart') AS added
        FROM ${events}
        WHERE _TABLE_SUFFIX BETWEEN '${startDate}' AND '${endDate}'
        GROUP BY report_date, actor_id
      )
      SELECT report_date,
        SAFE_DIVIDE(COUNTIF(added), COUNTIF(viewed)) AS metric_value
      FROM actors
      GROUP BY report_date
      HAVING metric_value IS NOT NULL
      ORDER BY report_date
    `);
  }

  return runBigQuery<DailyMetricRow>(config, `
    WITH daily AS (
      SELECT _TABLE_SUFFIX AS report_date,
        COUNTIF(event_name = 'session_start') AS sessions,
        SUM(IF(event_name = 'purchase', ecommerce.purchase_revenue_in_usd, 0)) AS revenue_usd
      FROM ${events}
      WHERE _TABLE_SUFFIX BETWEEN '${startDate}' AND '${endDate}'
      GROUP BY report_date
    )
    SELECT report_date, SAFE_DIVIDE(revenue_usd, NULLIF(sessions, 0)) AS metric_value
    FROM daily
    WHERE metric_value IS NOT NULL
    ORDER BY report_date
  `);
}

export async function measureActionOutcome(action: ActionRecord): Promise<OutcomeRecord> {
  const appliedAt = action.applied_at ?? action.created_at;
  const anchor = appliedAt.slice(0, 10).replace(/-/g, '');
  const beforeStart = dateShift(anchor, -7);
  const beforeEnd = dateShift(anchor, -1);
  const afterStart = anchor;
  const afterEnd = dateShift(anchor, 7);

  const config = await getBigQueryConfig();
  const [beforeRows, afterRows] = await Promise.all([
    metricSeries(config, action, beforeStart, beforeEnd),
    metricSeries(config, action, afterStart, afterEnd),
  ]);

  const beforeValue = average(beforeRows.map((row) => Number(row.metric_value ?? 0)));
  const afterValue = average(afterRows.map((row) => Number(row.metric_value ?? 0)));
  const deltaPct = beforeValue && afterValue != null
    ? (afterValue - beforeValue) / Math.abs(beforeValue || 1)
    : null;

  return {
    action_id: action.id,
    category: action.category,
    fix_type: action.fix_type,
    target_metric: action.target_metric,
    before_value: beforeValue,
    after_value: afterValue,
    delta_pct: deltaPct,
    verdict: verdictFromDelta(deltaPct, beforeRows.length, afterRows.length),
    before_days: beforeRows.length,
    after_days: afterRows.length,
    measured_at: new Date().toISOString(),
  };
}
