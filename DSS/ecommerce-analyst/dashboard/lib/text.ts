/** Common HTML named entities from storefront / GA4 / ICM payloads. */
const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
  ndash: '\u2013',
  mdash: '\u2014',
  hellip: '\u2026',
  lsquo: '\u2018',
  rsquo: '\u2019',
  sbquo: '\u201A',
  ldquo: '\u201C',
  rdquo: '\u201D',
  bdquo: '\u201E',
  dagger: '\u2020',
  Dagger: '\u2021',
  bull: '\u2022',
  middot: '\u00B7',
  copy: '\u00A9',
  reg: '\u00AE',
  trade: '\u2122',
  deg: '\u00B0',
  plusmn: '\u00B1',
  frac12: '\u00BD',
  frac14: '\u00BC',
  frac34: '\u00BE',
  times: '\u00D7',
  divide: '\u00F7',
  cent: '\u00A2',
  pound: '\u00A3',
  yen: '\u00A5',
  euro: '\u20AC',
};

/** Entities GA4 / ICM sometimes send without a trailing semicolon. */
const BARE_NAMED_ENTITIES = new Set([
  'amp', 'lt', 'gt', 'quot', 'apos', 'nbsp', 'ndash', 'mdash', 'hellip',
]);

function decodeNamedEntity(match: string, name: string): string {
  const key = name.toLowerCase();
  const decoded = NAMED_HTML_ENTITIES[key];
  if (!decoded) return match;
  if (match.endsWith(';') || BARE_NAMED_ENTITIES.has(key)) return decoded;
  return match;
}

function decodeHtmlEntitiesOnce(value: string): string {
  return value
    .replace(/&#(\d+);?/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);?/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]+);?/g, decodeNamedEntity);
}

/** Decode HTML entities in GA4 / storefront strings (&#47;, &ndash;, &amp;, etc.). */
export function decodeHtmlEntities(value: string | null | undefined): string {
  if (!value) return value ?? '';
  if (!value.includes('&')) return value;
  let text = value;
  for (let pass = 0; pass < 4; pass += 1) {
    const next = decodeHtmlEntitiesOnce(text);
    if (next === text) break;
    text = next;
  }
  return text;
}

/** Display-safe text from catalog or analytics payloads. */
export function decodeDisplayText(value: string | null | undefined): string {
  return decodeHtmlEntities(value);
}

export function decodeProductName(value: string | null | undefined): string {
  return decodeDisplayText(value);
}
