import { NextResponse } from 'next/server';
import { createCacheStats } from '@/lib/analytics-cache';
import { getBigQueryConfig } from '@/lib/bigquery';
import { parseDateRangeSearchParams } from '@/lib/date-range';
import { fetchAvailableDates } from '@/lib/report-data';
import {
  fetchProductAffinities,
  fetchTopSellingProducts,
  searchProducts,
} from '@/lib/products';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const refresh = url.searchParams.get('refresh') === '1';
    const cacheStats = createCacheStats();
    const cacheOptions = { refresh, stats: cacheStats };

    const config = await getBigQueryConfig();
    const availableDates = await fetchAvailableDates(config, cacheOptions);
    const dateRange = parseDateRangeSearchParams(url.searchParams, availableDates);
    if (!dateRange.export_dates.length) {
      return NextResponse.json({ error: 'No GA4 exports in the selected date range.' }, { status: 404 });
    }

    const startDate = dateRange.start_date;
    const endDate = dateRange.end_date;
    const itemId = url.searchParams.get('item_id')?.trim();
    const query = url.searchParams.get('q')?.trim();
    const sortParam = url.searchParams.get('sort');
    const sort = sortParam === 'units' ? 'units' : sortParam === 'revenue' ? 'revenue' : 'orders';
    const meta = {
      date_range: dateRange,
      start_date: startDate,
      end_date: endDate,
      window_days: dateRange.export_days,
      days_available: dateRange.export_days,
    };

    if (query && query.length >= 2) {
      const matches = await searchProducts(config, startDate, endDate, query, 10, cacheOptions);
      return NextResponse.json({
        mode: 'search',
        ...meta,
        query,
        matches,
        data_cache: cacheStats,
      }, { headers: { 'Cache-Control': refresh ? 'private, no-store' : 'private, max-age=300' } });
    }

    if (itemId) {
      const affinities = await fetchProductAffinities(config, startDate, endDate, itemId, 15, cacheOptions);
      return NextResponse.json({
        mode: 'affinity',
        ...meta,
        ...affinities,
        data_cache: cacheStats,
      }, { headers: { 'Cache-Control': refresh ? 'private, no-store' : 'private, max-age=300' } });
    }

    const products = await fetchTopSellingProducts(config, startDate, endDate, 25, sort, cacheOptions);
    return NextResponse.json({
      mode: 'top_sellers',
      ...meta,
      sort,
      products,
      data_cache: cacheStats,
    }, { headers: { 'Cache-Control': refresh ? 'private, no-store' : 'private, max-age=300' } });
  } catch (error) {
    console.error('Products API error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Product analytics are temporarily unavailable.' }, { status: 503 });
  }
}
