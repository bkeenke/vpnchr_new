'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconBrandTelegram,
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconCreditCard,
  IconGift,
  IconMail,
  IconPencil,
  IconShare,
  IconUserCircle,
} from '@tabler/icons-react';
import type { Forecast, User } from '@/lib/types';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { useClientValue } from '@/lib/hooks';
import { useEmailModals } from '@/lib/email-store';
import { cn, formatDate, formatMoney, plural } from '@/lib/utils';
import { useConfig } from '@/components/providers/config';
import { useUser } from '@/components/providers/user';
import { Card, PageTitle, Row } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ConfirmModal, Modal } from '@/components/ui/modal';
import { PayModal } from '@/components/cabinet/pay-modal';
import { PromoModal } from './promo-modal';
import { SecuritySettings } from './security';
import { copyOrToast } from '@/lib/clipboard';

function encodePartnerId(id: number) {
  return btoa(String(id)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  return {
    copied,
    copy: async (key: string, value: string) => {
      if (!(await copyOrToast(value))) return;
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
    },
  };
}

type Props = { user: User; forecast: Forecast | null; referrals: number | null; telegramUsername: string | null; showTelegram: boolean };

export function ProfileView({ user, forecast, referrals, telegramUsername, showTelegram }: Props) {
  const cfg = useConfig();
  const { email } = useUser();
  const { openEmail, openVerify } = useEmailModals();
  const { copied, copy } = useCopy();
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number | undefined>();
  const [promoOpen, setPromoOpen] = useState(false);
  const [forecastOpen, setForecastOpen] = useState(false);
  const emailBlocked = cfg.email.required && !email?.email;

  const origin = useClientValue(() => window.location.origin, '');
  const partnerLink = `${origin}/?partner_id=${encodePartnerId(user.user_id)}`;

  const openPay = (amount?: number) => {
    if (emailBlocked) return openEmail();
    setPayAmount(amount);
    setPayOpen(true);
  };

  return (
    <>
      <PageTitle title="Профиль" eyebrow="Личный кабинет" />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Баланс */}
        <Card glow className="relative overflow-hidden lg:col-span-2">
          <div className="bg-green/15 pointer-events-none absolute -top-20 -right-16 size-64 rounded-full blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-muted text-sm">Баланс</p>
              <p className="font-display mt-1 text-4xl font-bold tabular-nums sm:text-5xl">{formatMoney(user.balance)}</p>
              <p className="text-muted mt-2 flex flex-wrap gap-x-4 text-sm">
                <span>Бонусы: {formatMoney(user.bonus || 0)}</span>
                {user.discount > 0 && <span className="text-green">Скидка {user.discount}%</span>}
                {user.credit > 0 && <span>Кредит: {formatMoney(user.credit)}</span>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => openPay(forecast?.total && forecast.total > 0 ? forecast.total : undefined)}>
                <IconCreditCard className="size-5" /> Пополнить
              </Button>
              <Button variant="ghost" onClick={() => (emailBlocked ? openEmail() : setPromoOpen(true))}>
                <IconGift className="size-5" /> Промокод
              </Button>
            </div>
          </div>
        </Card>

        {/* ── Прогноз оплаты */}
        {forecast && forecast.items && forecast.items.length > 0 && (
          <Card className="lg:col-span-2">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 text-left"
              onClick={() => setForecastOpen((v) => !v)}
              aria-expanded={forecastOpen}
            >
              <span>
                <span className="block font-semibold">Прогноз оплаты</span>
                <span className={cn('text-sm', forecast.total > 0 ? 'text-warning' : 'text-green')}>
                  {forecast.total > 0 ? `К оплате: ${formatMoney(forecast.total)}` : 'Всё оплачено'}
                </span>
              </span>
              <IconChevronDown className={cn('text-muted size-5 transition', forecastOpen && 'rotate-180')} />
            </button>
            {forecastOpen && (
              <div className="mt-4 space-y-2">
                {forecast.items.map((item) => (
                  <div key={item.user_service_id} className="border-line rounded-xl border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-muted text-xs">
                          {item.months ? `${plural(item.months, 'месяц', 'месяца', 'месяцев')} × ${item.qnt ?? 1} шт.` : null}
                          {item.expire ? ` · до ${formatDate(item.expire)}` : null}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatMoney(item.total)}</p>
                        <Badge tone={item.status === 'NOT PAID' ? 'red' : 'green'}>{item.status === 'NOT PAID' ? 'Не оплачено' : 'Оплачено'}</Badge>
                      </div>
                    </div>
                    {item.next && (
                      <div className="border-line text-muted mt-2 flex justify-between border-t border-dashed pt-2 text-xs">
                        <span>Следующее продление: {item.next.name}</span>
                        <span>{formatMoney(item.next.total)}</span>
                      </div>
                    )}
                  </div>
                ))}
                {!!forecast.dept && forecast.dept > 0 && <Row label={<span className="text-danger">Задолженность</span>}>{formatMoney(forecast.dept)}</Row>}
                {forecast.total > 0 && (
                  <Button block className="mt-2" onClick={() => openPay(forecast.total)}>
                    Оплатить {formatMoney(forecast.total)}
                  </Button>
                )}
              </div>
            )}
          </Card>
        )}

        {/* ── Аккаунт */}
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <IconUserCircle className="text-green size-10" stroke={1.3} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.full_name || user.login}</p>
              <button type="button" onClick={() => copy('id', String(user.user_id))} className="text-muted hover:text-green flex items-center gap-1 text-xs">
                ID {user.user_id} {copied === 'id' ? <IconCheck className="text-green size-3.5" /> : <IconCopy className="size-3.5" />}
              </button>
            </div>
          </div>
          <Row label="Логин">{user.login}</Row>
          <PersonalData user={user} />
        </Card>

        {/* ── Партнёрская ссылка */}
        <Card>
          <p className="mb-1 flex items-center gap-2 font-semibold">
            <IconShare className="text-green size-5" /> Пригласи друга
          </p>
          <p className="text-muted mb-4 text-sm">Делитесь ссылкой — за оплаты приглашённых начисляются бонусы.</p>
          <div className="border-line flex items-center gap-2 rounded-xl border bg-black/30 p-2 pl-3">
            <code className="text-muted min-w-0 flex-1 truncate font-mono text-xs">{partnerLink}</code>
            <Button variant="subtle" size="icon" onClick={() => copy('link', partnerLink)} aria-label="Скопировать ссылку">
              {copied === 'link' ? <IconCheck className="text-green size-5" /> : <IconCopy className="size-5" />}
            </Button>
          </div>
          {referrals !== null && <p className="text-muted mt-3 text-sm">Приглашено: {plural(referrals, 'человек', 'человека', 'человек')}</p>}
        </Card>

        {/* ── Email */}
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-semibold">
              <IconMail className="text-green size-5" /> Email
            </p>
            <div className="flex gap-2">
              {cfg.email.allowVerify && email?.email && !email.email_verified && (
                <Button size="sm" onClick={() => openVerify()}>
                  Подтвердить
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={openEmail}>
                {email?.email ? 'Изменить' : 'Привязать'}
              </Button>
            </div>
          </div>
          {email?.email ? (
            <div className="flex flex-wrap items-center gap-2">
              <span>{email.email}</span>
              <Badge tone={email.email_verified ? 'green' : 'yellow'}>{email.email_verified ? 'Подтверждён' : 'Не подтверждён'}</Badge>
            </div>
          ) : (
            <p className="text-muted text-sm">Не привязан</p>
          )}
          <p className="text-muted mt-3 text-xs">Нужен для чеков и восстановления доступа.</p>
        </Card>

        {showTelegram && <TelegramCard user={user} username={telegramUsername} />}

        <SecuritySettings login={user.login} />
      </div>

      <PayModal open={payOpen} onOpenChange={setPayOpen} initialAmount={payAmount} />
      <PromoModal open={promoOpen} onOpenChange={setPromoOpen} />
    </>
  );
}

