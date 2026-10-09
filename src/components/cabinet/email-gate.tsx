'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { shmMessage } from '@/lib/shm-messages';
import { toast } from '@/lib/toast';
import { useEmailModals } from '@/lib/email-store';
import { useUser } from '@/components/providers/user';
import { useConfig } from '@/components/providers/config';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const COOLDOWN_KEY = 'email_verify_last_sent';
const COOLDOWN_MS = 3 * 60 * 1000;

const msgOf = (r: unknown) => (r as { data?: { msg?: string }[] })?.data?.[0]?.msg;

function cooldownLeft() {
  try {
    const last = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
    return Math.max(0, Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 1000));
  } catch {
    return 0;
  }
}

/**
 * Привязка и подтверждение email.
 * При EMAIL_REQUIRED=true окно привязки нельзя закрыть, пока email не указан.
 */
export function EmailGate() {
  const { email } = useUser();
  const cfg = useConfig();
  const { emailOpen, verifyEmail, close } = useEmailModals();
  const blocked = cfg.email.required && !email?.email;
  const verifyTarget = verifyEmail === '' ? (email?.email ?? '') : verifyEmail;

  return (
    <>
      <Modal
        open={emailOpen || blocked}
        onOpenChange={(o) => !o && !blocked && close()}
        title="Привязать email"
        description={blocked ? 'Чтобы пользоваться кабинетом, укажите email.' : 'На него придут чеки и ссылка для восстановления пароля.'}
        size="sm"
      >
        <EmailForm />
      </Modal>

      <Modal
        open={verifyEmail !== null && !!verifyTarget}
        onOpenChange={(o) => !o && close()}
        title="Подтверждение email"
        description={`Код придёт на ${verifyTarget}`}
        size="sm"
      >
        {verifyTarget && <VerifyForm email={verifyTarget} />}
      </Modal>
    </>
  );
}

function EmailForm() {
  const { email } = useUser();
  const cfg = useConfig();
  const router = useRouter();
  const { openVerify, close } = useEmailModals();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    const v = value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return toast.error('Введите корректный email');
    if (email?.email === v) return toast.error('Это ваш текущий email');
    setSaving(true);
    try {
      const msg = msgOf(await api.put('/user/email', { email: v }));
      if (msg && msg !== 'Successful') return void toast.error(shmMessage(msg, 'Не удалось сохранить email'));
      toast.success('Email сохранён');
      router.refresh();
      if (cfg.email.verifyRequired || cfg.email.allowVerify) openVerify(v);
      else close();
    } catch {
      toast.error('Не удалось сохранить email');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Input label="Email" type="email" placeholder="example@email.com" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
      <Button type="submit" block loading={saving}>
        Сохранить
      </Button>
    </form>
  );
}

/** Монтируется при открытии: сразу отправляет код, если не действует пауза между отправками. */
function VerifyForm({ email }: { email: string }) {
  const router = useRouter();
  const { close } = useEmailModals();
  const [code, setCode] = useState('');
  const [left, setLeft] = useState(cooldownLeft);
  const [sending, setSending] = useState(() => cooldownLeft() === 0);
  const [confirming, setConfirming] = useState(false);

  async function send() {
    try {
      const msg = msgOf(await api.post('/user/email', { email }));
      if (msg && msg !== 'Verification code sent') return void toast.error(shmMessage(msg, 'Не удалось отправить код'));
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      setLeft(cooldownLeft());
      toast.success('Код отправлен на почту');
    } catch {
      toast.error('Не удалось отправить код');
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    // Отправка письма при открытии окна — обращение к внешней системе
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (sending) void send();
    const id = setInterval(() => setLeft(cooldownLeft()), 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function confirm() {
    if (!code.trim()) return;
    setConfirming(true);
    try {
      const msg = msgOf(await api.post('/user/email', { email, code: code.trim() }));
      if (msg && msg !== 'Email verified successfully') return void toast.error(shmMessage(msg, 'Неверный код'));
      toast.success('Email подтверждён');
      close();
      router.refresh();
    } catch {
      toast.error('Неверный код');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void confirm();
      }}
    >
      <Input label="Код из письма" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
      <Button type="submit" block loading={confirming} disabled={!code.trim()}>
        Подтвердить
      </Button>
      <Button
        variant="subtle"
        block
        disabled={left > 0}
        loading={sending}
        onClick={() => {
          setSending(true);
          void send();
        }}
      >
        {left > 0 ? `Отправить повторно через ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'Отправить код повторно'}
      </Button>
    </form>
  );
}
