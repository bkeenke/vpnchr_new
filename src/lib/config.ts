import 'server-only';
import { cache } from 'react';
import { cachedLoader } from './remote';

/**
 * Настройки кабинета хранятся в SHM и запрашиваются сервером Next.js:
 *   GET {SHM_URL}/shm/v1/public/get_config?key={CONFIG_KEY}
 * Браузер этот запрос не видит — в страницу попадает только готовый публичный конфиг.
 *
 * Значение ключа в SHM — плоский JSON с теми же именами, что переменные shm-client-2:
 *   { "APP_NAME": "VPNCHR", "SUPPORT_LINK": "https://t.me/…", "OTP_ENABLE": true, … }
 * Регистр ключей не важен, флаги — true/false или "true"/"false".
 *
 * В env остаются только адрес SHM и ключ конфига (+ CONFIG_TTL, COOKIE_SECURE).
 * Кэш — lib/remote.ts.
 */

type Raw = Record<string, unknown>;

const readEnv = (...names: string[]) => names.map((n) => process.env[n]).find((v) => v !== undefined && v !== '');

export function getServerConfig() {
  const host = readEnv('SHM_HOST', 'shm_host');
  return {
    shmUrl: (readEnv('SHM_URL', 'shm_url') || (host ? `https://${host}` : 'http://localhost:8081')).replace(/\/$/, ''),
    configKey: readEnv('CONFIG_KEY', 'config_key') ?? '',
    /** Сколько секунд конфиг считается свежим. */
    ttlMs: (Number(readEnv('CONFIG_TTL', 'config_ttl')) || 60) * 1000,
  };
}

/* ───────── Загрузка и кэш ───────── */

/** Ответ SHM бывает объектом, { data: {...} }, { data: [{...}] } или JSON-строкой — приводим к плоскому объекту с ключами в верхнем регистре. */
function normalize(body: unknown): Raw {
  let v: unknown = body;
  if (v && typeof v === 'object' && 'data' in v) v = (v as { data: unknown }).data;
  if (Array.isArray(v)) v = v[0];
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      return {};
    }
  }
  if (!v || typeof v !== 'object') return {};
  return Object.fromEntries(Object.entries(v as Raw).map(([k, val]) => [k.toUpperCase(), val]));
}

async function fetchRemote(): Promise<Raw> {
  const { shmUrl, configKey } = getServerConfig();
  if (!configKey) return {};
  const url = `${shmUrl}/shm/v1/public/get_config?key=${encodeURIComponent(configKey)}`;
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`get_config ${res.status}`);
  return normalize(await res.json());
}

const loadRaw = cachedLoader<Raw>('config', fetchRemote, {}, () => getServerConfig().ttlMs);

/* ───────── Чтение значений ───────── */

type Reader = {
  env: (name: string, fallback?: string) => string;
  flag: (name: string, fallback: boolean) => boolean;
  list: (name: string) => string[];
};

function reader(raw: Raw): Reader {
  const get = (name: string) => raw[name];
  const env = (name: string, fallback = '') => {
    const v = get(name);
    return v === undefined || v === null || v === '' ? fallback : String(v);
  };
  return {
    env,
    flag: (name, fallback) => {
      const v = get(name);
      if (v === undefined || v === null || v === '') return fallback;
      return v === true || v === 1 || String(v).toLowerCase() === 'true' || v === '1';
    },
    list: (name) => {
      const v = get(name);
      const items = Array.isArray(v) ? v.map(String) : env(name).split(',');
      return items.map((s) => s.trim()).filter(Boolean);
    },
  };
}

export type Platform = 'windows' | 'linux' | 'macos' | 'ios' | 'android';
const PLATFORM_ENV: Record<Platform, string> = {
  windows: 'WINDOWS',
  linux: 'LINUX',
  macos: 'MAC',
  ios: 'IOS',
  android: 'ANDROID',
};

function apps(env: Reader['env'], kind: 'VPN' | 'PROXY') {
  return (Object.keys(PLATFORM_ENV) as Platform[])
    .map((p) => ({
      platform: p,
      url: env(`${kind}_APP_${PLATFORM_ENV[p]}_URL`),
      name: env(`${kind}_${PLATFORM_ENV[p]}_APP_NAME`),
    }))
    .filter((a) => a.url);
}

function urlSchemas(env: Reader['env']) {
  const out: Partial<Record<Platform, string>> = {};
  for (const p of Object.keys(PLATFORM_ENV) as Platform[]) {
    const v = env(`${PLATFORM_ENV[p]}_PROXY_URL_SCHEMA`);
    if (v) out[p] = v;
  }
  return out;
}

