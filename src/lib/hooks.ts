'use client';

import { useSyncExternalStore } from 'react';

const noop = () => () => {};

/** Значение, доступное только в браузере (на сервере — fallback), без setState в эффекте. */
export function useClientValue<T>(read: () => T, fallback: T): T {
  return useSyncExternalStore(noop, read, () => fallback);
}
