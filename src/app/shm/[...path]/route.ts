import { NextRequest, NextResponse } from 'next/server';
import { getServerConfig } from '@/lib/config';
import { PARTNER_COOKIE, SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';

/**
 * Прозрачный прокси браузер → SHM.
 * - подставляет session_id из httpOnly-cookie в заголовок;
 * - перехватывает ответы авторизации и сохраняет сессию в httpOnly-cookie,
 *   так что токен никогда не доступен JavaScript на странице;
 * - продлевает сессию на каждом успешном запросе.
 */

const HOP_BY_HOP = ['connection', 'keep-alive', 'transfer-encoding', 'content-encoding', 'content-length', 'host'];

/** Эндпоинты, в ответе которых приходит новая сессия. */
const AUTH_PATHS = [/^v1\/user\/auth(\/passkey)?$/, /^v1\/telegram\/web\/auth$/, /^v1\/telegram\/webapp\/auth$/];
/** Эндпоинты регистрации/входа, куда нужно дописать partner_id. */
const PARTNER_PATHS = [/^v1\/user$/, /^v1\/telegram\/web\/auth$/, /^v1\/telegram\/webapp\/auth$/];

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const subpath = path.join('/');
  const { shmUrl } = getServerConfig();
  const target = new URL(`${shmUrl}/shm/${subpath}`);
  req.nextUrl.searchParams.forEach((v, k) => target.searchParams.append(k, v));

  // Конфиг кабинета читает только сервер (lib/config.ts), админка SHM из кабинета недоступна
  if (subpath.startsWith('v1/public/get_config') || /^v1\/admin(\/|$)/i.test(subpath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // CSRF: SHM меняет данные и через GET (оплата с баланса, промокоды), а Lax-cookie
  // уходит при переходе по ссылке с чужого сайта. Такие запросы браузер помечает
  // Sec-Fetch-Site: cross-site — отклоняем их, кроме возврата из Telegram OIDC.
  if (req.headers.get('sec-fetch-site') === 'cross-site' && !subpath.startsWith('v1/telegram/web/auth')) {
    return NextResponse.json({ error: 'Cross-site request blocked' }, { status: 403 });
  }

  const session = req.cookies.get(SESSION_COOKIE)?.value;
  const partnerId = req.cookies.get(PARTNER_COOKIE)?.value;
  const isPartnerPath = partnerId && PARTNER_PATHS.some((re) => re.test(subpath));

  const headers = new Headers();
  req.headers.forEach((v, k) => {
    if (!HOP_BY_HOP.includes(k) && k !== 'cookie') headers.set(k, v);
  });
  if (session) {
    headers.set('session_id', session);
    headers.set('cookie', `${SESSION_COOKIE}=${session}`);
  }

  let body: BodyInit | undefined;
  if (!['GET', 'HEAD'].includes(req.method)) {
    const raw = await req.text();
    body = raw;
    if (isPartnerPath && req.method !== 'GET' && raw) {
      try {
        const json = JSON.parse(raw);
        if (!json.partner_id) body = JSON.stringify({ ...json, partner_id: partnerId });
      } catch {
        /* не JSON — отправляем как есть */
      }
    }
  } else if (isPartnerPath && subpath === 'v1/telegram/webapp/auth' && !target.searchParams.has('partner_id')) {
    target.searchParams.set('partner_id', partnerId!);
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, { method: req.method, headers, body, redirect: 'manual', cache: 'no-store' });
  } catch {
    return NextResponse.json({ error: 'SHM unavailable' }, { status: 502 });
  }

  const resHeaders = new Headers();
  upstream.headers.forEach((v, k) => {
    if (!HOP_BY_HOP.includes(k) && k !== 'set-cookie') resHeaders.set(k, v);
  });

  const isAuth = AUTH_PATHS.some((re) => re.test(subpath));
  const contentType = upstream.headers.get('content-type') ?? '';
  let newSession: string | undefined;
  let payload: BodyInit | null = upstream.body;

  if (isAuth && upstream.ok && contentType.includes('json')) {
    const text = await upstream.text();
    payload = text;
    try {
      const json = JSON.parse(text);
      const data = Array.isArray(json?.data) ? json.data[0] : json?.data;
      newSession = json?.session_id || json?.id || data?.session_id || data?.id;
    } catch {
      /* ignore */
    }
  }

  const res = new NextResponse(payload, { status: upstream.status, headers: resHeaders });

  if (newSession) {
    res.cookies.set(SESSION_COOKIE, String(newSession), sessionCookieOptions);
    if (partnerId) res.cookies.delete(PARTNER_COOKIE);
  } else if (upstream.status === 401 && session && !isAuth) {
    res.cookies.delete(SESSION_COOKIE);
  } else if (session && upstream.ok) {
    res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions);
  }
  if (isPartnerPath && subpath === 'v1/user' && req.method === 'PUT' && upstream.ok) {
    res.cookies.delete(PARTNER_COOKIE);
  }
  return res;
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE, handle as PATCH };
