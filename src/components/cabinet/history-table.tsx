import Link from 'next/link';
import { IconArrowDown, IconArrowUp, IconArrowsSort } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Empty } from '@/components/ui/card';

export type Column<T> = { key: string; title: string; render: (row: T) => React.ReactNode; sortKey?: string; align?: 'right' };

type Props<T> = {
  basePath: string;
  rows: T[];
  rowKey: (row: T) => string | number;
  columns: Column<T>[];
  page: number;
  totalPages: number;
  sort?: string;
  dir: 'asc' | 'desc';
  empty: string;
};

function href(base: string, params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '' && !(k === 'page' && v === 1)) q.set(k, String(v));
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

/** Серверная таблица истории: сортировка и страницы — обычные ссылки. */
export function HistoryTable<T>({ basePath, rows, rowKey, columns, page, totalPages, sort, dir, empty }: Props<T>) {
  if (!rows.length) return <Empty>{empty}</Empty>;

  return (
    <>
      <div className="glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-line text-muted border-b text-left text-xs tracking-wider uppercase">
                {columns.map((c) => {
                  const active = c.sortKey && sort === c.sortKey;
                  const nextDir = active && dir === 'desc' ? 'asc' : 'desc';
                  const Icon = active ? (dir === 'desc' ? IconArrowDown : IconArrowUp) : IconArrowsSort;
                  return (
                    <th
                      key={c.key}
                      className={cn('px-5 py-3.5 font-semibold', c.align === 'right' && 'text-right')}
                      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      {c.sortKey ? (
                        <Link
                          href={href(basePath, { sort: c.sortKey, dir: nextDir })}
                          className={cn('hover:text-text inline-flex items-center gap-1', active && 'text-green')}
                          scroll={false}
                        >
                          {c.title} <Icon className="size-3.5" />
                        </Link>
                      ) : (
                        c.title
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={rowKey(r)} className="border-line/60 border-b last:border-0 hover:bg-white/[.02]">
                  {columns.map((c) => (
                    <td key={c.key} className={cn('px-5 py-3.5', c.align === 'right' && 'text-right tabular-nums')}>
                      {c.render(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <nav className="mt-5 flex flex-wrap justify-center gap-1.5" aria-label="Страницы">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .map((p, i, arr) => (
              <span key={p} className="flex items-center gap-1.5">
                {i > 0 && p - arr[i - 1] > 1 && <span className="text-muted px-1">…</span>}
                <Link
                  href={href(basePath, { page: p, sort, dir: sort ? dir : undefined })}
                  scroll={false}
                  aria-current={p === page ? 'page' : undefined}
                  className={cn(
                    'grid size-9 place-items-center rounded-full text-sm font-semibold transition',
                    p === page ? 'neon-ring bg-green/10' : 'text-muted hover:bg-white/5',
                  )}
                >
                  {p}
                </Link>
              </span>
            ))}
        </nav>
      )}
    </>
  );
}

export function parseHistoryParams(sp: Record<string, string | string[] | undefined>, sortable: string[]) {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const sortRaw = one(sp.sort);
  const sort = sortRaw && sortable.includes(sortRaw) ? sortRaw : undefined;
  const dir: 'asc' | 'desc' = one(sp.dir) === 'asc' ? 'asc' : 'desc';
  return { page, sort, dir };
}
