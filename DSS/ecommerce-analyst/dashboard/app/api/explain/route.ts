import { NextResponse } from 'next/server';
import { createCacheStats } from '@/lib/analytics-cache';
import { investigateOpportunity } from '@/lib/investigate';
import { groqConfigured } from '@/lib/analyst';
import { catalogConfigured } from '@/lib/catalog';
import {
  fetchAcquisitionQuality,
  fetchLandingPagePerformance,
  fetchTaxonomyPerformance,
} from '@/lib/commerce-signals';
import { fetchAvailableDates, fetchDayReport, fetchPeriodSearches } from '@/lib/report-data';
import { parseDateRangeSearchParams } from '@/lib/date-range';
import { applyLearningBoost, computeLearning, learningContextForPrompt } from '@/lib/learning';
import { commerceSignalOpportunities, hiddenAlignedOpportunities } from '@/lib/opportunities';
import type { Opportunity } from '@/lib/opportunities';
import { readActions, readOutcomes } from '@/lib/server-store';
import { mergeWeeklyOpportunities } from '@/lib/week';
import { getBigQueryConfig } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';

async function loadRangeContext(request: Request, opportunityId?: string | null) {
  const url = new URL(request.url);
  const refresh = url.searchParams.get('refresh') === '1';
  const cacheStats = createCacheStats();
  const cacheOptions = { refresh, stats: cacheStats };

  const config = await getBigQueryConfig();
  const availableDates = await fetchAvailableDates(config, cacheOptions);
  const latestExportDate = availableDates.at(-1) ?? null;
  const dayCacheOptions = { ...cacheOptions, latestExportDate };
  const dateRange = parseDateRangeSearchParams(url.searchParams, availableDates);
  if (!dateRange.export_dates.length) throw new Error('No GA4 export available to explain');

  const dayReports = await Promise.all(
    dateRange.export_dates.map((date) => fetchDayReport(config, date, dayCacheOptions)),
  );
  const latest = dayReports.at(-1);
  if (!latest) throw new Error('No latest day report');

  const [searches, landings, categories, acquisition] = await Promise.all([
    fetchPeriodSearches(
      config,
      dateRange.start_date,
      dateRange.end_date,
      25,
      cacheOptions,
    ),
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
  const opportunities = applyLearningBoost(weekOpportunities, learning);
  const selected = (
    opportunityId
      ? opportunities.find((item) => item.id === opportunityId)
      : opportunities[0]
  ) ?? null;

  return {
    selected,
    opportunities,
    aov: latest.detection.site_aov_usd,
    report_date: String(latest.report_date),
    date_range: dateRange,
    learning,
    cacheStats,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const opportunityId = url.searchParams.get('opportunity_id');
    const { selected, opportunities, aov, report_date, date_range, learning, cacheStats } = await loadRangeContext(
      request,
      opportunityId,
    );
    if (!selected) {
      return NextResponse.json({ error: 'No opportunity available to explain.' }, { status: 404 });
    }

    const investigateDate = 'week_dates' in selected && Array.isArray(selected.week_dates)
      ? selected.week_dates.at(-1) ?? selected.date
      : selected.date;
    const investigation = await investigateOpportunity(
      { ...selected, date: investigateDate },
      { aov, learning_context: learningContextForPrompt(learning) },
    );

    return NextResponse.json({
      report_date,
      date_range,
      week_end: date_range.end_date,
      selected_opportunity: selected,
      investigation,
      learning,
      groq_configured: groqConfigured(),
      catalog_configured: await catalogConfigured(),
      ranked_opportunity_ids: opportunities.map((item) => item.id),
      data_cache: cacheStats,
    }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Explain error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Investigation is temporarily unavailable.' }, { status: 503 });
  }
}
