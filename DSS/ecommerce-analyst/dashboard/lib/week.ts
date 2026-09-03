import type { Opportunity } from '@/lib/opportunities';
import { averageMonthlyEstimates } from '@/lib/revenue-impact';

export type WeekOpportunity = Opportunity & {
  week_dates: string[];
  day_count: number;
  merge_key: string;
  learning_boost?: number;
  adjusted_score?: number;
};

export function opportunityMergeKey(opportunity: Opportunity): string {
  if (opportunity.category === 'Inventory') {
    return `inventory:${String(opportunity.metrics.item_id ?? opportunity.id)}`;
  }
  if (opportunity.category === 'Search') {
    return `search:${String(opportunity.metrics.search_term ?? opportunity.id)}`;
  }
  if (opportunity.category === 'Landing') {
    return `landing:${String(opportunity.metrics.landing_path ?? opportunity.id)}`;
  }
  if (opportunity.category === 'Taxonomy') {
    return `taxonomy:${String(opportunity.metrics.dimension ?? '')}:${String(opportunity.metrics.taxonomy_value ?? opportunity.id)}`;
  }
  if (opportunity.category === 'Acquisition') {
    return `acq:${String(opportunity.metrics.source ?? '')}:${String(opportunity.metrics.medium ?? '')}:${String(opportunity.metrics.campaign ?? opportunity.id)}`;
  }
  if (opportunity.category === 'Funnel' && opportunity.metrics.item_id) {
    return `product:${String(opportunity.metrics.item_id)}`;
  }
  if (opportunity.category === 'Funnel') {
    return 'funnel:view-cart';
  }
  return `anomaly:${opportunity.id}`;
}

export function mergeWeeklyOpportunities(dailyOpportunities: Opportunity[]): WeekOpportunity[] {
  const groups = new Map<string, Opportunity[]>();

  for (const opportunity of dailyOpportunities) {
    const key = opportunityMergeKey(opportunity);
    const group = groups.get(key) ?? [];
    group.push(opportunity);
    groups.set(key, group);
  }

  const merged = [...groups.entries()].map(([key, opportunities]) => {
    const dates = [...new Set(opportunities.map((opportunity) => opportunity.date))].sort();
    const representative = [...opportunities].sort((left, right) => {
      const oosDelta = Number(right.metrics.out_of_stock ?? 0) - Number(left.metrics.out_of_stock ?? 0);
      if (oosDelta !== 0) return oosDelta;
      const stockDelta = (Number(right.metrics.zero_stock_views) || 0) - (Number(left.metrics.zero_stock_views) || 0);
      if (stockDelta !== 0) return stockDelta;
      return (right.estimated_monthly_revenue_usd ?? -1) - (left.estimated_monthly_revenue_usd ?? -1);
    })[0];
    const averagedMonthly = averageMonthlyEstimates(opportunities.map((opportunity) => opportunity.estimated_monthly_revenue_usd));
    const evidence = [
      dates.length > 1
        ? `Seen on ${dates.length} days in the selected range`
        : null,
      ...new Set(opportunities.flatMap((opportunity) => opportunity.evidence)),
    ].filter((item): item is string => Boolean(item)).slice(0, 8);

    const mergedMetrics = Object.assign({}, ...opportunities.map((opportunity) => opportunity.metrics)) as Opportunity['metrics'];
    const zeroStockViews = opportunities.reduce(
      (sum, opportunity) => sum + (Number(opportunity.metrics.zero_stock_views) || 0),
      0,
    );
    const outOfStock = opportunities.some((opportunity) => (
      Number(opportunity.metrics.out_of_stock) === 1
      || (Number(opportunity.metrics.zero_stock_views) || 0) > 0
    ));
    if (zeroStockViews > 0 || 'out_of_stock' in mergedMetrics || 'zero_stock_views' in mergedMetrics) {
      mergedMetrics.zero_stock_views = zeroStockViews;
      mergedMetrics.out_of_stock = outOfStock ? 1 : 0;
    }

    return {
      ...representative,
      id: `week-${key.replace(/[:]/g, '-')}`,
      merge_key: key,
      confidence: Math.max(...opportunities.map((opportunity) => opportunity.confidence)),
      estimated_monthly_revenue_usd: averagedMonthly,
      impact: impactFromRevenue(averagedMonthly),
      week_dates: dates,
      day_count: dates.length,
      evidence,
      metrics: mergedMetrics,
    } satisfies WeekOpportunity;
  });

  return merged.sort((a, b) => {
    const revenueDelta = (b.estimated_monthly_revenue_usd ?? -1) - (a.estimated_monthly_revenue_usd ?? -1);
    if (revenueDelta !== 0) return revenueDelta;
    return b.confidence - a.confidence;
  });
}

function impactFromRevenue(monthly: number | null): Opportunity['impact'] {
  if (monthly == null) return 'Medium';
  if (monthly >= 5000) return 'High';
  if (monthly >= 1000) return 'Medium';
  return 'Low';
}

export const PRODUCT_ANALYTICS_WINDOW_DAYS = 90;

export function weekDatesEndingOn(historyDates: string[], weekEnd: string, size = 7): string[] {
  const sorted = [...new Set(historyDates)].sort();
  const endIndex = sorted.lastIndexOf(weekEnd);
  if (endIndex < 0) return sorted.slice(-size);
  return sorted.slice(Math.max(0, endIndex - size + 1), endIndex + 1);
}

export function rollingWindowRange(
  historyDates: string[],
  endDate: string,
  maxDays = PRODUCT_ANALYTICS_WINDOW_DAYS,
): { startDate: string; endDate: string; dates: string[]; windowDays: number } {
  const dates = weekDatesEndingOn(historyDates, endDate, maxDays);
  return {
    startDate: dates[0] ?? endDate,
    endDate,
    dates,
    windowDays: maxDays,
  };
}

export function sumWeekHistory<T extends { report_date: string; revenue_usd: number; purchases: number; sessions: number }>(
  history: T[],
  weekDates: string[],
) {
  const selected = history.filter((day) => weekDates.includes(day.report_date));
  return {
    revenue_usd: selected.reduce((sum, day) => sum + day.revenue_usd, 0),
    purchases: selected.reduce((sum, day) => sum + day.purchases, 0),
    sessions: selected.reduce((sum, day) => sum + day.sessions, 0),
    days: selected.length,
  };
}
