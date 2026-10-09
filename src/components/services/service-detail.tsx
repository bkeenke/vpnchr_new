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
import type { Platform } from '@/lib/config';
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

export function ServiceDetail({
  service,
  initialTab,
  onChanged,
  onChangeTariff,
}: {
  service: UserService;
  initialTab?: 'info' | 'config';
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

  const [tab, setTab] = useState<'info' | 'config'>(initialTab === 'config' && hasConnection ? 'config' : 'info');
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
    await navigator.clipboard.writeText(subUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const platform = useClientValue(detectPlatform, '');
  const urlSchema = isProxy && platform ? sc.proxyUrlSchemas[platform as Platform] : undefined;

  async function openInApp() {
    if (!subUrl) return;
    if (!urlSchema) return openLink(subUrl);
    let link = `${urlSchema}${subUrl}`;
    if (sc.showHappCryptoLink && urlSchema === 'happ://add/') {
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

  const apps = isVpn ? sc.vpnApps : sc.proxyApps;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-muted text-xs">#{service.user_service_id}</p>
          <p className="font-display text-xl font-bold">{service.service.name}</p>
        </div>
        <StatusBadge status={service.status} />
      </div>

      {hasConnection && (
        <div className="border-line grid grid-cols-2 rounded-full border bg-black/30 p-1 text-sm font-semibold" role="tablist">
          {(['config', 'info'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn('rounded-full py-2 transition', tab === t ? 'neon-ring bg-green/10' : 'text-muted hover:text-text')}
            >
              {t === 'config' ? 'Подключение' : 'Информация'}
            </button>
          ))}
        </div>
      )}

      {tab === 'info' && (
        <div>
          <Row label="Статус">
            <StatusBadge status={service.status} />
          </Row>
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

      {tab === 'config' && hasConnection && (
        <div className="space-y-4">
          {connLoading ? (
            <p className="text-muted py-6 text-center text-sm">Загружаем данные подключения…</p>
          ) : !subUrl && !wgConfig ? (
            <p className="text-muted py-6 text-center text-sm">Данные подключения ещё готовятся. Обновите страницу через минуту.</p>
          ) : (
            <ol className="space-y-5">
              {apps.length > 0 && (
                <Step n={1} title="Скачайте приложение">
                  <AppDownloads apps={apps} />
                </Step>
              )}
              <Step n={apps.length > 0 ? 2 : 1} title={isVpn ? 'Добавьте конфигурацию' : 'Добавьте подписку в приложение'}>
                <div className="flex flex-wrap gap-2">
                  {isProxy && (
                    <Button onClick={openInApp}>
                      <IconDeviceMobileCog className="size-5" /> {urlSchema ? sc.deviceConfigText || 'Добавить в приложение' : 'Открыть подписку'}
                    </Button>
                  )}
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
                {isProxy && sc.showProxySubLink && subUrl && (
                  <div className="border-line mt-3 flex items-center gap-2 rounded-xl border bg-black/30 p-2 pl-3">
                    <code className="text-muted min-w-0 flex-1 truncate font-mono text-xs">{subUrl}</code>
                    <Button variant="subtle" size="icon" onClick={copySub} aria-label="Скопировать ссылку">
                      {copied ? <IconCheck className="text-green size-5" /> : <IconCopy className="size-5" />}
                    </Button>
                  </div>
                )}
              </Step>
            </ol>
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
