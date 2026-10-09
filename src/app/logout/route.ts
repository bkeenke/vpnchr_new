import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

/** Выход: удаляем httpOnly-cookie сессии. POST — чтобы выход нельзя было вызвать ссылкой с чужого сайта. */
export function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/', req.url), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
