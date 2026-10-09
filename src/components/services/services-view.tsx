'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconPlus, IconRefresh, IconChevronRight, IconPlugConnected } from '@tabler/icons-react';
import type { UserService } from '@/lib/types';
import { categoryTitle, normalizeCategory, someDeep, type Category } from '@/lib/services';
import { useConfig } from '@/components/providers/config';
import { useUser } from '@/components/providers/user';
import { useEmailModals } from '@/lib/email-store';
import { cn, formatDate, formatMoney } from '@/lib/utils';
import { PageTitle, Empty } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { ConfirmModal, Modal } from '@/components/ui/modal';
import { ShieldMark } from '@/components/brand/logo';
import { ServiceDetail } from './service-detail';
import { OrderModal } from './order-modal';

const PER_PAGE = 5;

export function ServicesView({ services }: { services: UserService[] }) {
  const cfg = useConfig();
  const { email } = useUser();
  const router = useRouter();
  const params = useSearchParams();
  const [refreshing, startRefresh] = useTransition();
  const { openEmail, openVerify } = useEmailModals();

  const [selectedRef, setSelected] = useState<{ id: number } | null>(null);
  // Открыть заказ сразу: /services?order=1 (кнопка «Выбрать» на главной)
  const orderParam = Number(params.get('order')) || undefined;
  const [orderOpen, setOrderOpen] = useState(
    () => params.has('order') && !(cfg.email.required && !email?.email) && !(cfg.email.verifyRequired && !email?.email_verified),
  );
  const [changeFor, setChangeFor] = useState<UserService | null>(null);
  const [confirmVerify, setConfirmVerify] = useState(false);
  const [pages, setPages] = useState<Record<string, number>>({});
  const progressAttempts = useRef(0);

  const refresh = () => startRefresh(() => router.refresh());

  const hasUnpaid = someDeep(services, (s) => s.status === 'NOT PAID');
  const hasProgress = someDeep(services, (s) => s.status === 'PROGRESS');
  const orderBlocked = cfg.services.blockOrderIfUnpaid && hasUnpaid;

  // Услуга создаётся — обновляем через 1 и 3 секунды
  useEffect(() => {
    if (!hasProgress) {
      progressAttempts.current = 0;
      return;
    }
    if (progressAttempts.current >= 2) return;
    const t = setTimeout(
      () => {
        progressAttempts.current += 1;
        router.refresh();
      },
      progressAttempts.current === 0 ? 1000 : 3000,
    );
    return () => clearTimeout(t);
  }, [hasProgress, services, router]);

  // Ждём оплату — опрашиваем каждые 5 секунд
  useEffect(() => {
    if (!hasUnpaid) return;
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [hasUnpaid, router]);

  // Открытая карточка всегда берётся из свежих данных после refresh
  const selected = useMemo(() => {
    if (!selectedRef) return null;
    const find = (list: UserService[]): UserService | undefined =>
      list.map((s) => (s.user_service_id === selectedRef.id ? s : find(s.children ?? []))).find(Boolean);
    const service = find(services);
    return service ? { service } : null;
  }, [selectedRef, services]);

  function startOrder() {
    if (cfg.email.required && !email?.email) return openEmail();
    if (cfg.email.verifyRequired && !email?.email_verified) return setConfirmVerify(true);
    setOrderOpen(true);
  }

  useEffect(() => {
    if (!params.has('order')) return;
    window.history.replaceState(null, '', '/services');
    if (cfg.email.required && !email?.email) openEmail();
    else if (cfg.email.verifyRequired && !email?.email_verified) openVerify();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => {
    const out = new Map<Category, UserService[]>();
    for (const s of services) {
      const c = normalizeCategory(s.service.category, cfg.services);
      out.set(c, [...(out.get(c) ?? []), s]);
    }
    return [...out.entries()];
  }, [services, cfg.services]);

  return (
    <>
      <PageTitle title="Мои услуги" eyebrow="Личный кабинет">
        <Button onClick={startOrder} disabled={orderBlocked} title={orderBlocked ? 'Сначала оплатите текущие услуги' : undefined}>
          <IconPlus className="size-5" /> Заказать
        </Button>
        <Button variant="ghost" size="icon" onClick={refresh} aria-label="Обновить">
          <IconRefresh className={cn('size-5', refreshing && 'animate-spin')} />
        </Button>
      </PageTitle>

      {groups.length === 0 ? (
        <Empty>
          <ShieldMark className="mx-auto mb-4 size-20" />
          <p className="font-display text-text text-lg uppercase">Пока нет услуг</p>
          <p className="mt-2 text-sm">Выберите тариф — подключение займёт пару минут.</p>
          <Button className="mt-6" onClick={startOrder} disabled={orderBlocked}>
            <IconPlus className="size-5" /> Выбрать тариф
          </Button>
        </Empty>
      ) : (
        <div className="space-y-8">
          {groups.map(([cat, list]) => {
            const page = pages[cat] ?? 1;
            const total = Math.ceil(list.length / PER_PAGE);
            return (
              <section key={cat}>
                <h2 className="text-muted mb-3 flex items-center gap-2 text-sm font-semibold tracking-[0.2em] uppercase">
                  {categoryTitle(cat, cfg.services)} <Badge>{list.length}</Badge>
                </h2>
                <div className="space-y-3">
                  {list.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((s) => (
                    <div key={s.user_service_id}>
                      <ServiceCard service={s} connectable={cat === 'vpn' || cat === 'proxy'} onOpen={() => setSelected({ id: s.user_service_id })} />
                      {s.children && s.children.length > 0 && (
                        <div className="border-line mt-2 ml-5 space-y-2 border-l-2 pl-4">
                          {s.children.map((c) => (
                            <ServiceCard key={c.user_service_id} service={c} compact onOpen={() => setSelected({ id: c.user_service_id })} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {total > 1 && (
                  <div className="mt-4 flex justify-center gap-1.5">
                    {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPages((prev) => ({ ...prev, [cat]: p }))}
                        className={cn(
                          'size-9 rounded-full text-sm font-semibold transition',
                          p === page ? 'neon-ring bg-green/10' : 'text-muted hover:bg-white/5',
                        )}
                        aria-current={p === page ? 'page' : undefined}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <Modal
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.service.service.name || 'Услуга'}
        description={
          selected && (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              #{selected.service.user_service_id} <StatusBadge status={selected.service.status} />
              {selected.service.expire && <span>до {formatDate(selected.service.expire)}</span>}
            </span>
          )
        }
        size="lg"
      >
        {selected && (
          <ServiceDetail
            key={selected.service.user_service_id}
            service={selected.service}
            onChanged={() => {
              setSelected(null);
              progressAttempts.current = 0;
              refresh();
            }}
            onChangeTariff={(s) => {
              setSelected(null);
              setChangeFor(s);
            }}
          />
        )}
      </Modal>

      <OrderModal
        open={orderOpen}
        initialServiceId={orderParam}
        onOpenChange={setOrderOpen}
        onDone={() => {
          progressAttempts.current = 0;
          refresh();
        }}
      />
      <OrderModal
        open={!!changeFor}
        onOpenChange={(o) => !o && setChangeFor(null)}
        current={changeFor ?? undefined}
        onDone={() => {
          progressAttempts.current = 0;
          refresh();
        }}
      />

      <ConfirmModal
        open={confirmVerify}
        onOpenChange={setConfirmVerify}
        title="Подтвердите email"
        message="Чтобы заказать услугу, подтвердите адрес электронной почты."
        confirmLabel="Подтвердить"
        tone="neon"
        onConfirm={() => {
          setConfirmVerify(false);
          openVerify();
        }}
      />
    </>
  );
}

function ServiceCard({ service, compact, connectable, onOpen }: { service: UserService; compact?: boolean; connectable?: boolean; onOpen: () => void }) {
  const active = service.status === 'ACTIVE';
  return (
    <div
      className={cn(
        'group flex w-full items-center gap-4 rounded-2xl text-left transition',
        compact ? 'glass p-3' : active ? 'glass-green p-4 sm:p-5' : 'glass p-4 sm:p-5',
        'hover:border-line-green',
      )}
    >
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-4 text-left">
        {!compact && <ShieldMark className={cn('size-11 shrink-0', !active && 'opacity-40 grayscale')} />}
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate font-semibold', compact ? 'text-sm' : 'text-base')}>{service.service.name}</span>
          <span className="text-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span>#{service.user_service_id}</span>
            {service.expire && <span>до {formatDate(service.expire)}</span>}
            {service.service.cost > 0 && <span>{formatMoney(service.service.cost)}</span>}
          </span>
        </span>
        <StatusBadge status={service.status} />
      </button>
      {connectable && active ? (
        <Button size="sm" className="hidden sm:inline-flex" onClick={onOpen}>
          <IconPlugConnected className="size-4" /> Подключить
        </Button>
      ) : (
        <IconChevronRight className="text-muted group-hover:text-green size-5 shrink-0 transition group-hover:translate-x-0.5" />
      )}
    </div>
  );
}
