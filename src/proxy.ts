import { NextRequest, NextResponse } from 'next/server';
import { PARTNER_COOKIE, PARTNER_MAX_AGE, SESSION_COOKIE, decodePartnerId, sessionCookieOptions } from '@/lib/session';

const PROTECTED = ['/services', '/profile', '/payments', '/withdrawals', '/tickets'];

/**
 * - ?partner_id=… и ?session_id=… из ссылок сохраняются в cookie и убираются из адреса;
 * - оптимистичная проверка сессии для кабинета (окончательная — в layout на сервере).
 */
export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const partner = url.searchParams.get('partner_id');
  const session = url.searchParams.get('session_id');

  if (partner || session) {
    const clean = url.clone();
    clean.searchParams.delete('partner_id');
    clean.searchParams.delete('session_id');
    const res = NextResponse.redirect(clean);
    if (partner) {
      res.cookies.set(PARTNER_COOKIE, decodePartnerId(partner), { path: '/', sameSite: 'lax', maxAge: PARTNER_MAX_AGE });
    }
    if (session) res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions);
    return res;
  }

  if (PROTECTED.some((p) => url.pathname.startsWith(p)) && !req.cookies.has(SESSION_COOKIE)) {
    const login = url.clone();
    login.pathname = '/login';
    login.search = '';
    login.searchParams.set('next', url.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/|shm/|_next/|favicon|icons/|images/|manifest|sw\\.js).*)'],
};
