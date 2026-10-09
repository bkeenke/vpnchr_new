import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { connection } from 'next/server';

/**
 * Кэш в памяти сервера для публичных данных SHM (конфиг, прайс).
 * stale-while-revalidate: свежий кэш отдаётся сразу; устаревший — отдаётся и обновляется в фоне;
 * при ошибке остаётся последнее удачное значение, до первой загрузки — fallback.
 */
export function cachedLoader<T>(name: string, load: () => Promise<T>, fallback: T, ttlMs: () => number) {
  let cached: { value: T; at: number } | null = null;
  let inflight: Promise<T> | null = null;

  const refresh = () =>
    (inflight ??= load()
      .then((value) => {
        cached = { value, at: Date.now() };
        return value;
      })
      .catch((e) => {
        // Служебные ошибки Next (например, «рендер динамический» при сборке) не глотаем
        unstable_rethrow(e);
        console.error(`[${name}] не удалось загрузить из SHM:`, e instanceof Error ? e.message : e);
        return cached?.value ?? fallback;
      })
      .finally(() => {
        inflight = null;
      }));

  return async (): Promise<T> => {
    // Данные живые — страница, которая их читает, всегда рендерится по запросу
    await connection();
    if (cached && Date.now() - cached.at < ttlMs()) return cached.value;
    if (cached) {
      void refresh();
      return cached.value;
    }
    return refresh();
  };
}
