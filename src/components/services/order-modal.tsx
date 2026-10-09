'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconArrowLeft, IconArrowRight, IconCheck, IconCreditCard, IconWallet } from '@tabler/icons-react';
import type { OrderService, UserService } from '@/lib/types';
import { api, first, list } from '@/lib/api';
import { toast } from '@/lib/toast';
import { pay, usePaySystems } from '@/lib/payments';
import { categoryTitle, normalizeCategory, type Category } from '@/lib/services';
import { cn, formatMoney, formatPeriod } from '@/lib/utils';
import { useConfig } from '@/components/providers/config';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox, Input, Select } from '@/components/ui/input';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
  /** Если задано — режим смены тарифа для этой услуги. */
  current?: UserService;
  /** Сразу открыть этот тариф (кнопка «Выбрать» на главной). */
  initialServiceId?: number;
};

const SORTS: Record<string, (a: OrderService, b: OrderService) => number> = {
  cost_asc: (a, b) => Number(a.cost) - Number(b.cost),
  cost_desc: (a, b) => Number(b.cost) - Number(a.cost),
  name_asc: (a, b) => a.name.localeCompare(b.name),
  name_desc: (a, b) => b.name.localeCompare(a.name),
  descr_asc: (a, b) => (a.descr || '').localeCompare(b.descr || ''),
  descr_desc: (a, b) => (b.descr || '').localeCompare(a.descr || ''),
};

/** Диалог монтируется только открытым — каждый раз со свежим состоянием и списком тарифов. */
export function OrderModal(props: Props) {
  return props.open ? <OrderDialog {...props} /> : null;
}

