'use client';

/** Клиентские запросы к SHM через серверный прокси /shm (сессия — в httpOnly-cookie). */

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: Record<string, unknown> | null,
    message: string,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | undefined>;

async function request<T>(method: string, path: string, opts: { body?: unknown; query?: Query } = {}): Promise<T> {
  const url = new URL(`/shm/v1${path}`, window.location.origin);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const d = (data && typeof data === 'object' ? data : null) as Record<string, unknown> | null;
    if (res.status === 401 && !path.includes('/auth')) {
      // Сессия истекла — полная перезагрузка сбрасывает клиентское состояние
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign('/login');
    }
    throw new ApiError(res.status, d, String(d?.error ?? d?.msg ?? res.statusText));
  }
  return data as T;
}

export const api = {
  get: <T = unknown>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T = unknown>(path: string, body?: unknown, query?: Query) => request<T>('POST', path, { body, query }),
  put: <T = unknown>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  del: <T = unknown>(path: string, query?: Query) => request<T>('DELETE', path, { query }),
};

/** SHM отдаёт `data` то массивом, то объектом. */
export function first<T>(body: unknown): T | undefined {
  const d = (body as { data?: T | T[] })?.data;
  return Array.isArray(d) ? d[0] : d;
}

export function list<T>(body: unknown): T[] {
  const d = (body as { data?: T | T[] })?.data;
  return d == null ? [] : Array.isArray(d) ? d : [d];
}

/** Открыть ссылку: внутри Telegram WebApp — через его API. */
export function openLink(url: string) {
  const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string; openLink(u: string): void; openTelegramLink(u: string): void } } }).Telegram
    ?.WebApp;
  if (tg?.initData) {
    if (url.includes('t.me/')) tg.openTelegramLink(url);
    else tg.openLink(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
