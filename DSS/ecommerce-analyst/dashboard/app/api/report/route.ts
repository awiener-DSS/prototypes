import { NextResponse } from 'next/server';
import { createCacheStats } from '@/lib/analytics-cache';
import { applyLearningBoost, computeLearning, learningContextForPrompt } from '@/lib/learning';
import { readActions, readOutcomes } from '@/lib/server-store';
import { fetchAvailableDates, fetchDayReport, fetchPeriodSearches, fetchWeekMetrics } from '@/lib/report-data';
import { parseDateRangeSearchParams } from '@/lib/date-range';
import { getBigQueryConfig } from '@/lib/bigquery';
import { mergeWeeklyOpportunities } from '@/lib/week';
import { commerceSignalOpportunities, hiddenAlignedOpportunities } from '@/lib/opportunities';
import type { Opportunity } from '@/lib/opportunities';
import {
  fetchAcquisitionQuality,
  fetchLandingPagePerformance,
  fetchTaxonomyPerformance,
} from '@/lib/commerce-signals';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const refresh = url.searchParams.get('refresh') === '1';
    const cacheStats = createCacheStats();
    const cacheOptions = { refresh, stats: cacheStats };

    const config = await getBigQueryConfig();
    const availableDates = await fetchAvailableDates(config, cacheOptions);
    const latestExportDate = availableDates.at(-1) ?? null;
    const dayCacheOptions = { ...cacheOptions, latestExportDate };
    const dateRange = parseDateRangeSearchParams(url.searchParams, availableDates);
    if (!dateRange.export_dates.length) {
      return NextResponse.json({ error: 'No GA4 exports in the selected date range.' }, { status: 404 });
    }

    const dayReports = await Promise.all(
      dateRange.export_dates.map((date) => fetchDayReport(config, date, dayCacheOptions)),
    );
    const latest = dayReports.at(-1);
    if (!latest) throw new Error('No latest day report');

    const searches = await fetchPeriodSearches(
      config,
      dateRange.start_date,
      dateRange.end_date,
      25,
      cacheOptions,
    );

    const [landings, categories, acquisition] = await Promise.all([
      fetchLandingPagePerformance(config, dateRange.start_date, dateRange.end_date, cacheOptions),
      fetchTaxonomyPerformance(config, dateRange.start_date, dateRange.end_date, 'category', cacheOptions),
      fetchAcquisitionQuality(config, dateRange.start_date, dateRange.end_date, cacheOptions),
    ]);

    const dailyOpportunities = dayReports.flatMap((report) => report.opportunities as Opportunity[]);
    const alignedOpportunities = hiddenAlignedOpportunities(
      String(latest.report_date),
      searches,
      latest.products ?? [],
      latest.inventory,
      latest.detection?.site_aov_usd ?? null,
    );
    const signalOpportunities = commerceSignalOpportunities(
      String(latest.report_date),
      landings,
      categories,
      acquisition,
      latest.detection?.site_aov_usd ?? null,
    );
    const weekOpportunities = mergeWeeklyOpportunities([
      ...dailyOpportunities,
      ...alignedOpportunities,
      ...signalOpportunities,
    ]);

    const actions = readActions();
    const outcomes = readOutcomes();
    const learning = computeLearning(actions.actions, outcomes.items);
    const rankedOpportunities = applyLearningBoost(weekOpportunities, learning).slice(0, 12);
    const allOpportunities = applyLearningBoost(weekOpportunities, learning);
    const weekMetrics = await fetchWeekMetrics(
      config,
      dateRange.start_date,
      dateRange.end_date,
      dateRange.export_days,
      cacheOptions,
    );

    const history = dayReports.map((report) => ({
      report_date: String(report.report_date),
      events: Number(report.events ?? 0),
      users: Number(report.users ?? 0),
      sessions: Number(report.sessions ?? 0),
      purchases: Number(report.purchases ?? 0),
      revenue_usd: Number(report.revenue_usd ?? 0),
      view_to_cart_rate: Number(report.view_to_cart_rate ?? 0),
      checkout_conversion_rate: Number(report.checkout_conversion_rate ?? 0),
    }));

    return NextResponse.json({
      source: cacheStats.misses === 0 && cacheStats.hits > 0
        ? 'Cache · GA4 daily export'
        : 'BigQuery · GA4 daily export',
      refreshed_at: new Date().toISOString(),
      data_cache: cacheStats,
      report_date: latest.report_date,
      date_range: dateRange,
      week_end: dateRange.end_date,
      week_start: dateRange.start_date,
      week_dates: dateRange.export_dates,
      week_totals: {
        revenue_usd: weekMetrics.revenue_usd,
        purchases: weekMetrics.purchases,
        sessions: weekMetrics.sessions,
        days: weekMetrics.days,
      },
      week_metrics: weekMetrics,
      latest_day: {
        report_date: latest.report_date,
        revenue_usd: Number(latest.revenue_usd ?? 0),
        purchases: Number(latest.purchases ?? 0),
        sessions: Number(latest.sessions ?? 0),
        events: Number(latest.events ?? 0),
      },
      events: latest.events,
      users: latest.users,
      authenticated_users: latest.authenticated_users,
      sessions: latest.sessions,
      purchases: latest.purchases,
      purchasing_users: latest.purchasing_users,
      revenue_usd: latest.revenue_usd,
      viewed_users: latest.viewed_users,
      cart_users: latest.cart_users,
      checkout_users: latest.checkout_users,
      purchasers: latest.purchasers,
      view_to_cart_rate: latest.view_to_cart_rate,
      checkout_conversion_rate: latest.checkout_conversion_rate,
      inventory: latest.inventory,
      searches,
      products: latest.products,
      landings,
      categories,
      acquisition,
      history,
      opportunities: rankedOpportunities,
      all_opportunities: allOpportunities,
      learning,
      learning_context: learningContextForPrompt(learning),
      detection: latest.detection,
      available_dates: availableDates,
    }, {
      headers: {
        'Cache-Control': refresh ? 'private, no-store' : 'private, max-age=300, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Live report error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Live Connect Canada data is temporarily unavailable.' }, { status: 503 });
  }
}
