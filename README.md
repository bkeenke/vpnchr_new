# VPNCHR — сайт и личный кабинет

Next.js 16 (App Router, SSR) + Tailwind CSS 4. Клиент для [SHM](https://github.com/danuk/shm): те же возможности, что у `shm-client-2`, в дизайне VPNCHR.

## Возможности

- **Главная** по макету: hero, преимущества, «Работает с», шаги подключения, тарифы из публичного прайса SHM (`/shm/v1/public/price_list`).
- **Вход**: логин/пароль, 2FA (TOTP), регистрация с капчей и согласием с документами, сброс пароля по ссылке, Passkey, Telegram (OIDC, WebApp с автовходом), реферальные ссылки `?partner_id=`.
- **Услуги**: список по категориям, подключение (ссылка подписки, QR, «Добавить в приложение» по URL-схеме, Happ cryptolink, конфиг WireGuard), заказ с пополнением, смена тарифа, остановка, удаление, оплата неоплаченных, автообновление статусов.
- **Профиль**: баланс, пополнение, автоплатежи, промокод, прогноз оплаты, личные данные, email с подтверждением, партнёрская ссылка, привязка Telegram, безопасность (пароль, 2FA с резервными кодами, Passkey, отключение входа по паролю).
- **Платежи и списания**: серверная пагинация и сортировка (состояние в URL).
- PWA-манифест, виджеты поддержки (Bitrix24, свой), режим Telegram WebApp.

## Архитектура

```text
Браузер ──► Next.js (SSR) ──► SHM API
             │
             ├─ серверные компоненты читают SHM напрямую (lib/shm.ts)
             ├─ /api/* — прокси для действий из браузера (app/api/[...path]/route.ts → lib/shm-proxy.ts),
             │          отдаёт из ответа только data и items, без id сессии
             └─ /shm/* — только адреса возврата OAuth/OIDC (Telegram), остальное 404
```

- Сессия хранится в **httpOnly-cookie** `session_id` — JavaScript страницы не видит токен. Прокси сам сохраняет сессию из ответов авторизации и подставляет её в запросы к SHM.
- Прокси отклоняет межсайтовые запросы (`Sec-Fetch-Site: cross-site`) — защита от CSRF для GET-эндпоинтов SHM (оплата с баланса, промокоды).
- Настройки кабинета хранятся **в SHM** — см. раздел «Конфигурация». Браузер их не запрашивает: получает только готовый публичный конфиг внутри страницы.
- `src/proxy.ts` (бывший middleware) сохраняет `?partner_id` / `?session_id` в cookie и не пускает в кабинет без сессии.

```text
src/
  app/                 страницы: / , /login, (cabinet)/services|profile|payments|withdrawals
  components/
    ui/                кнопки, поля, модалки, бейджи
    brand/             логотип, щит, иконки
    site/              шапка, подвал, телефоны на главной
    auth/ services/ profile/ cabinet/
  lib/                 config (env), shm (сервер), api (браузер), payments, services, utils
```

## Конфигурация

В env всего два обязательных параметра ([.env.example](.env.example)):

```bash
SHM_URL=https://api.vpnchr.com
CONFIG_KEY=remna
```

Сервер Next.js запрашивает `{SHM_URL}/shm/v1/public/get_config?key={CONFIG_KEY}`, кэширует ответ на `CONFIG_TTL` секунд (по умолчанию 60) и обновляет его в фоне. Если SHM недоступен, работает последний удачный конфиг, а до первой загрузки — значения по умолчанию.

Значение ключа в SHM — JSON, разбитый на разделы. Полный пример со всеми ключами и значениями по умолчанию — [config.example.json](config.example.json):

| Раздел | Что внутри |
|---|---|
| `app` | `name`, `description` — название и описание кабинета |
| `contacts` | `support_link` (пункт «Поддержка» в меню), `email`, `phone` |
| `legal` | ссылки на документы: `privacy_policy`, `terms_of_use`, `public_offer`, `user_agreement`, `return_policy` |
| `auth` | `otp`, `passkey`, `passkey_auth_disabled`, `captcha`; `telegram`: `oidc`, `bot_profile`, `webapp`, `webapp_auto_auth`, `webapp_profile`, `allow_pin` |
| `email` | `required`, `verify_required`, `allow_verify` |
| `services` | `visible_categories`; `vpn` и `proxy`: `categories`, `title`, `storage_prefix`, `apps`; у `proxy` ещё `show_sub_link`, `show_qr`, `happ_cryptolink`, `add_button_text`; `actions`: `block`, `delete`, `change`, `change_force`, `change_all_categories`; `order`: `sorting`, `cost_discount`, `cost_with_bonuses`, `block_if_unpaid` |
| `widgets` | `support`: `url`, `api`; `bitrix_script_url` |
| `push` | `enabled`, `vapid_public_key` |

Регистр имён не важен, флаги — `true`/`false` или строки `"true"`/`"false"`, списки — массив или строка через запятую. Изменения в SHM применяются без перезапуска, в пределах `CONFIG_TTL`. Старый плоский формат (`APP_NAME`, `PROXY_CATEGORY`… как в `shm-client-2`) тоже читается; если заданы оба, значения из разделов важнее.

**Приложения** — `services.proxy.apps` (подписка) и `services.vpn.apps` (WireGuard): платформа → приложение → `name`, `url` (скачать), `deeplink` (префикс, к которому дописывается ссылка подписки; только у `proxy`). Платформы: `ios`, `android`, `windows`, `macos` (или `mac`), `linux`. Порядок приложений = порядок кнопок; если на платформе их несколько, в карточке услуги появится выбор приложения.

```json
"apps": {
  "ios": {
    "happ": { "name": "Happ", "url": "https://apps.apple.com/…/id6504287215", "deeplink": "happ://add/" },
    "incy": { "name": "Incy", "url": "https://apps.apple.com/…/id6756943388", "deeplink": "incy://add/" }
  },
  "macos": {
    "happ": { "name": "Happ", "url": "https://apps.apple.com/…/id6504287215", "deeplink": "happ://add/" }
  }
}
```

Без `url` будет только кнопка «Добавить в …», без `deeplink` — только «Скачать …». `add_button_text` заменяет текст кнопки, только когда приложение одно.

Прокси кабинета не пропускает `/api/public/get_config` из браузера. Сам эндпоинт SHM публичный, поэтому **не храните в этом конфиге секреты**.

## Тарифы на главной

Берутся из `{SHM_URL}/shm/v1/public/price_list` на сервере и кэшируются так же, как конфиг (`CONFIG_TTL`). В карточке показываются `name`, `cost` (или `real_cost`, если он меньше — тогда старая цена зачёркнута), период и цена за месяц, строки из `descr` списком. Тариф с `is_popular: 1` подсвечивается как «Выгодно». Кнопка «Выбрать» ведёт в заказ, и этот тариф в окне заказа открывается сразу, в том числе после регистрации. Если прайс недоступен, блок тарифов скрывается.

## Запуск

```bash
cp .env.example .env      # SHM_URL и CONFIG_KEY
npm install
npm run dev               # http://localhost:3000
```

Без SHM — встроенный мок (логин `demo` / `demo123`):

```bash
node scripts/mock-shm.mjs &                      # :8081
SHM_URL=http://127.0.0.1:8081 CONFIG_KEY=remna npm run dev
```

## Тестовое окружение в Docker (как в shm-client-2)

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

Открыть **http://localhost:3002**. Внутри два контейнера:

- `web` — `next dev`, папки `src/`, `public/`, `scripts/` подключены томами: правки применяются на лету, без пересборки;
- `nginx` — точка входа на порту 3002. Проксирует всё в Next (с WebSocket для горячей перезагрузки), закрывает `/api/admin` и `/shm/v1/admin`, отдаёт `/healthcheck`.

Кабинет работает с **боевым SHM** (`SHM_URL=https://api.vpnchr.com` в `docker-compose.dev.yml`), конфиг и прайс кэшируются всего на 10 секунд. К SHM обращается сервер Next, а не nginx: маршрут `/api/*` в Next хранит сессию в httpOnly-cookie и защищает от CSRF.

После изменения `package.json` или `next.config.ts` пересоберите: `docker compose -f docker-compose.dev.yml up -d --build`. Логи — `docker compose -f docker-compose.dev.yml logs -f web`.

Если Docker Hub недоступен, можно подставить уже скачанный образ с Node ≥ 20.9:
`NODE_IMAGE=<образ> docker compose -f docker-compose.dev.yml up -d --build`.

## Docker (продакшн)

```bash
docker compose up -d --build     # берёт переменные из .env, порт 3000
```

Поставьте перед контейнером HTTPS-прокси (nginx, Caddy, Traefik). Для доступа по голому HTTP задайте `COOKIE_SECURE=false`.

## Важно при настройке SHM

- **Passkey**: `rpId` в SHM должен совпадать с доменом кабинета.
- **Платёжные системы**: ссылки `shm_url` вида `https://…/shm/v1/…` автоматически переводятся на `/api/…` прокси кабинета, чтобы запрос ушёл с сессией.
- **Telegram OIDC**: `return_url` — адрес кабинета; после входа SHM возвращает `?session_id=…`, кабинет сохраняет его в httpOnly-cookie.

## Картинки

`public/images/hero-mobile.webp` и `section-dark.webp` — временные, вырезаны из макета заказчика. Замените чистыми исходниками без текста (фон с флагом, горами и Грозным; тёмные горы) — разметка менять не нужно.

## Скрипты

| Команда | Что делает |
| --- | --- |
| `npm run dev` | разработка |
| `npm run build && npm start` | продакшн-сборка |
| `npm run lint` | ESLint |
| `npx prettier --write src` | форматирование |