function OrderDialog({ open, onOpenChange, onDone, current, initialServiceId }: Props) {
  const cfg = useConfig();
  const sc = cfg.services;
  const isChange = !!current;
  const canDefer = isChange && current?.status === 'ACTIVE';

  const [items, setItems] = useState<OrderService[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OrderService | null>(null);
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [pickedPaySystem, setPaySystem] = useState('');
  const [finishAfter, setFinishAfter] = useState(false);
  const [busy, setBusy] = useState(false);

  const effectiveCost = (s: OrderService) => Number(sc.costWithBonuses ? s.real_cost_with_bonuses : sc.costDiscount ? s.real_cost : s.cost) || 0;
  const topUp = (s: OrderService) => Math.max(0, Math.ceil((effectiveCost(s) - balance) * 100) / 100);
  const enough = selected ? balance >= effectiveCost(selected) : false;

  const paySystems = usePaySystems(!!selected && !isChange && !enough);

  useEffect(() => {
    const filter = isChange && !sc.changeAllCategories && current ? { filter: JSON.stringify({ category: current.service.category }) } : undefined;
    Promise.all([api.get('/service/order', filter), isChange ? Promise.resolve(null) : api.get('/user').catch(() => null)])
      .then(([orders, user]) => {
        const data = list<OrderService>(orders)
          .filter((s) => !current || s.service_id !== current.service_id)
          .sort(SORTS[sc.orderSorting] ?? SORTS.cost_asc);
        setItems(data);
        const bal = user ? Number(first<{ balance: number }>(user)?.balance) || 0 : 0;
        setBalance(bal);
        const preselected = initialServiceId ? data.find((s) => s.service_id === initialServiceId) : undefined;
        if (preselected) {
          setSelected(preselected);
          setAmount(String(Math.max(0, Math.ceil((effectiveCost(preselected) - bal) * 100) / 100)));
        }
      })
      .catch(() => toast.error('Не удалось загрузить тарифы'))
      .finally(() => setLoading(false));
    // Диалог монтируется при каждом открытии — загрузка один раз на открытие
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const paySystem = paySystems.items.some((p) => p.shm_url === pickedPaySystem) ? pickedPaySystem : (paySystems.items[0]?.shm_url ?? '');

  function choose(s: OrderService) {
    setSelected(s);
    setFinishAfter(false);
    if (!isChange) setAmount(String(topUp(s)));
  }

  const groups = useMemo(() => {
    const out = new Map<Category, OrderService[]>();
    for (const s of items) {
      const c = normalizeCategory(s.category || 'other', sc);
      if (sc.visibleCategories.length && !sc.visibleCategories.includes((s.category || 'other').toLowerCase()) && !sc.visibleCategories.includes(c)) continue;
      out.set(c, [...(out.get(c) ?? []), s]);
    }
    return [...out.entries()];
  }, [items, sc]);

  async function order() {
    if (!selected) return;
    setBusy(true);
    try {
      await api.put('/service/order', { service_id: selected.service_id });
      toast.success(`Услуга «${selected.name}» заказана`);
      onOpenChange(false);
      onDone();
    } catch {
      toast.error('Не удалось заказать услугу');
    } finally {
      setBusy(false);
    }
  }

  async function orderAndPay() {
    if (!selected) return;
    const ps = paySystems.items.find((p) => p.shm_url === paySystem);
    if (!ps) return toast.error('Выберите способ оплаты');
    setBusy(true);
    // Вкладку открываем синхронно по клику, иначе браузер её заблокирует
    const win = ps.internal || ps.recurring ? null : window.open('', '_blank');
    try {
      await api.put('/service/order', { service_id: selected.service_id });
      const r = await pay(ps, amount, win);
      if (!r.ok) toast.error(r.error || 'Ошибка оплаты');
      else toast.success(`Услуга «${selected.name}» заказана. ${r.instant ? 'Оплата прошла' : 'Завершите оплату в открывшейся вкладке'}`);
      onOpenChange(false);
      onDone();
    } catch {
      win?.close();
      toast.error('Не удалось заказать услугу');
    } finally {
      setBusy(false);
    }
  }

  async function change() {
    if (!selected || !current) return;
    setBusy(true);
    try {
      await api.post('/user/service/change', {
        user_service_id: current.user_service_id,
        service_id: selected.service_id,
        finish_active: sc.changeForce ? 1 : canDefer && finishAfter ? 1 : 0,
        allow_partial_period: selected.partial_renew ? 1 : 0,
      });
      toast.success('Тариф изменён');
      onOpenChange(false);
      onDone();
    } catch {
      toast.error('Не удалось сменить тариф');
    } finally {
      setBusy(false);
    }
  }

  const title = selected ? selected.name : isChange ? 'Смена тарифа' : 'Выберите тариф';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={!selected && isChange ? `Текущий: ${current?.service.name}` : undefined}
      size="lg"
    >
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : !selected ? (
        items.length === 0 ? (
          <p className="text-muted py-10 text-center">Нет доступных тарифов</p>
        ) : (
          <div className="space-y-6">
            {groups.map(([cat, list]) => (
              <section key={cat}>
                {groups.length > 1 && <p className="text-muted mb-3 text-xs font-semibold tracking-[0.2em] uppercase">{categoryTitle(cat, sc)}</p>}
                <div className="grid gap-3 sm:grid-cols-2">
                  {list.map((s, i) => {
                    const cost = effectiveCost(s);
                    const featured = list.length > 1 && i === list.length - 1;
                    return (
                      <button
                        key={s.service_id}
                        type="button"
                        onClick={() => choose(s)}
                        className={cn(
                          'group relative rounded-2xl p-5 text-left transition hover:-translate-y-0.5',
                          featured ? 'glass-green' : 'glass hover:border-line-green',
                        )}
                      >
                        {featured && (
                          <span className="bg-green absolute -top-2.5 right-4 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-[#03140c] uppercase">
                            Выгодно
                          </span>
                        )}
                        <p className="font-semibold uppercase">{s.name}</p>
                        <p className="mt-2 flex items-baseline gap-2">
                          <span className="font-display text-3xl font-bold">{formatMoney(cost)}</span>
                          {s.cost > cost && <span className="text-muted text-sm line-through">{formatMoney(s.cost)}</span>}
                        </p>
                        <p className="text-muted mt-1 text-xs">за {formatPeriod(s.period)}</p>
                        {s.descr && <p className="text-muted mt-3 line-clamp-2 text-sm">{s.descr}</p>}
                        <span className="text-green mt-4 flex items-center gap-1 text-sm font-semibold">
                          Выбрать <IconArrowRight className="size-4 transition group-hover:translate-x-1" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-5">
          <button type="button" onClick={() => setSelected(null)} className="text-muted hover:text-text flex items-center gap-1 text-sm">
            <IconArrowLeft className="size-4" /> Ко всем тарифам
          </button>

          <div className="glass rounded-2xl p-5">
            {selected.descr && <p className="text-muted mb-4 text-sm whitespace-pre-wrap">{selected.descr}</p>}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-muted text-xs">Стоимость</p>
                <p className="flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold">{formatMoney(effectiveCost(selected))}</span>
                  {selected.cost > effectiveCost(selected) && <span className="text-muted line-through">{formatMoney(selected.cost)}</span>}
                </p>
                {selected.cost > effectiveCost(selected) && (
                  <p className="text-green mt-1 text-xs">Выгода {formatMoney(selected.cost - effectiveCost(selected))}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-muted text-xs">Период</p>
                <p className="font-semibold">{formatPeriod(selected.period)}</p>
              </div>
            </div>
          </div>

          {isChange ? (
            <div className="space-y-4">
              {sc.changeForce ? (
                <p className="text-muted text-sm">Новый тариф начнёт действовать после окончания текущего периода.</p>
              ) : (
                canDefer && (
                  <Checkbox
                    checked={finishAfter}
                    onChange={(e) => setFinishAfter(e.target.checked)}
                    label={selected.partial_renew ? 'Сменить после окончания текущего периода (с перерасчётом)' : 'Сменить после окончания текущего периода'}
                  />
                )
              )}
              <Button block size="lg" loading={busy} onClick={change}>
                <IconCheck className="size-5" /> Сменить тариф
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className={cn(
                  'flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm',
                  enough ? 'border-green/30 bg-green/5' : 'border-warning/30 bg-warning/5',
                )}
              >
                <span className="flex items-center gap-2">
                  <IconWallet className="size-5" /> Ваш баланс: <b>{formatMoney(balance)}</b>
                </span>
                {enough ? <Badge tone="green">Хватает для оплаты</Badge> : <Badge tone="yellow">Не хватает {formatMoney(topUp(selected))}</Badge>}
              </div>

              {enough ? (
                <Button block size="lg" loading={busy} onClick={order}>
                  <IconCheck className="size-5" /> Заказать за {formatMoney(effectiveCost(selected))}
                </Button>
              ) : paySystems.loading ? (
                <p className="text-muted text-center text-sm">Загружаем способы оплаты…</p>
              ) : !paySystems.items.length ? (
                <p className="text-muted text-center text-sm">Способы оплаты недоступны</p>
              ) : (
                <>
                  <Select label="Способ оплаты" value={paySystem} onChange={(e) => setPaySystem(e.target.value)}>
                    {paySystems.items.map((p) => (
                      <option key={p.shm_url} value={p.shm_url}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Сумма пополнения, ₽"
                    type="number"
                    min={topUp(selected)}
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    hint={`Минимум ${formatMoney(topUp(selected))} — недостающая сумма`}
                  />
                  <Button block size="lg" loading={busy} disabled={Number(amount) < topUp(selected)} onClick={orderAndPay}>
                    <IconCreditCard className="size-5" /> Заказать и оплатить {amount} ₽
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
