export const SESSION_COOKIE = 'session_id';
export const PARTNER_COOKIE = 'partner_id';
export const SESSION_MAX_AGE = 3 * 24 * 60 * 60;
export const PARTNER_MAX_AGE = 30 * 24 * 60 * 60;

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  // За HTTPS-прокси — true; COOKIE_SECURE=false для доступа по голому HTTP
  secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE,
};

/** partner_id приходит либо числом, либо base64url от числа. */
export function decodePartnerId(value: string): string {
  if (/^\d+$/.test(value)) return value;
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/');
    return atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  } catch {
    return value;
  }
}
