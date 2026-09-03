import fs from 'node:fs';
import path from 'node:path';

type RegistrySite = {
  id: string;
  name: string;
  gcpProjectId: string;
  ga4Dataset: string;
  location: string;
  icmBaseUrl: string;
  icmSite: string;
};

function readTomlValue(block: string, key: string): string {
  const match = block.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, 'm'));
  return match?.[1]?.trim() ?? '';
}

export function loadSitesRegistryFromToml(tomlPath: string): {
  defaultSiteId: string;
  sites: RegistrySite[];
} | null {
  if (!fs.existsSync(tomlPath)) return null;
  const content = fs.readFileSync(tomlPath, 'utf8');
  const defaultSiteId = content.match(/^default_site\s*=\s*"([^"]+)"/m)?.[1]?.trim() ?? '';
  const sites: RegistrySite[] = [];

  for (const match of content.matchAll(/\[sites\.([^\]]+)\]([\s\S]*?)(?=\n\[|$)/g)) {
    const id = match[1]?.trim() ?? '';
    const block = match[2] ?? '';
    if (!id) continue;
    sites.push({
      id,
      name: readTomlValue(block, 'name') || id,
      gcpProjectId: readTomlValue(block, 'gcp_project_id'),
      ga4Dataset: readTomlValue(block, 'ga4_dataset'),
      location: readTomlValue(block, 'location') || 'US',
      icmBaseUrl: readTomlValue(block, 'icm_base_url'),
      icmSite: readTomlValue(block, 'icm_site'),
    });
  }

  if (!sites.length) return null;
  return {
    defaultSiteId: defaultSiteId || sites[0].id,
    sites,
  };
}

export function sitesRegistryJsonForBuild(): string | undefined {
  const tomlPath = path.resolve(__dirname, '../../sites.toml');
  const registry = loadSitesRegistryFromToml(tomlPath);
  if (!registry) return undefined;
  return JSON.stringify(registry);
}
