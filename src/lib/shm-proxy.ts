import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getServerConfig } from './config';
import { PARTNER_COOKIE, SESSION_COOKIE, sessionCookieOptions } from './session';

/**
 * Прокси браузер → SHM.
 * - подставляет session_id из httpOnly-cookie в заголовок;
 * - перехватывает ответы авторизации и сохраняет сессию в httpOnly-cookie,
 *   так что токен никогда не доступен JavaScript на странице;
 * - продлевает сессию на каждом успешном запросе;
 * - отдаёт из JSON-ответа только нужное клиенту (без служебных полей SHM и id сессии).
 */

const HOP_BY_HOP = ['connection', 'keep-alive', 'transfer-encoding', 'content-encoding', 'content-length', 'host'];

/** Эндпоинты, в ответе которых приходит новая сессия. */
const AUTH_PATHS = [/^v1\/user\/auth(\/passkey)?$/, /^v1\/telegram\/web\/auth$/, /^v1\/telegram\/webapp\/auth$/];
/** Эндпоинты регистрации/входа, куда нужно дописать partner_id. */
const PARTNER_PATHS = [/^v1\/user$/, /^v1\/telegram\/web\/auth$/, /^v1\/telegram\/webapp\/auth$/];
/** Служебные поля конверта SHM: клиент их не использует (limit/offset он сам и отправил). */
const ENVELOPE_FIELDS = ['TZ', 'date', 'limit', 'offset', 'filter', 'status'];
const SESSION_FIELDS = ['id', 'session_id'];

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);
const omit = (o: Json, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

/** Конверт `{TZ, date, items, limit, offset, data, status}` → `{data, items}`; у ответов входа — без id сессии. */
function sanitize(json: unknown, isAuth: boolean): unknown {
  if (!isObject(json)) return json;
  const stripSession = (v: unknown) => (isAuth && isObject(v) ? omit(v, SESSION_FIELDS) : v);
  if ('data' in json) {
    const data = Array.isArray(json.data) ? json.data.map(stripSession) : stripSession(json.data);
    return json.items === undefined ? { data } : { data, items: json.items };
  }
  const rest = omit(
    json,
    ENVELOPE_FIELDS.filter((k) => k !== 'status' || typeof json.status === 'number'),
  );
  return stripSession(rest);
}

function sessionFrom(json: unknown): string | undefined {
  if (!isObject(json)) return;
  const data = Array.isArray(json.data) ? json.data[0] : json.data;
  const id = json.session_id || json.id || (isObject(data) ? data.session_id || data.id : undefined);
  return id ? String(id) : undefined;
}

/** subpath — путь SHM после /shm/, например `v1/user`. */
export async function proxyToShm(req: NextRequest, subpath: string) {
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
  if (req.headers.get('sec-fetch-site') === 'cross-site' && !subpath.startsWith('v1/telegram/web/')) {
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
    if (isPartnerPath && raw) {
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
  let newSession: string | undefined;
  let payload: BodyInit | null = upstream.body;

  if ((upstream.headers.get('content-type') ?? '').includes('json')) {
    const text = await upstream.text();
    payload = text;
    try {
      const json = JSON.parse(text);
      if (isAuth && upstream.ok) newSession = sessionFrom(json);
      payload = JSON.stringify(sanitize(json, isAuth));
    } catch {
      /* не JSON — отдаём как есть */
    }
  }

  const res = new NextResponse(payload, { status: upstream.status, headers: resHeaders });

  if (newSession) {
    res.cookies.set(SESSION_COOKIE, newSession, sessionCookieOptions);
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
