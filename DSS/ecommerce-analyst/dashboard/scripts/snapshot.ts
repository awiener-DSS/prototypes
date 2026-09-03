#!/usr/bin/env node
/**
 * Pre-warm analytics cache from BigQuery and write disk snapshots.
 *
 * Usage (from dashboard/):
 *   npm run snapshot
 *   npm run snapshot -- --days 14
 *   npm run snapshot -- --site connect_canada --refresh
 *
 * Requires GOOGLE_SERVICE_ACCOUNT_JSON in dashboard/.env.local (or env).
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBigQueryConfig } from '../lib/bigquery.ts';
import { fetchTopSellingProducts } from '../lib/products.ts';
import {
  fetchAvailableDates,
  fetchDayReport,
  fetchPeriodSearches,
  fetchWeekMetrics,
} from '../lib/report-data.ts';
import { getDefaultSiteId, getSiteById } from '../lib/sites.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dashboardDir = join(scriptDir, '..');

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseArgs(argv: string[]) {
  const options = {
    siteId: getDefaultSiteId(),
    days: 7,
    refresh: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--site') {
      options.siteId = argv[index + 1] ?? options.siteId;
      index += 1;
    } else if (arg === '--days') {
      options.days = Number(argv[index + 1] ?? options.days);
      index += 1;
    } else if (arg === '--refresh') {
      options.refresh = true;
    }
  }
  return options;
}

async function main() {
  loadEnvFile(join(dashboardDir, '.env.local'));
  const { siteId, days, refresh } = parseArgs(process.argv.slice(2));
  const site = getSiteById(siteId);
  if (!site) {
    throw new Error(`Unknown site: ${siteId}`);
  }

  const config = await getBigQueryConfig(site);
  const cacheOptions = { refresh };
  const availableDates = await fetchAvailableDates(config, cacheOptions);
  const latestExportDate = availableDates.at(-1) ?? null;
  const exportDates = availableDates.slice(-Math.max(1, days));
  const startDate = exportDates[0];
  const endDate = exportDates.at(-1);

  if (!startDate || !endDate) {
    throw new Error('No GA4 export dates available to snapshot.');
  }

  console.log(`Snapshotting ${site.name} (${siteId})`);
  console.log(`Export days: ${exportDates.join(', ')}`);

  for (const date of exportDates) {
    await fetchDayReport(config, date, { ...cacheOptions, latestExportDate });
    console.log(`  day ${date} cached`);
  }

  await fetchWeekMetrics(config, startDate, endDate, exportDates.length, cacheOptions);
  console.log(`  week metrics ${startDate}-${endDate} cached`);

  await fetchPeriodSearches(config, startDate, endDate, 25, cacheOptions);
  console.log(`  period searches cached`);

  for (const sort of ['orders', 'revenue', 'units'] as const) {
    await fetchTopSellingProducts(config, startDate, endDate, 25, sort, cacheOptions);
    console.log(`  top sellers (${sort}) cached`);
  }

  console.log(`Done. Disk cache: data/cache/${siteId}/`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