/** Всё, что безопасно отдавать в браузер. */
function buildPublicConfig({ env, flag, list }: Reader) {
  return {
    appName: env('APP_NAME', 'VPNCHR'),
    appDescription: env('APP_DESCRIPTION', 'Быстрый и надёжный VPN'),
    supportLink: env('SUPPORT_LINK'),
    contactEmail: env('CONTACT_EMAIL'),
    contactPhone: env('CONTACT_PHONE'),
    legal: [
      { key: 'privacyPolicy', href: env('PRIVACY_POLICY_URL') },
      { key: 'termsOfUse', href: env('TERMS_OF_USE_URL') },
      { key: 'publicOffer', href: env('PUBLIC_OFFER_URL') },
      { key: 'userAgreement', href: env('USER_AGREEMENT_URL') },
      { key: 'returnPolicy', href: env('RETURN_POLICY_URL') },
    ].filter((l) => l.href) as { key: string; href: string }[],

    telegram: {
      botName: env('TELEGRAM_BOT_NAME'),
      widgetAuth: flag('TELEGRAM_BOT_AUTH_ENABLE', false) && !!env('TELEGRAM_BOT_NAME'),
      oidcAuth: flag('TELEGRAM_OIDC_AUTH_ENABLE', false),
      botProfile: env('TELEGRAM_BOT_AUTH_PROFILE', 'telegram_bot'),
      webAppAuth: flag('TELEGRAM_WEBAPP_AUTH_ENABLE', false),
      webAppAutoAuth: flag('TELEGRAM_WEBAPP_AUTO_AUTH_ENABLE', false),
      webAppProfile: env('TELEGRAM_WEBAPP_PROFILE'),
      allowPin: flag('ALLOW_TELEGRAM_PIN', false),
    },

    security: {
      otp: flag('OTP_ENABLE', true),
      passkey: flag('PASSKEY_ENABLE', true),
      passkeyAuthDisabled: flag('PASSKEY_AUTH_DISABLED', false),
      captcha: flag('CAPTCHA_ENABLED', false),
    },

    email: {
      required: flag('EMAIL_REQUIRED', false),
      verifyRequired: flag('EMAIL_VERIFY_REQUIRED', false),
      allowVerify: flag('ALLOW_EMAIL_VERIFY', false),
    },

    services: {
      vpnCategories: list('VPN_CATEGORY'),
      vpnTitle: env('VPN_CATEGORY_TITLE'),
      vpnStoragePrefix: env('VPN_STORAGE_PREFIX', 'vpn'),
      proxyCategories: list('PROXY_CATEGORY'),
      proxyTitle: env('PROXY_CATEGORY_TITLE'),
      proxyStoragePrefix: env('PROXY_STORAGE_PREFIX', 'vpn_mrzb_'),
      showProxySubLink: flag('SHOW_PROXY_SUB_LINK', true),
      showProxyQr: flag('SHOW_PROXY_QR', true),
      showHappCryptoLink: flag('SHOW_HAPP_CRYPTOLINK', false),
      deviceConfigText: env('DEVICE_CONFIG_TEXT'),
      visibleCategories: list('VISIBLE_CATEGORIES').map((c) => c.toLowerCase()),
      allowBlock: flag('ALLOW_SERVICE_BLOCKED', true),
      allowDelete: flag('ALLOW_SERVICE_DELETE', true),
      allowChange: flag('ALLOW_SERVICE_CHANGE', true),
      changeForce: flag('ALLOW_SERVICE_CHANGE_FORCE', false),
      changeAllCategories: flag('SERVICE_CHANGE_ALL_CATEGORY', true),
      blockOrderIfUnpaid: flag('BLOCK_ORDER_IF_UNPAID', false),
      orderSorting: env('ORDER_SORTING', 'cost_asc'),
      costDiscount: flag('ORDER_COST_DISCOUNT', true),
      costWithBonuses: flag('ORDER_COST_WITH_BONUSES', false),
      vpnApps: apps(env, 'VPN'),
      proxyApps: apps(env, 'PROXY'),
      proxyUrlSchemas: urlSchemas(env),
    },

    widgets: {
      bitrixScriptUrl: env('BITRIX_WIDGET_SCRIPT_URL'),
      supportWidgetUrl: env('SUPPORT_WIDGET_URL'),
      supportWidgetApi: env('SUPPORT_WIDGET_API'),
    },

    push: {
      enabled: flag('WEB_PUSH_ENABLE', false),
      vapidPublicKey: env('VAPID_PUBLIC_KEY'),
    },
  };
}

export type PublicConfig = ReturnType<typeof buildPublicConfig>;

/** Публичный конфиг текущего запроса (загрузка из SHM дедуплицируется в пределах запроса). */
export const getPublicConfig = cache(async (): Promise<PublicConfig> => buildPublicConfig(reader(await loadRaw())));
