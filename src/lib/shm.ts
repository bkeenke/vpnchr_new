import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { getServerConfig } from './config';
import { SESSION_COOKIE } from './session';
import type { User, UserService, OrderService, PaySystem, Forecast } from './types';

export class ShmError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Запрос к SHM с сервера, от имени текущей сессии. */
export async function shm<T = unknown>(path: string, init: RequestInit & { query?: Record<string, string | number> } = {}): Promise<T> {
  const { shmUrl } = getServerConfig();
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  const url = new URL(`${shmUrl}/shm/v1${path}`);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, String(v));

  const res = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { session_id: session, Cookie: `${SESSION_COOKIE}=${session}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) throw new ShmError(res.status, await res.text().catch(() => res.statusText));
  return res.json() as Promise<T>;
}

/** SHM отдаёт `data` то массивом, то объектом — нормализуем в массив. */
export function rows<T>(body: { data?: T | T[] }): T[] {
  const d = body?.data;
  return d == null ? [] : Array.isArray(d) ? d : [d];
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!session) return null;
  try {
    return rows<User>(await shm('/user'))[0] ?? null;
  } catch {
    return null;
  }
});

export async function getUserServices(): Promise<UserService[]> {
  const body = await shm<{ data: UserService[] }>('/user/service', { query: { limit: 1000 } });
  return rows(body).map((item) => {
    const raw = item as UserService & { category?: string; cost?: string | number; name?: string };
    return {
      ...item,
      service: item.service ?? {
        category: raw.category ?? '',
        cost: typeof raw.cost === 'string' ? parseFloat(raw.cost) || 0 : (raw.cost ?? 0),
        name: raw.name ?? '',
      },
    };
  });
}

export async function getOrderServices(filter?: Record<string, string | number>): Promise<OrderService[]> {
  return rows(await shm<{ data: OrderService[] }>('/service/order', filter ? { query: { filter: JSON.stringify(filter) } } : {}));
}

export async function getPaySystems(): Promise<PaySystem[]> {
  return rows(await shm<{ data: PaySystem[] }>('/user/pay/paysystems'));
}

export async function getForecast(): Promise<Forecast | null> {
  return rows(await shm<{ data: Forecast }>('/user/pay/forecast'))[0] ?? null;
}

export async function getUserEmail(): Promise<{ email: string; email_verified: number } | null> {
  try {
    return rows(await shm<{ data: { email: string; email_verified: number } }>('/user/email'))[0] ?? null;
  } catch {
    return null;
  }
}

export async function getReferralsCount(): Promise<number | null> {
  try {
    return rows(await shm<{ data: { total: number } }>('/user/referrals'))[0]?.total ?? 0;
  } catch {
    return null;
  }
}

export async function getTelegramUsername(): Promise<string | null> {
  try {
    const body = await shm<{ username?: string; data?: { username?: string } | { username?: string }[] }>('/telegram/user');
    return body.username ?? rows(body as { data?: { username?: string } })[0]?.username ?? null;
  } catch {
    return null;
  }
}

type Page<T> = { items: T[]; total: number };

/** Постраничная история SHM: limit/offset + сортировка + JSON-фильтр. */
export async function getHistory<T>(
  path: '/user/pay' | '/user/withdraw',
  opts: { page: number; perPage: number; sort?: string; dir?: 'asc' | 'desc'; filter: Record<string, unknown> },
): Promise<Page<T>> {
  const body = await shm<{ data: T[]; items?: number }>(path, {
    query: {
      limit: opts.perPage,
      offset: (opts.page - 1) * opts.perPage,
      filter: JSON.stringify(opts.filter),
      ...(opts.sort ? { sort_field: opts.sort, sort_direction: opts.dir ?? 'desc' } : {}),
    },
  });
  return { items: rows(body), total: typeof body.items === 'number' ? body.items : rows(body).length };
}
