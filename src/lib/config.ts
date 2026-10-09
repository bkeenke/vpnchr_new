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
  const flat = Object.fromEntries(Object.entries(v as Raw).map(([k, val]) => [k.toUpperCase(), val]));
  // Сгруппированный формат раскладываем в плоские ключи; при смешанном конфиге группы важнее
  return { ...flat, ...flattenGrouped(v as Raw) };
}

/* ───────── Сгруппированный формат ───────── */

/**
 * Конфиг по разделам (см. config.example.json):
 *   { "app": { "name": … }, "contacts": { … }, "legal": { … }, "auth": { …, "telegram": { … } },
 *     "email": { … }, "services": { "vpn": { …, "apps": … }, "proxy": { … }, "actions": { … }, "order": { … } },
 *     "widgets": { "support": { … } }, "push": { … } }
 * Путь в группах → прежний плоский ключ; весь остальной код читает плоские ключи.
 */
const GROUPED_KEYS: Record<string, string> = {
  'app.name': 'APP_NAME',
  'app.description': 'APP_DESCRIPTION',

  'contacts.support_link': 'SUPPORT_LINK',
  'contacts.email': 'CONTACT_EMAIL',
  'contacts.phone': 'CONTACT_PHONE',

  'legal.privacy_policy': 'PRIVACY_POLICY_URL',
  'legal.terms_of_use': 'TERMS_OF_USE_URL',
  'legal.public_offer': 'PUBLIC_OFFER_URL',
  'legal.user_agreement': 'USER_AGREEMENT_URL',
  'legal.return_policy': 'RETURN_POLICY_URL',

  'auth.otp': 'OTP_ENABLE',
  'auth.passkey': 'PASSKEY_ENABLE',
  'auth.passkey_auth_disabled': 'PASSKEY_AUTH_DISABLED',
  'auth.captcha': 'CAPTCHA_ENABLED',
  'auth.telegram.oidc': 'TELEGRAM_OIDC_AUTH_ENABLE',
  'auth.telegram.bot_profile': 'TELEGRAM_BOT_AUTH_PROFILE',
  'auth.telegram.webapp': 'TELEGRAM_WEBAPP_AUTH_ENABLE',
  'auth.telegram.webapp_auto_auth': 'TELEGRAM_WEBAPP_AUTO_AUTH_ENABLE',
  'auth.telegram.webapp_profile': 'TELEGRAM_WEBAPP_PROFILE',
  'auth.telegram.allow_pin': 'ALLOW_TELEGRAM_PIN',

  'email.required': 'EMAIL_REQUIRED',
  'email.verify_required': 'EMAIL_VERIFY_REQUIRED',
  'email.allow_verify': 'ALLOW_EMAIL_VERIFY',

  'services.visible_categories': 'VISIBLE_CATEGORIES',
  'services.vpn.categories': 'VPN_CATEGORY',
  'services.vpn.title': 'VPN_CATEGORY_TITLE',
  'services.vpn.storage_prefix': 'VPN_STORAGE_PREFIX',
  'services.vpn.apps': 'VPN_APPS',
  'services.proxy.categories': 'PROXY_CATEGORY',
  'services.proxy.title': 'PROXY_CATEGORY_TITLE',
  'services.proxy.storage_prefix': 'PROXY_STORAGE_PREFIX',
  'services.proxy.show_sub_link': 'SHOW_PROXY_SUB_LINK',
  'services.proxy.show_qr': 'SHOW_PROXY_QR',
  'services.proxy.happ_cryptolink': 'SHOW_HAPP_CRYPTOLINK',
  'services.proxy.add_button_text': 'DEVICE_CONFIG_TEXT',
  'services.proxy.apps': 'PROXY_APPS',
  'services.actions.block': 'ALLOW_SERVICE_BLOCKED',
  'services.actions.delete': 'ALLOW_SERVICE_DELETE',
  'services.actions.change': 'ALLOW_SERVICE_CHANGE',
  'services.actions.change_force': 'ALLOW_SERVICE_CHANGE_FORCE',
  'services.actions.change_all_categories': 'SERVICE_CHANGE_ALL_CATEGORY',
  'services.order.sorting': 'ORDER_SORTING',
  'services.order.cost_discount': 'ORDER_COST_DISCOUNT',
  'services.order.cost_with_bonuses': 'ORDER_COST_WITH_BONUSES',
  'services.order.block_if_unpaid': 'BLOCK_ORDER_IF_UNPAID',

  'widgets.support.url': 'SUPPORT_WIDGET_URL',
  'widgets.support.api': 'SUPPORT_WIDGET_API',
  'widgets.bitrix_script_url': 'BITRIX_WIDGET_SCRIPT_URL',

  'push.enabled': 'WEB_PUSH_ENABLE',
  'push.vapid_public_key': 'VAPID_PUBLIC_KEY',
};

