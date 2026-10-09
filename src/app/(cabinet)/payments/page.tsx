import type { Metadata } from 'next';
import { getHistory } from '@/lib/shm';
import type { Payment } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';
import { PageTitle } from '@/components/ui/card';
import { HistoryTable, parseHistoryParams, type Column } from '@/components/cabinet/history-table';

export const metadata: Metadata = { title: 'Платежи' };
const PER_PAGE = 10;

const columns: Column<Payment>[] = [
  { key: 'date', title: 'Дата', sortKey: 'date', render: (p) => formatDate(p.date) },
  {
    key: 'money',
    title: 'Сумма',
    sortKey: 'money',
    align: 'right',
    render: (p) => (
      <span className={Number(p.money) > 0 ? 'text-green font-semibold' : 'text-danger font-semibold'}>
        {Number(p.money) > 0 ? '+' : ''}
        {formatMoney(p.money)}
      </span>
    ),
  },
];

export default async function PaymentsPage({ searchParams }: PageProps<'/payments'>) {
  const { page, sort, dir } = parseHistoryParams(await searchParams, ['date', 'money']);
  const { items, total, failed } = await getHistory<Payment>('/user/pay', { page, perPage: PER_PAGE, sort, dir, filter: { money: { '>': 0 } } })
    .then((r) => ({ ...r, failed: false }))
    .catch((e) => {
      console.error('[pay] не удалось загрузить историю из SHM:', e instanceof Error ? e.message : e);
      return { items: [], total: 0, failed: true };
    });

  return (
    <>
      <PageTitle title="История платежей" eyebrow="Личный кабинет" />
      <HistoryTable
        basePath="/payments"
        // Нули отсекает и фильтр SHM, но money может прийти строкой «0.00» — страхуемся
        rows={items.filter((p) => Number(p.money) !== 0)}
        rowKey={(p) => p.id}
        columns={columns}
        page={page}
        totalPages={Math.ceil(total / PER_PAGE)}
        sort={sort}
        dir={dir}
        empty={failed ? 'Не удалось загрузить историю. Обновите страницу' : 'Платежей пока нет'}
      />
    </>
  );
}
