'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconArrowLeft, IconBrandTelegram, IconFingerprint, IconRefresh } from '@tabler/icons-react';
import { api, ApiError, first } from '@/lib/api';
import { shmMessage } from '@/lib/shm-messages';
import { toast } from '@/lib/toast';
import { b64urlToBuffer, bufferToB64url } from '@/lib/webauthn';
import { getTelegramWebApp, type TelegramUser } from '@/lib/telegram';
import { useClientValue } from '@/lib/hooks';
import { safeNext } from '@/lib/utils';
import { useConfig } from '@/components/providers/config';
import { Button } from '@/components/ui/button';
import { Checkbox, Input } from '@/components/ui/input';
import { NewPasswordFields } from './new-password';
import { TelegramWidget } from './telegram-widget';

type View = 'login' | 'register' | 'otp' | 'reset' | 'newPassword';

const LEGAL_LABELS: Record<string, string> = {
  privacyPolicy: 'политикой конфиденциальности',
  termsOfUse: 'условиями использования',
  publicOffer: 'договором оферты',
  userAgreement: 'пользовательским соглашением',
  returnPolicy: 'политикой возврата',
};

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function LoginForm() {
  const cfg = useConfig();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));

  const [view, setView] = useState<View>(params.has('register') ? 'register' : 'login');
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const setPasswords = (v: { password: string; confirm: string }) => (setPassword(v.password), setConfirm(v.confirm));
  const [otp, setOtp] = useState('');
  const [resetLogin, setResetLogin] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [captcha, setCaptcha] = useState<{ image?: string; question?: string; token: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const supportsPasskey = useClientValue(() => !!window.PublicKeyCredential, false);
  const inTelegram = useClientValue(() => !!getTelegramWebApp(), false);
  const autoAuthTried = useRef(false);

  const done = useCallback(() => {
    toast.success('Добро пожаловать!');
    router.replace(next);
    router.refresh();
  }, [next, router]);

  // ── Капча при регистрации
  const loadCaptcha = useCallback(async () => {
    try {
      setCaptcha(first(await api.get('/user/captcha')) ?? null);
      setCaptchaAnswer('');
    } catch {
      /* без капчи */
    }
  }, []);
  // Первичная загрузка капчи, если открыли сразу регистрацию (?register)
  useEffect(() => {
    if (!cfg.security.captcha || !params.has('register')) return;
    api
      .get('/user/captcha')
      .then((r) => setCaptcha(first(r) ?? null))
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Ссылка сброса пароля: ?token=…
  useEffect(() => {
    const token = params.get('token');
    if (!token) return;
    window.history.replaceState(null, '', window.location.pathname);
    (async () => {
      try {
        const res = first<{ msg: string }>(await api.get('/user/passwd/reset/verify', { token }));
        if (res?.msg === 'Successful') {
          setResetToken(token);
          setView('newPassword');
        } else throw new Error();
      } catch {
        toast.error('Ссылка для сброса пароля недействительна или устарела');
      }
    })();
  }, [params]);

  // ── Вход по логину и паролю (+2FA)
  async function doLogin(otpToken?: string) {
    if (!login || !password) return toast.error('Заполните логин и пароль');
    setLoading(true);
    try {
      const res = await api.post<{ otp_required?: boolean }>('/user/auth', { login, password, ...(otpToken ? { otp_token: otpToken } : {}) });
      if (res?.otp_required) {
        setView('otp');
        return;
      }
      done();
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 429) toast.error('Слишком много попыток. Попробуйте позже');
      else if (err.status === 403 && String(err.data?.error).includes('Password authentication is disabled'))
        toast.error('Вход по паролю отключён. Используйте Passkey или Telegram');
      else toast.error(otpToken ? 'Неверный код подтверждения' : 'Неверный логин или пароль');
      setOtp('');
    } finally {
      setLoading(false);
    }
  }

  // ── Регистрация
  async function doRegister() {
    const errs: Record<string, string> = {};
    if (cfg.email.required ? !isEmail(login) : login.length < 6) errs.login = cfg.email.required ? 'Введите корректный email' : 'Минимум 6 символов';
    if (password.length < 6) errs.password = 'Минимум 6 символов';
    if (confirm !== password) errs.confirm = 'Пароли не совпадают';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (cfg.legal.length && !acceptedLegal) return toast.error('Примите условия, чтобы продолжить');
    if (cfg.security.captcha && (!captcha || !captchaAnswer.trim())) return toast.error('Введите ответ на капчу');

    setLoading(true);
    try {
      await api.put('/user', {
        login,
        password,
        ...(captcha ? { captcha_token: captcha.token, captcha_answer: captchaAnswer } : {}),
      });
      toast.success('Аккаунт создан');
      await doLogin();
    } catch (e) {
      const err = e as ApiError;
      toast.error(err.status === 429 ? 'Слишком много попыток. Попробуйте позже' : shmMessage(err.data?.error, 'Не удалось зарегистрироваться'));
      if (cfg.security.captcha) void loadCaptcha();
      setLoading(false);
    }
  }

  // ── Сброс пароля: пробуем как логин, затем как email
  async function doReset() {
    if (!resetLogin) return toast.error('Введите логин или email');
    setLoading(true);
    try {
      for (const body of [{ login: resetLogin }, { email: resetLogin }]) {
        const res = first<{ msg: string }>(await api.post('/user/passwd/reset', body).catch(() => null));
        if (res?.msg === 'Successful') {
          toast.success('Инструкция по сбросу отправлена на почту');
          setView('login');
          return;
        }
      }
      toast.error('Пользователь не найден');
    } finally {
      setLoading(false);
    }
  }

  async function doNewPassword() {
    if (password.length < 6) return setErrors({ password: 'Минимум 6 символов' });
    if (password !== confirm) return setErrors({ confirm: 'Пароли не совпадают' });
    setLoading(true);
    try {
      const res = first<{ msg: string }>(await api.post('/user/passwd/reset/verify', { token: resetToken, password }));
      if (res?.msg === 'Password reset successful') {
        toast.success('Пароль изменён. Войдите с новым паролем');
        setPassword('');
        setConfirm('');
        setView('login');
      } else toast.error(shmMessage(res?.msg, 'Ссылка для сброса пароля недействительна'));
    } catch (e) {
      toast.error(shmMessage((e as ApiError).data?.error, 'Ссылка для сброса пароля недействительна'));
    } finally {
      setLoading(false);
    }
  }

  // ── Passkey
  async function doPasskey() {
    setPasskeyLoading(true);
    try {
      const opts = first<{ challenge: string; timeout: number; rpId: string; userVerification: UserVerificationRequirement }>(
        await api.get('/user/auth/passkey'),
      )!;
      const cred = (await navigator.credentials.get({
        publicKey: { challenge: b64urlToBuffer(opts.challenge), timeout: opts.timeout, rpId: opts.rpId, userVerification: opts.userVerification },
      })) as PublicKeyCredential | null;
      if (!cred) throw new Error();
      const r = cred.response as AuthenticatorAssertionResponse;
      await api.post('/user/auth/passkey', {
        credential_id: bufferToB64url(cred.rawId),
        rawId: bufferToB64url(cred.rawId),
        response: {
          clientDataJSON: bufferToB64url(r.clientDataJSON),
          authenticatorData: bufferToB64url(r.authenticatorData),
          signature: bufferToB64url(r.signature),
          userHandle: r.userHandle ? bufferToB64url(r.userHandle) : undefined,
        },
      });
      done();
    } catch {
      toast.error('Не удалось войти по Passkey');
    } finally {
      setPasskeyLoading(false);
    }
  }

  // ── Telegram
  async function doTelegramWidget(user: TelegramUser) {
    setLoading(true);
    try {
      await api.post('/telegram/web/auth', { ...user, profile: cfg.telegram.botProfile, register_if_not_exists: 1 });
      done();
    } catch {
      toast.error('Не удалось войти через Telegram');
      setLoading(false);
    }
  }

  function doTelegramOidc() {
    const q = new URLSearchParams({
      profile: cfg.telegram.botProfile,
      register_if_not_exists: '1',
      return_url: `${window.location.origin}${next}`,
    });
    // Это API-маршрут прокси (редирект на Telegram), а не страница приложения
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/api/telegram/web/auth/start?${q}`);
  }

  const doTelegramWebApp = useCallback(async () => {
    const tg = getTelegramWebApp();
    if (!tg?.initData) return toast.error('Не удалось получить данные Telegram');
    setLoading(true);
    try {
      await api.get('/telegram/webapp/auth', { initData: tg.initData, profile: cfg.telegram.webAppProfile });
      done();
    } catch {
      toast.error('Не удалось войти через Telegram');
      setLoading(false);
    }
  }, [cfg.telegram.webAppProfile, done]);

  // Автовход в Telegram WebApp (не чаще раза в минуту)
  useEffect(() => {
    if (!inTelegram || !cfg.telegram.webAppAuth || !cfg.telegram.webAppAutoAuth || autoAuthTried.current) return;
    const key = 'tg_webapp_auto_auth_attempted';
    const last = Number(sessionStorage.getItem(key) || 0);
    if (last && Date.now() - last < 60_000) return;
    autoAuthTried.current = true;
    sessionStorage.setItem(key, String(Date.now()));
    // Синхронизация с внешней системой (Telegram): запуск входа по готовности initData
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void doTelegramWebApp();
  }, [inTelegram, cfg.telegram, doTelegramWebApp]);

  const showTelegramWebApp = inTelegram && cfg.telegram.webAppAuth;
  const showTelegramWidget = !inTelegram && cfg.telegram.widgetAuth;
  const showTelegramOidc = !inTelegram && cfg.telegram.oidcAuth;
  const showPasskey = cfg.security.passkey && !cfg.security.passkeyAuthDisabled && supportsPasskey;
  const hasAlt = showTelegramWebApp || showTelegramWidget || showTelegramOidc || showPasskey;

  const title = { login: 'Вход', register: 'Регистрация', otp: 'Подтверждение', reset: 'Сброс пароля', newPassword: 'Новый пароль' }[view];

  return (
    <div className="glass shadow-card w-full max-w-md rounded-3xl p-6 sm:p-8">
      {view !== 'login' && view !== 'register' && (
        <button type="button" onClick={() => setView('login')} className="text-muted hover:text-text mb-4 flex items-center gap-1 text-sm">
          <IconArrowLeft className="size-4" /> Назад
        </button>
      )}

      {(view === 'login' || view === 'register') && (
        <div className="border-line mb-6 grid grid-cols-2 rounded-full border bg-black/30 p-1 text-sm font-semibold" role="tablist">
          {(['login', 'register'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => {
                setView(v);
                setErrors({});
                if (v === 'register' && cfg.security.captcha && !captcha) void loadCaptcha();
              }}
              className={`rounded-full py-2.5 transition ${view === v ? 'neon-ring bg-green/10 text-text' : 'text-muted hover:text-text'}`}
            >
              {v === 'login' ? 'Вход' : 'Регистрация'}
            </button>
          ))}
        </div>
      )}

      <h1 className="sr-only">{title}</h1>

      {view === 'login' && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void doLogin();
          }}
        >
          <Input label="Логин или email" autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} autoFocus />
          <Input label="Пароль" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="flex justify-end">
            <button type="button" className="text-muted hover:text-green text-sm" onClick={() => setView('reset')}>
              Забыли пароль?
            </button>
          </div>
          <Button type="submit" size="lg" block loading={loading}>
            Войти
          </Button>
        </form>
      )}

      {view === 'register' && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void doRegister();
          }}
        >
          <Input
            label={cfg.email.required ? 'Email' : 'Логин'}
            type={cfg.email.required ? 'email' : 'text'}
            autoComplete="username"
            value={login}
            error={errors.login}
            onChange={(e) => setLogin(e.target.value)}
            autoFocus
          />
          <NewPasswordFields password={password} confirm={confirm} onChange={setPasswords} errors={errors} />

          {cfg.security.captcha && captcha && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {captcha.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={captcha.image} alt="Капча" className="h-12 rounded-lg bg-white" />
                ) : (
                  <span className="font-semibold">{captcha.question}</span>
                )}
                <Button variant="subtle" size="icon" onClick={loadCaptcha} aria-label="Обновить капчу">
                  <IconRefresh className="size-5" />
                </Button>
              </div>
              <Input placeholder="Ответ" value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} />
            </div>
          )}

          {cfg.legal.length > 0 && (
            <Checkbox
              checked={acceptedLegal}
              onChange={(e) => setAcceptedLegal(e.target.checked)}
              label={
                <>
                  Я согласен с{' '}
                  {cfg.legal.map((l, i) => (
                    <span key={l.key}>
                      {i > 0 && (i === cfg.legal.length - 1 ? ' и ' : ', ')}
                      <a href={l.href} target="_blank" rel="noreferrer" className="text-green underline-offset-2 hover:underline">
                        {LEGAL_LABELS[l.key] ?? l.key}
                      </a>
                    </span>
                  ))}
                </>
              }
            />
          )}

          <Button type="submit" size="lg" block loading={loading}>
            Создать аккаунт
          </Button>
        </form>
      )}

      {view === 'otp' && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void doLogin(otp);
          }}
        >
          <p className="text-muted text-sm">Введите 6-значный код из приложения-аутентификатора или резервный код.</p>
          <Input
            label="Код подтверждения"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.trim())}
            className="text-center font-mono text-xl tracking-[0.4em]"
            autoFocus
          />
          <Button type="submit" size="lg" block loading={loading} disabled={!otp}>
            Подтвердить
          </Button>
        </form>
      )}

      {view === 'reset' && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void doReset();
          }}
        >
          <p className="text-muted text-sm">Мы отправим ссылку для сброса пароля на почту, привязанную к аккаунту.</p>
          <Input label="Логин или email" value={resetLogin} onChange={(e) => setResetLogin(e.target.value)} autoFocus />
          <Button type="submit" size="lg" block loading={loading}>
            Отправить ссылку
          </Button>
        </form>
      )}

      {view === 'newPassword' && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void doNewPassword();
          }}
        >
          <NewPasswordFields label="Новый пароль" password={password} confirm={confirm} onChange={setPasswords} errors={errors} autoFocus />
          <Button type="submit" size="lg" block loading={loading}>
            Сохранить пароль
          </Button>
        </form>
      )}

      {(view === 'login' || view === 'register') && hasAlt && (
        <>
          <div className="text-muted my-6 flex items-center gap-3 text-xs tracking-widest uppercase">
            <span className="bg-line h-px flex-1" /> или <span className="bg-line h-px flex-1" />
          </div>
          <div className="space-y-3">
            {showTelegramWebApp && (
              <Button variant="ghost" block onClick={doTelegramWebApp} loading={loading}>
                <IconBrandTelegram className="size-5 text-[#2aabee]" /> Войти через Telegram
              </Button>
            )}
            {showTelegramOidc && (
              <Button variant="ghost" block onClick={doTelegramOidc}>
                <IconBrandTelegram className="size-5 text-[#2aabee]" /> Войти через Telegram
              </Button>
            )}
            {showTelegramWidget && <TelegramWidget botName={cfg.telegram.botName} onAuth={doTelegramWidget} />}
            {showPasskey && (
              <Button variant="ghost" block onClick={doPasskey} loading={passkeyLoading}>
                <IconFingerprint className="text-green size-5" /> Войти по Passkey
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
