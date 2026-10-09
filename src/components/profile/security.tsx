'use client';

import { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { IconCheck, IconCopy, IconFingerprint, IconKey, IconLock, IconPencil, IconShieldLock, IconTrash } from '@tabler/icons-react';
import { api, first } from '@/lib/api';
import { toast } from '@/lib/toast';
import { useClientValue } from '@/lib/hooks';
import { b64urlToBuffer, bufferToB64url } from '@/lib/webauthn';
import { cn, formatDate } from '@/lib/utils';
import { useConfig } from '@/components/providers/config';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ConfirmModal, Modal } from '@/components/ui/modal';

type Tab = 'password' | 'otp' | 'passkey' | 'passwordAuth';

export function SecuritySettings() {
  const cfg = useConfig();
  const passkey = cfg.security.passkey && !cfg.security.passkeyAuthDisabled;
  const tabs: { id: Tab; label: string; icon: typeof IconKey }[] = [
    { id: 'password', label: 'Пароль', icon: IconKey },
    ...(cfg.security.otp ? [{ id: 'otp' as const, label: '2FA', icon: IconShieldLock }] : []),
    ...(passkey ? [{ id: 'passkey' as const, label: 'Passkey', icon: IconFingerprint }] : []),
    ...(passkey ? [{ id: 'passwordAuth' as const, label: 'Вход', icon: IconLock }] : []),
  ];
  const [tab, setTab] = useState<Tab>('password');

  return (
    <Card className="lg:col-span-2">
      <p className="mb-4 font-semibold">Безопасность</p>
      {tabs.length > 1 && (
        <div className="border-line mb-5 flex gap-1 overflow-x-auto rounded-full border bg-black/30 p-1 text-sm font-semibold" role="tablist">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 whitespace-nowrap transition',
                tab === id ? 'neon-ring bg-green/10' : 'text-muted hover:text-text',
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
      )}
      {tab === 'password' && <PasswordChange />}
      {tab === 'otp' && <OtpSettings />}
      {tab === 'passkey' && <PasskeySettings />}
      {tab === 'passwordAuth' && <PasswordAuthSettings />}
    </Card>
  );
}

function PasswordChange() {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (password.length < 6) return toast.error('Минимум 6 символов');
    setSaving(true);
    try {
      await api.post('/user/passwd', { password });
      toast.success('Пароль изменён');
      setPassword('');
    } catch {
      toast.error('Не удалось изменить пароль');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="flex-1">
        <Input label="Новый пароль" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" loading={saving} disabled={!password}>
        Сменить пароль
      </Button>
    </form>
  );
}

/* ───────── 2FA (TOTP) ───────── */

type OtpStatus = { enabled: boolean; verified: boolean; required: boolean };
type OtpSetup = { qr_url: string; secret: string; backup_codes: string[] };

function useLoad<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    load()
      .then((d) => !cancelled && (setData(d), setError(false)))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, error, loading: data === null && !error, reload: useCallback(() => setVersion((v) => v + 1), []) };
}

