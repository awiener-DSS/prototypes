export type CacheSource = 'memory' | 'disk' | 'bigquery';

export type CacheStats = {
  hits: number;
  misses: number;
  sources: CacheSource[];
};

export type FetchCacheOptions = {
  refresh?: boolean;
  latestExportDate?: string | null;
  stats?: CacheStats;
  ttlMs?: number;
};

type CacheEnvelope<T> = {
  version: 1;
  cached_at: string;
  expires_at: string;
  value: T;
};

const LATEST_DAY_TTL_MS = 2 * 60 * 60 * 1000;
const HISTORICAL_DAY_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const AVAILABLE_DATES_TTL_MS = 30 * 60 * 1000;
const RANGE_TTL_MS = 4 * 60 * 60 * 1000;

const memory = new Map<string, CacheEnvelope<unknown>>();

export function createCacheStats(): CacheStats {
  return { hits: 0, misses: 0, sources: [] };
}

export function ttlForExportDay(reportDate: string, latestExportDate: string | null | undefined) {
  if (latestExportDate && reportDate === latestExportDate) return LATEST_DAY_TTL_MS;
  return HISTORICAL_DAY_TTL_MS;
}

export function ttlForAvailableDates() {
  return AVAILABLE_DATES_TTL_MS;
}

export function ttlForRangeAggregate() {
  return RANGE_TTL_MS;
}

function isFresh<T>(envelope: CacheEnvelope<T> | null | undefined) {
  if (!envelope) return false;
  return Date.parse(envelope.expires_at) > Date.now();
}

function cacheDir(siteId: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { join } = require('node:path') as typeof import('node:path');
    return join(process.cwd(), '..', 'data', 'cache', siteId);
  } catch {
    return null;
  }
}

function diskFilePath(siteId: string, key: string) {
  const dir = cacheDir(siteId);
  if (!dir) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { join } = require('node:path') as typeof import('node:path');
    const safeKey = key.replace(/[^a-zA-Z0-9._-]+/g, '__');
    return join(dir, `${safeKey}.json`);
  } catch {
    return null;
  }
}

function readDiskEnvelope<T>(siteId: string, key: string): CacheEnvelope<T> | null {
  const filePath = diskFilePath(siteId, key);
  if (!filePath) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { existsSync, readFileSync } = require('node:fs') as typeof import('node:fs');
    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, 'utf8')) as CacheEnvelope<T>;
  } catch {
    return null;
  }
}

function writeDiskEnvelope<T>(siteId: string, key: string, envelope: CacheEnvelope<T>) {
  const filePath = diskFilePath(siteId, key);
  if (!filePath) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { existsSync, mkdirSync, writeFileSync } = require('node:fs') as typeof import('node:fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { dirname } = require('node:path') as typeof import('node:path');
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
  } catch {
    // Workers without filesystem access keep memory-only cache.
  }
}

function recordHit(stats: CacheStats | undefined, source: CacheSource) {
  if (!stats) return;
  stats.hits += 1;
  stats.sources.push(source);
}

function recordMiss(stats: CacheStats | undefined) {
  if (!stats) return;
  stats.misses += 1;
}

export function buildCacheKey(siteId: string, ...parts: string[]) {
  return `${siteId}:${parts.join(':')}`;
}

export async function getOrFetchCached<T>(
  siteId: string,
  key: string,
  fetcher: () => Promise<T>,
  options?: FetchCacheOptions,
): Promise<T> {
  const memoryKey = `${siteId}::${key}`;
  const stats = options?.stats;

  if (!options?.refresh) {
    const fromMemory = memory.get(memoryKey) as CacheEnvelope<T> | undefined;
    if (isFresh(fromMemory)) {
      recordHit(stats, 'memory');
      return fromMemory!.value;
    }

    const fromDisk = readDiskEnvelope<T>(siteId, key);
    if (isFresh(fromDisk)) {
      memory.set(memoryKey, fromDisk as CacheEnvelope<unknown>);
      recordHit(stats, 'disk');
      return fromDisk!.value;
    }
  }

  recordMiss(stats);
  const value = await fetcher();
  const ttlMs = options?.ttlMs ?? RANGE_TTL_MS;
  const envelope: CacheEnvelope<T> = {
    version: 1,
    cached_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + ttlMs).toISOString(),
    value,
  };
  memory.set(memoryKey, envelope as CacheEnvelope<unknown>);
  writeDiskEnvelope(siteId, key, envelope);
  if (stats) stats.sources.push('bigquery');
  return value;
}

export function writeCachedValue<T>(
  siteId: string,
  key: string,
  value: T,
  ttlMs: number,
) {
  const memoryKey = `${siteId}::${key}`;
  const envelope: CacheEnvelope<T> = {
    version: 1,
    cached_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + ttlMs).toISOString(),
    value,
  };
  memory.set(memoryKey, envelope as CacheEnvelope<unknown>);
  writeDiskEnvelope(siteId, key, envelope);
}
