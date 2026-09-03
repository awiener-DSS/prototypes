export const SESSION_COOKIE = 'commerce_signals_session';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionPayload = {
  email: string;
  siteId: string;
  exp: number;
};

export function isAuthEnabled(): boolean {
  return Boolean(process.env.DASHBOARD_AUTH_PASSWORD?.trim());
}

export function authSecret(): string {
  return process.env.AUTH_SECRET?.trim()
    || process.env.DASHBOARD_AUTH_PASSWORD?.trim()
    || 'commerce-signals-dev-secret';
}

export function expectedEmail(): string {
  return (process.env.DASHBOARD_AUTH_EMAIL || 'test@dss-partners.com').trim().toLowerCase();
}

/** Prefill email only — never ship the password into the browser. */
export function signInFormDefaults(): { email: string } | null {
  if (!isAuthEnabled()) return null;
  return { email: expectedEmail() };
}

export function validateCredentials(email: string, password: string): boolean {
  const expectedPassword = process.env.DASHBOARD_AUTH_PASSWORD?.trim() ?? '';
  if (!expectedPassword) return false;
  return email.trim().toLowerCase() === expectedEmail() && password === expectedPassword;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return atob(padded + pad);
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return encodeBase64Url(new Uint8Array(signature));
}

export async function createSessionToken(email: string, siteId: string): Promise<string> {
  const payload: SessionPayload = {
    email: email.trim().toLowerCase(),
    siteId: siteId.trim(),
    exp: Date.now() + SESSION_MS,
  };
  const body = encodeBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmacSign(body, authSecret());
  return `${body}.${signature}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = await hmacSign(body, authSecret());
  if (signature !== expected) return null;
  try {
    const payload = JSON.parse(decodeBase64Url(body)) as Partial<SessionPayload>;
    if (!payload.email || !payload.exp || payload.exp < Date.now()) return null;
    return {
      email: payload.email,
      siteId: payload.siteId?.trim() ?? '',
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAgeSeconds = 7 * 24 * 60 * 60) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
