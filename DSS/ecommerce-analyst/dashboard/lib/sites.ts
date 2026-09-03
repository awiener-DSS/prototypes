import { env } from 'cloudflare:workers';

export type AccountSite = {
  id: string;
  name: string;
  gcpProjectId: string;
  ga4Dataset: string;
  location: string;
  icmBaseUrl: string;
  icmSite: string;
};

type SitesRegistry = {
  defaultSiteId: string;
  sites: AccountSite[];
};

const FALLBACK_SITES: SitesRegistry = {
  defaultSiteId: 'connect_canada',
  sites: [
    {
      id: 'connect_canada',
      name: 'SureWerx - Connect Canada',
      gcpProjectId: 'adam-test-506904',
      ga4Dataset: 'analytics_468657312',
      location: 'US',
      icmBaseUrl: 'https://connect.surewerx.com',
      icmSite: 'SUREWERX-SWC_CA-Site',
    },
  ],
};

function normalizeSite(raw: Partial<AccountSite> & { id?: string }): AccountSite | null {
  const id = String(raw.id ?? '').trim();
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
  const gcpProjectId = String(raw.gcpProjectId ?? '').trim();
  const ga4Dataset = String(raw.ga4Dataset ?? '').trim();
  const name = String(raw.name ?? id).trim() || id;
  const location = String(raw.location ?? 'US').trim() || 'US';
  return {
    id,
    name,
    gcpProjectId,
    ga4Dataset,
    location,
    icmBaseUrl: String(raw.icmBaseUrl ?? '').trim(),
    icmSite: String(raw.icmSite ?? '').trim(),
  };
}

function parseRegistryJson(raw: string): SitesRegistry | null {
  try {
    const parsed = JSON.parse(raw) as {
      defaultSiteId?: string;
      default_site?: string;
      sites?: Array<Partial<AccountSite> & { id?: string }>;
    };
    const sites = (parsed.sites ?? [])
      .map((site) => normalizeSite(site))
      .filter((site): site is AccountSite => Boolean(site));
    if (!sites.length) return null;
    const defaultSiteId = String(parsed.defaultSiteId ?? parsed.default_site ?? sites[0].id).trim();
    return { defaultSiteId, sites };
  } catch {
    return null;
  }
}

function loadRegistry(): SitesRegistry {
  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  const fromWorker = runtimeEnv.SITES_REGISTRY_JSON?.trim();
  if (fromWorker) {
    const parsed = parseRegistryJson(fromWorker);
    if (parsed) return parsed;
  }

  if (typeof process !== 'undefined') {
    const fromProcess = process.env.SITES_REGISTRY_JSON?.trim();
    if (fromProcess) {
      const parsed = parseRegistryJson(fromProcess);
      if (parsed) return parsed;
    }
  }

  return FALLBACK_SITES;
}

let cachedRegistry: SitesRegistry | null = null;

export function getSitesRegistry(): SitesRegistry {
  if (!cachedRegistry) cachedRegistry = loadRegistry();
  return cachedRegistry;
}

export function listAccountSites(): AccountSite[] {
  return getSitesRegistry().sites;
}

export function listSignInAccounts(): Array<{ id: string; name: string }> {
  return listAccountSites().map(({ id, name }) => ({ id, name }));
}

export function getDefaultSiteId(): string {
  const registry = getSitesRegistry();
  if (registry.sites.some((site) => site.id === registry.defaultSiteId)) {
    return registry.defaultSiteId;
  }
  return registry.sites[0]?.id ?? FALLBACK_SITES.defaultSiteId;
}

export function getSiteById(siteId: string): AccountSite | null {
  const id = siteId.trim();
  if (!id) return null;
  return listAccountSites().find((site) => site.id === id) ?? null;
}

export function resolveSiteId(siteId?: string | null): string {
  const candidate = siteId?.trim();
  if (candidate && getSiteById(candidate)) return candidate;
  return getDefaultSiteId();
}

export function isValidSiteId(siteId: string): boolean {
  return Boolean(getSiteById(siteId));
}