/** Значение по пути «a.b.c»; имена разделов без учёта регистра. */
function pick(obj: Raw, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split('.')) {
    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) return undefined;
    const entry = Object.entries(cur as Raw).find(([k]) => k.toLowerCase() === part);
    if (!entry) return undefined;
    cur = entry[1];
  }
  return cur;
}

function flattenGrouped(obj: Raw): Raw {
  const out: Raw = {};
  for (const [path, key] of Object.entries(GROUPED_KEYS)) {
    const v = pick(obj, path);
    if (v !== undefined) out[key] = v;
  }
  return out;
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
  /** Как list, но пустые позиции сохраняются — для списков, сопоставляемых по порядку. */
  items: (name: string) => string[];
  /** Значение как есть — для вложенных структур (PROXY_APPS). */
  raw: (name: string) => unknown;
};

function reader(raw: Raw): Reader {
  const get = (name: string) => raw[name];
  const env = (name: string, fallback = '') => {
    const v = get(name);
    return v === undefined || v === null || v === '' ? fallback : String(v);
  };
  return {
    env,
    raw: get,
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
    items: (name) => {
      const v = get(name);
      if (Array.isArray(v)) return v.map((s) => String(s ?? '').trim());
      const str = env(name);
      return str ? str.split(',').map((s) => s.trim()) : [];
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

export type App = {
  /** Ключ приложения в конфиге (happ, incy…) — по нему выбор приложения в карточке услуги. */
  id: string;
  platform: Platform;
  name: string;
  /** Ссылка на скачивание (может быть пустой, если задан только deeplink). */
  url: string;
  /** Префикс deeplink для «Добавить в приложение», например happ://add/ — к нему дописывается ссылка подписки. */
  schema: string;
};

const PLATFORM_ALIASES: Record<string, Platform> = { ios: 'ios', android: 'android', windows: 'windows', macos: 'macos', mac: 'macos', linux: 'linux' };
const isObject = (v: unknown): v is Raw => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Новый формат — один ключ со структурой (объект или JSON-строка):
 *   "PROXY_APPS": {
 *     "ios":   { "happ": { "name": "Happ", "url": "https://…", "deeplink": "happ://add/" }, "incy": { … } },
 *     "macos": { "happ": { … } }
 *   }
 * Порядок приложений в объекте = порядок кнопок. Приложения можно задать и массивом [{ "id": "happ", … }].
 */
function structuredApps(value: unknown): App[] | null {
  let v = value;
  if (typeof v === 'string') {
    if (!v.trim()) return null;
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
  }
  if (!isObject(v)) return null;
  const str = (x: unknown) => (typeof x === 'string' ? x.trim() : '');
  return Object.entries(v).flatMap(([key, list]) => {
    const platform = PLATFORM_ALIASES[key.toLowerCase()];
    if (!platform) return [];
    const entries: [string, unknown][] = Array.isArray(list)
      ? list.map((a, i) => [str(isObject(a) ? a.id : '') || String(i), a])
      : isObject(list)
        ? Object.entries(list)
        : [];
    return entries.flatMap(([id, a]) => {
      if (!isObject(a)) return [];
      const app = {
        id,
        platform,
        name: str(a.name) || id,
        url: str(a.url),
        schema: str(a.deeplink) || str(a.deeplinks) || str(a.schema),
      };
      return app.url || app.schema ? [app] : [];
    });
  });
}

/**
 * Приложения: PROXY_APPS / VPN_APPS, а если их нет — старые плоские ключи
 * (PROXY_APP_IOS_URL, PROXY_IOS_APP_NAME, IOS_PROXY_URL_SCHEMA; несколько значений — через запятую по порядку).
 */
function apps(r: Reader, kind: 'VPN' | 'PROXY'): App[] {
  const structured = structuredApps(r.raw(`${kind}_APPS`));
  if (structured) return kind === 'VPN' ? structured.map((a) => ({ ...a, schema: '' })) : structured;

  return (Object.keys(PLATFORM_ENV) as Platform[]).flatMap((platform) => {
    const p = PLATFORM_ENV[platform];
    const urls = r.items(`${kind}_APP_${p}_URL`);
    const names = r.items(`${kind}_${p}_APP_NAME`);
    const schemas = kind === 'PROXY' ? r.items(`${p}_PROXY_URL_SCHEMA`) : [];
    return Array.from({ length: Math.max(urls.length, schemas.length) }, (_, i) => ({
      id: (names[i] || String(i)).toLowerCase(),
      platform,
      name: names[i] ?? '',
      url: urls[i] ?? '',
      schema: schemas[i] ?? '',
    })).filter((a) => a.url || a.schema);
  });
}

/** Всё, что безопасно отдавать в браузер. */
function buildPublicConfig(r: Reader) {
  const { env, flag, list } = r;
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
      vpnApps: apps(r, 'VPN'),
      proxyApps: apps(r, 'PROXY'),
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