function OtpSettings() {
  const { data: status, loading, reload } = useLoad(async () => first<OtpStatus>(await api.get('/user/otp')) ?? null);
  const [setup, setSetup] = useState<OtpSetup | null>(null);
  const [backup, setBackup] = useState<string[] | null>(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function start() {
    setBusy(true);
    try {
      setSetup(first<OtpSetup>(await api.post('/user/otp/setup')) ?? null);
      setToken('');
    } catch {
      toast.error('Не удалось начать настройку 2FA');
    } finally {
      setBusy(false);
    }
  }

  async function enable() {
    if (token.length !== 6) return toast.error('Введите 6-значный код');
    setBusy(true);
    try {
      await api.put('/user/otp', { token });
      toast.success('Двухфакторная защита включена');
      setBackup(setup?.backup_codes ?? []);
      setSetup(null);
      reload();
    } catch {
      toast.error('Неверный код');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!token) return toast.error('Введите код или резервный код');
    setBusy(true);
    try {
      await api.del('/user/otp', { token });
      toast.success('Двухфакторная защита отключена');
      setDisableOpen(false);
      setToken('');
      reload();
    } catch {
      toast.error('Неверный код');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-muted text-sm">Загрузка…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-medium">Двухфакторная аутентификация {status?.enabled && <Badge tone="green">Включена</Badge>}</p>
          <p className="text-muted mt-1 text-sm">Код из приложения-аутентификатора (Google Authenticator, Aegis и др.) при каждом входе.</p>
        </div>
        {status?.enabled ? (
          <Button variant="danger" size="sm" onClick={() => (setToken(''), setDisableOpen(true))}>
            Отключить
          </Button>
        ) : (
          <Button size="sm" loading={busy && !setup} onClick={start}>
            Включить
          </Button>
        )}
      </div>

      <Modal open={!!setup} onOpenChange={(o) => !o && setSetup(null)} title="Настройка 2FA" size="sm">
        {setup && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void enable();
            }}
          >
            <p className="text-muted text-sm">Отсканируйте QR-код в приложении-аутентификаторе или введите ключ вручную.</p>
            <div className="mx-auto w-fit rounded-2xl bg-white p-3">
              <QRCodeSVG value={setup.qr_url} size={200} />
            </div>
            <div className="border-line flex items-center gap-2 rounded-xl border bg-black/30 p-2 pl-3">
              <code className="min-w-0 flex-1 font-mono text-sm break-all">{setup.secret}</code>
              <Button
                variant="subtle"
                size="icon"
                aria-label="Скопировать ключ"
                onClick={async () => {
                  await navigator.clipboard.writeText(setup.secret);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                }}
              >
                {copied ? <IconCheck className="text-green size-5" /> : <IconCopy className="size-5" />}
              </Button>
            </div>
            <Input
              label="Код из приложения"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
              className="text-center font-mono text-xl tracking-[0.4em]"
            />
            <Button type="submit" block loading={busy} disabled={token.length !== 6}>
              Подтвердить и включить
            </Button>
          </form>
        )}
      </Modal>

      <Modal open={!!backup} onOpenChange={(o) => !o && setBackup(null)} title="Резервные коды" size="sm">
        {backup && (
          <div className="space-y-4">
            <p className="text-muted text-sm">Сохраните коды в надёжном месте. Каждый код можно использовать один раз, если нет доступа к приложению.</p>
            <div className="border-line grid grid-cols-2 gap-2 rounded-xl border bg-black/30 p-4 font-mono text-sm">
              {backup.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
            <Button
              variant="ghost"
              block
              onClick={async () => {
                await navigator.clipboard.writeText(backup.join('\n'));
                toast.success('Коды скопированы');
              }}
            >
              <IconCopy className="size-5" /> Скопировать коды
            </Button>
            <Button block onClick={() => setBackup(null)}>
              Я сохранил коды
            </Button>
          </div>
        )}
      </Modal>

      <Modal open={disableOpen} onOpenChange={setDisableOpen} title="Отключить 2FA?" size="sm">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void disable();
          }}
        >
          <p className="text-muted text-sm">Введите код из приложения или резервный код.</p>
          <Input label="Код" value={token} onChange={(e) => setToken(e.target.value.trim())} autoFocus />
          <Button type="submit" variant="danger" block loading={busy}>
            Отключить
          </Button>
        </form>
      </Modal>
    </div>
  );
}

/* ───────── Passkey ───────── */

type Credential = { id: string; name: string; created_at: string };

