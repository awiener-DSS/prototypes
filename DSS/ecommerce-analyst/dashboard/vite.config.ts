import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import hostingConfig from './.openai/hosting.json';
import { sitesRegistryJsonForBuild } from './lib/load-sites-registry';

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const sitesRegistryJson = sitesRegistryJsonForBuild();

const localRuntimeVars = Object.fromEntries(
  [
    'GOOGLE_SERVICE_ACCOUNT_JSON',
    'BIGQUERY_PROJECT_ID',
    'BIGQUERY_DATASET',
    'BIGQUERY_LOCATION',
    'GROQ_API_KEY',
    'GROQ_MODEL',
    'ICM_BASE_URL',
    'ICM_SITE',
    'ICM_AUTH_MODE',
    'ICM_USERNAME',
    'ICM_PASSWORD',
    'ICM_ORGANIZATION',
    'DASHBOARD_AUTH_EMAIL',
    'DASHBOARD_AUTH_PASSWORD',
    'AUTH_SECRET',
    ...(sitesRegistryJson ? [['SITES_REGISTRY_JSON', sitesRegistryJson] as const] : []),
  ]
    .map((key) => (Array.isArray(key) ? key : [key, process.env[key]] as const))
    .filter((entry): entry is [string, string] => Boolean(entry[1])),
);

const localBindingConfig = {
  main: 'vinext/server/fetch-handler',
  compatibility_date: '2026-05-22',
  compatibility_flags: ['nodejs_compat'],
  vars: localRuntimeVars,
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: 'site-creator-d1',
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: 'site-creator-r2',
        },
      ]
    : [],
};

export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: localBindingConfig,
      }),
    ],
  };
});
