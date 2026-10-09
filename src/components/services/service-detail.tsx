'use client';

import { useEffect, useState } from 'react';
import {
  IconCheck,
  IconCopy,
  IconCreditCard,
  IconDeviceMobileCog,
  IconDownload,
  IconExchange,
  IconPlayerStop,
  IconQrcode,
  IconTrash,
  IconWallet,
} from '@tabler/icons-react';
import type { ForecastItem, PaySystem, UserService } from '@/lib/types';
import { api, first, openLink } from '@/lib/api';
import { toast } from '@/lib/toast';
import { useClientValue } from '@/lib/hooks';
import { pay, usePaySystems } from '@/lib/payments';
import { normalizeCategory } from '@/lib/services';
import { cn, formatDate, formatMoney } from '@/lib/utils';
import { useConfig } from '@/components/providers/config';
import { Row } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { ConfirmModal } from '@/components/ui/modal';
import { Input, Select } from '@/components/ui/input';
import { QrModal } from './qr-modal';
import { AppDownloads, detectPlatform } from './app-downloads';
import { copyOrToast } from '@/lib/clipboard';

export function ServiceDetail({
  service,
  onChanged,
  onChangeTariff,
}: {
  service: UserService;
  onChanged: () => void;
  onChangeTariff: (s: UserService) => void;
}) {
  const cfg = useConfig();
  const sc = cfg.services;
  const category = normalizeCategory(service.service.category, sc);
  const isVpn = category === 'vpn';
  const isProxy = category === 'proxy';
  const isActive = service.status === 'ACTIVE';
  const isNotPaid = service.status === 'NOT PAID';
  const hasConnection = (isVpn || isProxy) && isActive;

  const [subUrl, setSubUrl] = useState<string | null>(null);
  const [wgConfig, setWgConfig] = useState<string | null>(null);
  const [connLoading, setConnLoading] = useState(hasConnection);
  const [nextInfo, setNextInfo] = useState<{ name: string; cost: number } | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<'stop' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);

  // ── Данные подключения из хранилища SHM
  useEffect(() => {
    if (!hasConnection) return;
    let cancelled = false;
    (async () => {
      try {
        if (isProxy) {
          for (const key of [`${sc.proxyStoragePrefix}${service.user_service_id}`, `vpn_remna_${service.user_service_id}`]) {
            const r = await api
              .get<{ subscription_url?: string; response?: { subscriptionUrl?: string } }>(`/storage/manage/${key}`, { format: 'json' })
              .catch(() => null);
            const url = r?.subscription_url || r?.response?.subscriptionUrl;
            if (url) {
              if (!cancelled) setSubUrl(url);
              break;
            }
          }
        } else {
          const r = await api.get<string>(`/storage/manage/${sc.vpnStoragePrefix}${service.user_service_id}`).catch(() => null);
          if (r && !cancelled) setWgConfig(typeof r === 'string' ? r : JSON.stringify(r));
        }
      } finally {
        if (!cancelled) setConnLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasConnection, isProxy, sc.proxyStoragePrefix, sc.vpnStoragePrefix, service.user_service_id]);

  // ── Следующий тариф (после окончания текущего)
  useEffect(() => {
    if (!service.next) return;
    api
      .get('/service/order', { filter: JSON.stringify({ service_id: String(service.next) }) })
      .then((r) => {
        const s = first<{ name: string; cost: number }>(r);
        if (s?.name) setNextInfo({ name: s.name, cost: Number(s.cost) });
      })
      .catch(() => {});
  }, [service.next]);

  const canDelete = sc.allowDelete && ['BLOCK', 'NOT PAID', 'ERROR'].includes(service.status);
  const canStop = sc.allowBlock && isActive;
  const canChange = sc.allowChange && ['BLOCK', 'ACTIVE'].includes(service.status);

  async function stopOrDelete() {
    setBusy(true);
    try {
      if (confirm === 'stop') {
        await api.post('/user/service/stop', { user_service_id: service.user_service_id });
        toast.success('Услуга остановлена');
      } else {
        await api.del('/user/service', { user_service_id: service.user_service_id });
        toast.success('Услуга удалена');
      }
      setConfirm(null);
      onChanged();
    } catch {
      toast.error(confirm === 'stop' ? 'Не удалось остановить услугу' : 'Не удалось удалить услугу');
    } finally {
      setBusy(false);
    }
  }

  function downloadConfig() {
    if (!wgConfig) return;
    const url = URL.createObjectURL(new Blob([wgConfig], { type: 'application/octet-stream' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${sc.vpnStoragePrefix}${service.user_service_id}.conf` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copySub() {
    if (!subUrl) return;
    if (!(await copyOrToast(subUrl))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const platform = useClientValue(detectPlatform, '');
  // Несколько приложений для подписки (Happ, V2RayTun…) — пользователь выбирает одно, шаги показывают только его
  // [id, название] приложений текущей платформы (или всех, если платформа не определена), без повторов
  const appChoices = isProxy ? [...new Map(sc.proxyApps.filter((a) => !platform || a.platform === platform).map((a) => [a.id, a.name || a.id])).entries()] : [];
  const [pickedApp, setPickedApp] = useState(() => {
    try {
      return localStorage.getItem(APP_CHOICE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const chosenApp = appChoices.length > 1 ? (appChoices.some(([id]) => id === pickedApp) ? pickedApp : appChoices[0][0]) : '';
  function pickApp(id: string) {
    setPickedApp(id);
    try {
      localStorage.setItem(APP_CHOICE_KEY, id);
    } catch {
      /* без запоминания */
    }
  }
  const proxyApps = chosenApp ? sc.proxyApps.filter((a) => a.id === chosenApp) : sc.proxyApps;
  // Приложения с URL-схемой для текущей платформы — кнопка «Добавить в …»
  const addApps = isProxy && platform ? proxyApps.filter((a) => a.platform === platform && a.schema) : [];

  /** Открыть подписку в приложении по его схеме; без схемы — просто ссылку подписки. */
  async function openInApp(schema?: string) {
    if (!subUrl) return;
    if (!schema) return openLink(subUrl);
    let link = `${schema}${subUrl}`;
    if (sc.showHappCryptoLink && schema === 'happ://add/') {
      try {
        const r = await fetch('https://crypto.happ.su/api-v2.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: subUrl }),
        });
        const d = await r.json();
        if (d?.encrypted_link) link = d.encrypted_link;
      } catch {
        /* используем обычную ссылку */
      }
    }
    openLink(link);
  }

  const apps = (isVpn ? sc.vpnApps : proxyApps).filter((a) => a.url);
  // «Добавить в Happ» по названию приложения; DEVICE_CONFIG_TEXT заменяет текст, только когда выбирать не из чего
  const addLabel = (name: string) => (appChoices.length <= 1 && sc.deviceConfigText) || (name ? `Добавить в ${name}` : 'Добавить в приложение');

  return (
    <div className="space-y-5">
      {/* Сведения об услуге — только когда подключать нечего (статус и срок уже в заголовке окна) */}
      {!hasConnection && (
        <div>
          <Row label="Стоимость">{formatMoney(service.service.cost)}</Row>
          {service.expire && <Row label="Действует до">{formatDate(service.expire)}</Row>}
          {service.next && <Row label="Следующий тариф">{nextInfo ? `${nextInfo.name} — ${formatMoney(nextInfo.cost)}` : `#${service.next}`}</Row>}
          {service.children && service.children.length > 0 && (
            <div className="mt-4">
              <p className="text-muted mb-2 text-sm">Входит в услугу:</p>
              {service.children.map((c) => (
                <Row key={c.user_service_id} label={c.service.name}>
                  <StatusBadge status={c.status} />
                </Row>
              ))}
            </div>
          )}
        </div>
      )}

      {hasConnection && (
        <div className="space-y-4">
          {connLoading ? (
            <p className="text-muted py-6 text-center text-sm">Загружаем данные подключения…</p>
          ) : !subUrl && !wgConfig ? (
            <p className="text-muted py-6 text-center text-sm">Данные подключения ещё готовятся. Обновите страницу через минуту.</p>
          ) : (
            <>
              {appChoices.length > 1 && (
                <div>
                  <p className="text-muted mb-2 text-sm">Выберите приложение</p>
                  <div
                    className="border-line flex flex-wrap gap-1 rounded-2xl border bg-black/30 p-1 text-sm font-semibold"
                    role="radiogroup"
                    aria-label="Приложение"
                  >
                    {appChoices.map(([id, name]) => (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={chosenApp === id}
                        onClick={() => pickApp(id)}
                        className={cn(
                          'flex-1 rounded-xl px-3 py-2 whitespace-nowrap transition',
                          chosenApp === id ? 'neon-ring bg-green/10' : 'text-muted hover:text-text',
                        )}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <ol className="space-y-5">
                {apps.length > 0 && (
                  <Step n={1} title="Скачайте приложение">
                    <AppDownloads apps={apps} />
                  </Step>
                )}
                <Step n={apps.length > 0 ? 2 : 1} title={isVpn ? 'Добавьте конфигурацию' : 'Добавьте подписку в приложение'}>
                  <div className="flex flex-wrap gap-2">
                    {isProxy &&
                      (addApps.length ? (
                        addApps.map((a, i) => (
                          <Button key={i} variant={i === 0 ? undefined : 'ghost'} onClick={() => openInApp(a.schema)}>
                            <IconDeviceMobileCog className="size-5" /> {addLabel(a.name)}
                          </Button>
                        ))
                      ) : (
                        <Button onClick={() => openInApp()}>
                          <IconDeviceMobileCog className="size-5" /> Открыть подписку
                        </Button>
                      ))}
                    {(isVpn || sc.showProxyQr) && (
                      <Button variant="ghost" onClick={() => setQrOpen(true)}>
                        <IconQrcode className="size-5" /> QR-код
                      </Button>
                    )}
                    {isVpn && (
                      <Button variant="ghost" onClick={downloadConfig}>
                        <IconDownload className="size-5" /> Скачать конфиг
                      </Button>
                    )}
                  </div>
                </Step>
                {isProxy && sc.showProxySubLink && subUrl && (
                  <Step n={apps.length > 0 ? 3 : 2} title="Ссылка на подписку (ваш ключ)">
                    <p className="text-muted mb-3 text-sm">Если приложение не открылось само, скопируйте ссылку и добавьте её в приложении вручную.</p>
                    <div className="border-line flex items-center gap-2 rounded-xl border bg-black/30 p-2 pl-3">
                      <code className="text-muted min-w-0 flex-1 truncate font-mono text-xs">{subUrl}</code>
                      <Button variant="subtle" size="icon" onClick={copySub} aria-label="Скопировать ссылку">
                        {copied ? <IconCheck className="text-green size-5" /> : <IconCopy className="size-5" />}
                      </Button>
                    </div>
                  </Step>
                )}
              </ol>
            </>
          )}
          <QrModal
            open={qrOpen}
            onOpenChange={setQrOpen}
            data={(isVpn ? wgConfig : subUrl) ?? ''}
            title={isVpn ? 'QR-код конфигурации' : 'QR-код подписки'}
            onDownload={isVpn ? downloadConfig : undefined}
          />
        </div>
      )}

      {isNotPaid && <PayForService service={service} onPaid={onChanged} />}

      {(canChange || canStop || canDelete) && (
        <div className="border-line grid gap-2 border-t pt-5 sm:grid-cols-3">
          {canChange && (
            <Button variant="ghost" onClick={() => onChangeTariff(service)}>
              <IconExchange className="size-4" /> Сменить тариф
            </Button>
          )}
          {canStop && (
            <Button variant="warning" onClick={() => setConfirm('stop')}>
              <IconPlayerStop className="size-4" /> Остановить
            </Button>
          )}
          {canDelete && (
            <Button variant="danger" onClick={() => setConfirm('delete')}>
              <IconTrash className="size-4" /> Удалить
            </Button>
          )}
        </div>
      )}

      <ConfirmModal
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === 'stop' ? 'Остановить услугу?' : 'Удалить услугу?'}
        message={
          confirm === 'stop' ? 'Услуга будет заблокирована. Возобновить её можно будет оплатой.' : 'Услуга будет удалена без возможности восстановления.'
        }
        confirmLabel={confirm === 'stop' ? 'Остановить' : 'Удалить'}
        tone={confirm === 'stop' ? 'warning' : 'danger'}
        loading={busy}
        onConfirm={stopOrDelete}
      />
    </div>
  );
}

/** Выбранное приложение для подписки — запоминается в браузере. */
const APP_CHOICE_KEY = 'vpnchr:proxy-app';

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="neon-ring grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold">{n}</span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="mb-3 font-semibold">{title}</p>
        {children}
      </div>
    </li>
  );
}

/** Оплата неоплаченной услуги: сумма из прогноза минус баланс. */
function PayForService({ service, onPaid }: { service: UserService; onPaid: () => void }) {
  const [need, setNeed] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [picked, setSelected] = useState('');
  const [paying, setPaying] = useState(false);
  const { items, loading } = usePaySystems(need !== null && need > 0);

  useEffect(() => {
    api
      .get('/user/pay/forecast')
      .then((r) => {
        const f = first<{ balance?: number; total: number; items?: ForecastItem[] }>(r);
        if (!f) return;
        const item = f.items?.find((i) => String(i.user_service_id) === String(service.user_service_id));
        const value = item ? Math.max(0, Math.ceil((item.total - (f.balance || 0)) * 100) / 100) : f.total > 0 ? Math.ceil(f.total * 100) / 100 : 0;
        setNeed(value);
        setAmount(String(value));
      })
      .catch(() => setNeed(0));
  }, [service.user_service_id]);

  const selected = items.some((p) => p.shm_url === picked) ? picked : (items[0]?.shm_url ?? '');

  if (need === null) return <p className="text-muted text-center text-sm">Считаем сумму к оплате…</p>;
  if (need <= 0) return null;

  async function submit() {
    const ps = items.find((p: PaySystem) => p.shm_url === selected);
    if (!ps) return;
    setPaying(true);
    try {
      const r = await pay(ps, amount);
      if (!r.ok) return void toast.error(r.error || 'Ошибка оплаты');
      toast.success(r.instant ? 'Оплата прошла успешно' : 'Страница оплаты открыта в новой вкладке');
      if (r.instant) onPaid();
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="glass-green space-y-4 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-semibold">
          <IconWallet className="text-green size-5" /> К оплате
        </span>
        <span className="font-display text-2xl font-bold">{formatMoney(need)}</span>
      </div>
      {loading ? (
        <p className="text-muted text-sm">Загружаем способы оплаты…</p>
      ) : items.length ? (
        <>
          <Select label="Способ оплаты" value={selected} onChange={(e) => setSelected(e.target.value)}>
            {items.map((p) => (
              <option key={p.shm_url} value={p.shm_url}>
                {p.name}
              </option>
            ))}
          </Select>
          <Input label="Сумма, ₽" type="number" min={1} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button block size="lg" loading={paying} onClick={submit}>
            <IconCreditCard className="size-5" /> Оплатить {amount} ₽
          </Button>
        </>
      ) : (
        <p className="text-muted text-sm">Способы оплаты недоступны</p>
      )}
    </div>
  );
}
