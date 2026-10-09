import type { Metadata } from 'next';
import { getHistory } from '@/lib/shm';
import type { Withdrawal } from '@/lib/types';
import { formatDate, formatMoney, plural } from '@/lib/utils';
import { PageTitle } from '@/components/ui/card';
import { HistoryTable, parseHistoryParams, type Column } from '@/components/cabinet/history-table';

export const metadata: Metadata = { title: 'Списания' };
const PER_PAGE = 10;

const columns: Column<Withdrawal>[] = [
  { key: 'withdraw_date', title: 'Дата списания', sortKey: 'withdraw_date', render: (w) => formatDate(w.withdraw_date) },
  { key: 'end_date', title: 'Оплачено до', sortKey: 'end_date', render: (w) => formatDate(w.end_date) },
  { key: 'service', title: 'Услуга', render: (w) => <span className="text-muted">#{w.user_service_id}</span> },
  { key: 'period', title: 'Период', render: (w) => (w.months ? plural(w.months, 'месяц', 'месяца', 'месяцев') : '—') },
  {
    key: 'total',
    title: 'Сумма',
    sortKey: 'total',
    align: 'right',
    render: (w) => (
      <span>
        <span className="font-semibold">{formatMoney(w.total)}</span>
        {(w.discount > 0 || w.bonus > 0) && (
          <span className="text-muted block text-xs">
            {w.discount > 0 && `скидка ${w.discount}%`} {w.bonus > 0 && `бонусы ${formatMoney(w.bonus)}`}
          </span>
        )}
      </span>
    ),
  },
];

export default async function WithdrawalsPage({ searchParams }: PageProps<'/withdrawals'>) {
  const { page, sort, dir } = parseHistoryParams(await searchParams, ['withdraw_date', 'end_date', 'total']);
  const { items, total } = await getHistory<Withdrawal>('/user/withdraw', { page, perPage: PER_PAGE, sort, dir, filter: { total: { '!=': 0 } } }).catch(() => ({
    items: [],
    total: 0,
  }));

  return (
    <>
      <PageTitle title="История списаний" eyebrow="Личный кабинет" />
      <HistoryTable
        basePath="/withdrawals"
        rows={items}
        rowKey={(w) => w.withdraw_id}
        columns={columns}
        page={page}
        totalPages={Math.ceil(total / PER_PAGE)}
        sort={sort}
        dir={dir}
        empty="Списаний пока нет"
      />
    </>
  );
}
