import { getRuntimeEnv } from '@/lib/runtime-env';
import { getActiveSite } from '@/lib/site-context';
import type { AccountSite } from '@/lib/sites';

type ServiceAccount = {
  type?: 'service_account';
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type AuthorizedUser = {
  type: 'authorized_user';
  client_id: string;
  client_secret: string;
  refresh_token: string;
};

type GoogleCredentials = ServiceAccount | AuthorizedUser;
type BigQueryField = { name: string; type: string };
type BigQueryCell = { v: unknown };

export type BigQueryConfig = {
  siteId: string;
  project: string;
  dataset: string;
  location: string;
  accessToken: string;
};

type TokenCacheEntry = {
  token: string;
  expiresAt: number;
};

const tokenCache = new Map<string, TokenCacheEntry>();

function base64Url(input: Uint8Array | string) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemToBytes(pem: string) {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const binary = atob(body);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getAccessToken(credentials: GoogleCredentials) {
  const cacheKey = 'refresh_token' in credentials
    ? `refresh:${credentials.refresh_token}`
    : `sa:${credentials.client_email}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  let accessToken: string;
  if ('refresh_token' in credentials && credentials.refresh_token) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credentials.refresh_token,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
      }),
    });
    if (!response.ok) throw new Error(`Google authentication failed (${response.status})`);
    const payload = await response.json() as { access_token: string };
    accessToken = payload.access_token;
  } else {
  if (!('private_key' in credentials) || !credentials.private_key || !credentials.client_email) {
    throw new Error('Live data credentials are not configured');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/bigquery.readonly https://www.googleapis.com/auth/cloud-platform',
    aud: credentials.token_uri ?? 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBytes(credentials.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch(credentials.token_uri ?? 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!response.ok) throw new Error(`Google authentication failed (${response.status})`);
  const payload = await response.json() as { access_token: string };
  accessToken = payload.access_token;
  }

  tokenCache.set(cacheKey, {
    token: accessToken,
    expiresAt: Date.now() + 50 * 60 * 1000,
  });
  return accessToken;
}

function parseValue(field: BigQueryField, value: unknown) {
  if (value === null || value === undefined) return null;
  if (field.type === 'INTEGER' || field.type === 'FLOAT' || field.type === 'NUMERIC') return Number(value);
  return value;
}

function resolveBigQuerySite(site?: AccountSite): AccountSite {
  if (site) return site;
  const runtimeEnv = getRuntimeEnv();
  return {
    id: 'env',
    name: 'Environment',
    gcpProjectId: runtimeEnv.BIGQUERY_PROJECT_ID ?? 'adam-test-506904',
    ga4Dataset: runtimeEnv.BIGQUERY_DATASET ?? 'analytics_468657312',
    location: runtimeEnv.BIGQUERY_LOCATION ?? 'US',
    icmBaseUrl: runtimeEnv.ICM_BASE_URL ?? '',
    icmSite: runtimeEnv.ICM_SITE ?? '',
  };
}

export async function getBigQueryConfig(site?: AccountSite): Promise<BigQueryConfig> {
  const runtimeEnv = getRuntimeEnv();
  const credentialsRaw = runtimeEnv.GOOGLE_SERVICE_ACCOUNT_JSON;
  const activeSite = resolveBigQuerySite(site ?? await getActiveSite().catch(() => undefined));
  const project = activeSite.gcpProjectId;
  const dataset = activeSite.ga4Dataset;
  const location = activeSite.location;
  if (!credentialsRaw) throw new Error('Live data credentials are not configured');
  if (!/^[A-Za-z0-9_-]+$/.test(project) || !/^[A-Za-z0-9_]+$/.test(dataset)) {
    throw new Error('Invalid data configuration');
  }
  const accessToken = await getAccessToken(JSON.parse(credentialsRaw) as GoogleCredentials);
  return { siteId: activeSite.id, project, dataset, location, accessToken };
}

export async function runBigQuery<T extends Record<string, unknown> = Record<string, unknown>>(
  config: BigQueryConfig,
  sql: string,
): Promise<T[]> {
  const response = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${config.project}/queries`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: sql,
        useLegacySql: false,
        location: config.location,
        maximumBytesBilled: '1000000000',
        timeoutMs: 25000,
      }),
    },
  );
  const result = await response.json() as {
    error?: { message?: string };
    jobComplete?: boolean;
    schema?: { fields: BigQueryField[] };
    rows?: Array<{ f: BigQueryCell[] }>;
  };
  if (!response.ok || result.error) {
    throw new Error(result.error?.message ?? `BigQuery failed (${response.status})`);
  }
  if (!result.jobComplete || !result.schema) {
    throw new Error('BigQuery query did not complete in time');
  }
  return (result.rows ?? []).map((row) => (
    Object.fromEntries(
      result.schema!.fields.map((field, index) => [field.name, parseValue(field, row.f[index]?.v)]),
    ) as T
  ));
}