function PersonalData({ user }: { user: User }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: user.full_name ?? '', login2: user.login2 ?? '', phone: user.phone ?? '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.post('/user', form);
      toast.success('Данные сохранены');
      setEditing(false);
      router.refresh();
    } catch {
      toast.error('Не удалось сохранить данные');
    } finally {
      setSaving(false);
    }
  }

  if (!editing)
    return (
      <>
        <Row label="Имя">{user.full_name || '—'}</Row>
        <Row label="Телефон">{user.phone || '—'}</Row>
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => setEditing(true)}>
          <IconPencil className="size-4" /> Изменить данные
        </Button>
      </>
    );

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Input label="Имя" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      <Input label="Дополнительный логин" value={form.login2} onChange={(e) => setForm({ ...form, login2: e.target.value })} />
      <Input label="Телефон" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={saving}>
          Сохранить
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
          Отмена
        </Button>
      </div>
    </form>
  );
}

function TelegramCard({ user, username }: { user: User; username: string | null }) {
  const cfg = useConfig();
  const router = useRouter();
  const [waiting, setWaiting] = useState(false);
  const [confirmUnbind, setConfirmUnbind] = useState(false);
  const [busy, setBusy] = useState(false);

  // Возврат после привязки через OIDC: ?tg_status=success|already_bound|error
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('tg_status');
    if (!status) return;
    window.history.replaceState(null, '', window.location.pathname);
    if (status === 'success') toast.success('Telegram привязан');
    else if (status === 'already_bound') toast.error('Этот Telegram уже привязан к другому аккаунту');
    else toast.error('Не удалось привязать Telegram');
  }, []);

  function bindOidc() {
    const q = new URLSearchParams({
      uid: String(user.user_id),
      return_url: `${window.location.origin}/profile`,
      profile: cfg.telegram.botProfile,
      bind_to_profile: '1',
      register_if_not_exists: '0',
    });
    const popup = window.open(`/api/telegram/web/auth/start?${q}`, 'telegram-oidc-auth', 'popup=yes,width=520,height=760');
    if (!popup) return toast.error('Разрешите всплывающие окна для привязки Telegram');
    setWaiting(true);
    const started = Date.now();
    const timer = setInterval(() => {
      if (!popup.closed && Date.now() - started < 180_000) return;
      clearInterval(timer);
      setWaiting(false);
      router.refresh();
    }, 1000);
  }

  async function unbind() {
    setBusy(true);
    try {
      await api.del('/telegram/user');
      toast.success('Telegram отвязан');
      setConfirmUnbind(false);
      router.refresh();
    } catch {
      toast.error('Не удалось отвязать Telegram');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <p className="mb-3 flex items-center gap-2 font-semibold">
        <IconBrandTelegram className="size-5 text-[#2aabee]" /> Telegram
      </p>
      {username ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>
            @{username} <Badge tone="green">Привязан</Badge>
          </span>
          <Button size="sm" variant="danger" onClick={() => setConfirmUnbind(true)}>
            Отвязать
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-muted text-sm">Привяжите Telegram, чтобы входить в один клик и получать уведомления.</p>
          {cfg.telegram.oidcAuth && (
            <Button size="sm" onClick={bindOidc}>
              <IconBrandTelegram className="size-4" /> Привязать Telegram
            </Button>
          )}
        </div>
      )}

      <Modal open={waiting} onOpenChange={setWaiting} title="Ожидаем Telegram" size="sm">
        <p className="text-muted text-sm">Подтвердите привязку в открывшемся окне Telegram. Это окно закроется автоматически.</p>
      </Modal>
      <ConfirmModal
        open={confirmUnbind}
        onOpenChange={setConfirmUnbind}
        title="Отвязать Telegram?"
        message="Вход через Telegram для этого аккаунта перестанет работать."
        confirmLabel="Отвязать"
        loading={busy}
        onConfirm={unbind}
      />
    </Card>
  );
}
