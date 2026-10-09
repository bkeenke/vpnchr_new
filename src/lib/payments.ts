'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, list, openLink } from './api';
import { shmMessage } from './shm-messages';
import type { PaySystem } from './types';

/**
 * Ссылки платёжных систем SHM указывают на свой хост (…/shm/v1/…).
 * Переводим их на наш прокси, чтобы запрос ушёл с сессией из httpOnly-cookie.
 */
export function payUrl(ps: PaySystem, amount: number | string) {
  const raw = `${ps.shm_url}${amount}`;
  const i = raw.indexOf('/shm/v1/');
  return i >= 0 ? `/api/${raw.slice(i + '/shm/v1/'.length)}` : raw;
}

async function fetchPaySystems(): Promise<PaySystem[]> {
  const seen = new Set<string>();
  return list<PaySystem>(await api.get('/user/pay/paysystems'))
    .filter((p) => (seen.has(p.shm_url) ? false : (seen.add(p.shm_url), true)))
    .sort((a, b) => (b.weight || 0) - (a.weight || 0));
}

export function usePaySystems(enabled = true) {
  const [items, setItems] = useState<PaySystem[] | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchPaySystems()
      .catch(() => [])
      .then((data) => !cancelled && setItems(data));
    return () => {
      cancelled = true;
    };
  }, [enabled, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { items: items ?? [], loading: enabled && items === null, reload };
}

/**
 * Оплата. Внутренние/рекуррентные системы списывают сразу (GET с сессией),
 * внешние открываются в новой вкладке.
 * Возвращает true, если платёж проведён сразу.
 */
export async function pay(ps: PaySystem, amount: number | string, preopened?: Window | null): Promise<{ ok: boolean; instant: boolean; error?: string }> {
  const url = payUrl(ps, amount);
  if (ps.internal || ps.recurring) {
    preopened?.close();
    const res = await fetch(url, { credentials: 'same-origin' });
    if (res.status === 200 || res.status === 204) return { ok: true, instant: true };
    const data = await res.json().catch(() => ({}));
    const msg = data.msg_ru || data.msg;
    return { ok: false, instant: true, error: msg ? shmMessage(msg) : undefined };
  }
  if (preopened) preopened.location.href = url;
  else openLink(new URL(url, window.location.origin).href);
  return { ok: true, instant: false };
}