type RegisterOptions = {
  challenge: string;
  rp: { name: string; id: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: { type: string; alg: number }[];
  timeout: number;
  attestation: string;
  excludeCredentials?: { id: string; type: string }[];
  authenticatorSelection: { authenticatorAttachment?: string; residentKey?: string; userVerification?: string };
};

function PasskeySettings() {
  const supported = useClientValue(() => !!window.PublicKeyCredential, true);
  const { data, loading, reload } = useLoad(async () => first<{ credentials: Credential[] }>(await api.get('/user/passkey'))?.credentials ?? []);
  const [registering, setRegistering] = useState(false);
  const [toDelete, setToDelete] = useState<Credential | null>(null);
  const [toRename, setToRename] = useState<Credential | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function register() {
    setRegistering(true);
    try {
      const o = first<RegisterOptions>(await api.get('/user/passkey/register'))!;
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge: b64urlToBuffer(o.challenge),
          rp: o.rp,
          user: { id: b64urlToBuffer(o.user.id), name: o.user.name, displayName: o.user.displayName },
          pubKeyCredParams: o.pubKeyCredParams.map((p) => ({ type: p.type as PublicKeyCredentialType, alg: p.alg })),
          timeout: o.timeout,
          attestation: o.attestation as AttestationConveyancePreference,
          excludeCredentials: (o.excludeCredentials ?? []).map((c) => ({ id: b64urlToBuffer(c.id), type: c.type as PublicKeyCredentialType })),
          authenticatorSelection: o.authenticatorSelection as AuthenticatorSelectionCriteria,
        },
      })) as PublicKeyCredential | null;
      if (!cred) throw new Error();
      const r = cred.response as AuthenticatorAttestationResponse;
      await api.post('/user/passkey/register', {
        credential_id: bufferToB64url(cred.rawId),
        rawId: bufferToB64url(cred.rawId),
        response: { clientDataJSON: bufferToB64url(r.clientDataJSON), attestationObject: bufferToB64url(r.attestationObject) },
      });
      toast.success('Passkey добавлен');
      reload();
    } catch (e) {
      const n = (e as Error)?.name;
      toast.error(n === 'InvalidStateError' ? 'Этот ключ уже зарегистрирован' : n === 'NotAllowedError' ? 'Операция отменена' : 'Не удалось добавить Passkey');
    } finally {
      setRegistering(false);
    }
  }

  async function remove() {
    if (!toDelete) return;
    setBusy(true);
    try {
      await api.del('/user/passkey', { credential_id: toDelete.id });
      toast.success('Passkey удалён');
      setToDelete(null);
      reload();
    } catch {
      toast.error('Не удалось удалить Passkey');
    } finally {
      setBusy(false);
    }
  }

  async function rename() {
    if (!toRename || !name.trim()) return;
    setBusy(true);
    try {
      await api.post('/user/passkey', { credential_id: toRename.id, name: name.trim() });
      toast.success('Название изменено');
      setToRename(null);
      reload();
    } catch {
      toast.error('Не удалось переименовать');
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return <p className="text-muted text-sm">Этот браузер не поддерживает Passkey.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted max-w-md text-sm">Вход по отпечатку пальца, Face ID или ключу безопасности — без пароля.</p>
        <Button size="sm" loading={registering} onClick={register}>
          <IconFingerprint className="size-4" /> Добавить Passkey
        </Button>
      </div>
      {loading ? (
        <p className="text-muted text-sm">Загрузка…</p>
      ) : !data?.length ? (
        <p className="border-line text-muted rounded-xl border border-dashed p-4 text-center text-sm">Пока нет ключей</p>
      ) : (
        <ul className="space-y-2">
          {data.map((c) => (
            <li key={c.id} className="border-line flex items-center gap-3 rounded-xl border p-3">
              <IconFingerprint className="text-green size-6" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{c.name}</span>
                <span className="text-muted text-xs">Добавлен {formatDate(c.created_at)}</span>
              </span>
              <Button variant="subtle" size="icon" aria-label="Переименовать" onClick={() => (setName(c.name), setToRename(c))}>
                <IconPencil className="size-4" />
              </Button>
              <Button variant="subtle" size="icon" aria-label="Удалить" onClick={() => setToDelete(c)}>
                <IconTrash className="text-danger size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!toRename} onOpenChange={(o) => !o && setToRename(null)} title="Переименовать ключ" size="sm">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void rename();
          }}
        >
          <Input label="Название" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <Button type="submit" block loading={busy}>
            Сохранить
          </Button>
        </form>
      </Modal>
      <ConfirmModal
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Удалить Passkey?"
        message={`Ключ «${toDelete?.name}» больше нельзя будет использовать для входа.`}
        confirmLabel="Удалить"
        loading={busy}
        onConfirm={remove}
      />
    </div>
  );
}

/* ───────── Вход по паролю ───────── */

function PasswordAuthSettings() {
  const {
    data: status,
    loading,
    error,
    reload,
  } = useLoad(async () => first<{ password_auth_disabled: number; passkey_enabled: number }>(await api.get('/user/password-auth')) ?? null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggle(disable: boolean) {
    setBusy(true);
    try {
      if (disable) await api.del('/user/password-auth');
      else await api.post('/user/password-auth');
      toast.success(disable ? 'Вход по паролю отключён' : 'Вход по паролю включён');
      setConfirm(false);
      reload();
    } catch {
      toast.error('Не удалось изменить настройку');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-muted text-sm">Загрузка…</p>;
  if (error || !status) return <p className="text-danger text-sm">Не удалось загрузить настройки</p>;
  const disabled = status.password_auth_disabled === 1;
  const passkeyReady = !!status.passkey_enabled;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-medium">
            Вход по паролю <Badge tone={disabled ? 'yellow' : 'green'}>{disabled ? 'Отключён' : 'Включён'}</Badge>
          </p>
          <p className="text-muted mt-1 max-w-md text-sm">
            {passkeyReady
              ? 'Можно оставить вход только по Passkey — это защищает от подбора пароля.'
              : 'Сначала добавьте Passkey, чтобы отключить вход по паролю.'}
          </p>
        </div>
        {disabled ? (
          <Button size="sm" loading={busy} disabled={!passkeyReady} onClick={() => toggle(false)}>
            Включить
          </Button>
        ) : (
          <Button size="sm" variant="danger" disabled={!passkeyReady} onClick={() => setConfirm(true)}>
            Отключить
          </Button>
        )}
      </div>
      <ConfirmModal
        open={confirm}
        onOpenChange={setConfirm}
        title="Отключить вход по паролю?"
        message="Войти можно будет только по Passkey. Убедитесь, что ключ доступен."
        confirmLabel="Отключить"
        loading={busy}
        onConfirm={() => toggle(true)}
      />
    </div>
  );
}
