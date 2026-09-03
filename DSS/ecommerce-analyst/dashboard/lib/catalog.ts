import { env } from 'cloudflare:workers';
import { getActiveSite } from '@/lib/site-context';
import type { AccountSite } from '@/lib/sites';
import { decodeHtmlEntities, decodeProductName } from '@/lib/text';

export type ProductLink = {
  sku: string;
  title: string;
  link_type: string;
  description: string;
};

export type ProductContext = {
  sku: string;
  name: string | null;
  manufacturer: string | null;
  detail_available: boolean;
  related: ProductLink[];
  source: 'icm';
  warnings: string[];
};

type IcmConfig = {
  baseUrl: string;
  site: string;
  authMode: string;
  username: string;
  password: string;
  organization: string;
};

const USER_AGENT = 'Mozilla/5.0 (compatible; CommerceAnalyst/1.0; +read-only)';
const STOCK_WARNING = 'ICM stock/availability is not loaded for this site — do not treat catalog stock fields as truth.';

function catalogConfigFromSite(site: AccountSite, runtimeEnv: Record<string, string | undefined>): IcmConfig | null {
  const baseUrl = (site.icmBaseUrl || runtimeEnv.ICM_BASE_URL || '').trim().replace(/\/$/, '');
  const icmSite = (site.icmSite || runtimeEnv.ICM_SITE || '').trim();
  if (!baseUrl || !icmSite) return null;
  return {
    baseUrl,
    site: icmSite,
    authMode: (runtimeEnv.ICM_AUTH_MODE ?? 'anonymous').trim().toLowerCase() || 'anonymous',
    username: (runtimeEnv.ICM_USERNAME ?? '').trim(),
    password: (runtimeEnv.ICM_PASSWORD ?? '').trim(),
    organization: (runtimeEnv.ICM_ORGANIZATION ?? '').trim(),
  };
}

async function catalogConfig(): Promise<IcmConfig | null> {
  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  const site = await getActiveSite().catch(() => null);
  if (!site) {
    const baseUrl = (runtimeEnv.ICM_BASE_URL ?? '').trim().replace(/\/$/, '');
    const icmSite = (runtimeEnv.ICM_SITE ?? '').trim();
    if (!baseUrl || !icmSite) return null;
    return catalogConfigFromSite({
      id: 'env',
      name: 'Environment',
      gcpProjectId: '',
      ga4Dataset: '',
      location: 'US',
      icmBaseUrl: baseUrl,
      icmSite,
    }, runtimeEnv);
  }
  return catalogConfigFromSite(site, runtimeEnv);
}

export async function catalogConfigured() {
  return Boolean(await catalogConfig());
}

function restRoot(config: IcmConfig) {
  return `${config.baseUrl}/INTERSHOP/rest/WFS/${config.site}/-`;
}

async function getAccessToken(config: IcmConfig): Promise<string> {
  let body = 'grant_type=anonymous';
  if (config.authMode === 'password') {
    const form = new URLSearchParams({
      grant_type: 'password',
      username: config.username,
      password: config.password,
    });
    if (config.organization) form.set('organization', config.organization);
    body = form.toString();
  } else if (config.authMode !== 'anonymous') {
    throw new Error(`Unsupported ICM auth mode: ${config.authMode}`);
  }

  const response = await fetch(`${restRoot(config)}/token`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': USER_AGENT,
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`ICM token failed (${response.status})`);
  }
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error('ICM token response missing access_token');
  return payload.access_token;
}

async function icmGet<T>(config: IcmConfig, path: string, accept = 'application/json'): Promise<T> {
  const token = await getAccessToken(config);
  const response = await fetch(`${restRoot(config)}/${path.replace(/^\//, '')}`, {
    headers: {
      accept,
      authorization: `Bearer ${token}`,
      'user-agent': USER_AGENT,
    },
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 240);
    throw new Error(`ICM ${response.status}: ${detail}`);
  }
  return await response.json() as T;
}

function attrValue(payload: Record<string, unknown>, name: string): string | null {
  const attrs = payload.attributes;
  if (Array.isArray(attrs)) {
    for (const item of attrs) {
      const row = item as { name?: string; value?: unknown };
      if (String(row.name ?? '').toLowerCase() === name.toLowerCase()) {
        return row.value == null ? null : String(row.value);
      }
    }
  }
  return null;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function getProduct(sku: string): Promise<ProductContext | null> {
  const config = await catalogConfig();
  if (!config || !sku.trim()) return null;
  const clean = sku.trim();
  const warnings: string[] = [STOCK_WARNING];
  let name: string | null = null;
  let manufacturer: string | null = null;
  let detailAvailable = false;

  try {
    const detail = await icmGet<Record<string, unknown>>(config, `products/${encodeURIComponent(clean)}`);
    name = String(detail.name ?? detail.title ?? detail.productName ?? '') || null;
    manufacturer = attrValue(detail, 'manufacturer');
    detailAvailable = true;
  } catch (error) {
    warnings.push(`Product detail endpoint unavailable (${error instanceof Error ? error.message : 'error'}).`);
  }

  const related = await findRelatedProducts(clean);
  if (!name && related[0]?.title) {
    name = related[0].title;
    warnings.push('Product name inferred from a related/accessory title.');
  }

  return {
    sku: clean,
    name: decodeProductName(name),
    manufacturer: decodeProductName(manufacturer),
    detail_available: detailAvailable,
    related,
    source: 'icm',
    warnings,
  };
}

export async function findRelatedProducts(sku: string): Promise<ProductLink[]> {
  const config = await catalogConfig();
  if (!config || !sku.trim()) return [];
  try {
    const payload = await icmGet<{
      elements?: Array<{ linkType?: string; productLinks?: Array<{ uri?: string; title?: string; description?: string }> }>;
    }>(config, `products/${encodeURIComponent(sku.trim())}/links`);
    const related: ProductLink[] = [];
    for (const group of payload.elements ?? []) {
      for (const link of group.productLinks ?? []) {
        const linkedSku = String(link.uri ?? '').replace(/\/$/, '').split('/').pop() ?? '';
        if (!linkedSku) continue;
        related.push({
          sku: linkedSku,
          title: decodeHtmlEntities(String(link.title ?? '')),
          link_type: String(group.linkType ?? ''),
          description: stripHtml(String(link.description ?? '')).slice(0, 400),
        });
      }
    }
    return related;
  } catch {
    return [];
  }
}

export async function searchCatalog(query: string, limit = 5): Promise<ProductContext[]> {
  const config = await catalogConfig();
  if (!config || !query.trim()) return [];
  const params = new URLSearchParams({
    searchTerm: query.trim(),
    amount: String(Math.max(1, Math.min(limit, 20))),
    attrs: 'sku,name,manufacturer',
  });
  const payload = await icmGet<{
    elements?: Array<Record<string, unknown>>;
  }>(config, `products?${params.toString()}`);
  return (payload.elements ?? []).map((element) => {
    const uri = String(element.uri ?? '');
    const sku = attrValue(element, 'sku') || uri.replace(/\/$/, '').split('/').pop() || '';
    return {
      sku,
      name: decodeProductName(String(element.title ?? '') || attrValue(element, 'name')),
      manufacturer: decodeProductName(attrValue(element, 'manufacturer')),
      detail_available: true,
      related: [],
      source: 'icm' as const,
      warnings: [STOCK_WARNING],
    };
  }).filter((item) => item.sku);
}
