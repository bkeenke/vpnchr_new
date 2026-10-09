/** Перевод сообщений SHM (поля error/msg) на русский. Тексты — из lib/Core SHM. */

const EXACT: Record<string, string> = {
  // Вход и регистрация
  'Incorrect login or password': 'Неверный логин или пароль',
  'Password authentication is disabled.': 'Вход по паролю отключён. Используйте Passkey или Telegram',
  'Login from this IP is prohibited': 'Вход с этого IP-адреса запрещён',
  'User is blocked': 'Пользователь заблокирован',
  'User not found': 'Пользователь не найден',
  'Login already in use': 'Этот логин уже занят',
  'Email already in use': 'Этот email уже занят',
  'Login is short or incorrect': 'Логин слишком короткий или некорректный',
  'Login is required': 'Укажите логин',
  'Login is empty': 'Укажите логин',
  'Login not found': 'Логин не найден',
  'Account not found': 'Аккаунт не найден',
  'Incorrect login format (is not email)': 'Логин должен быть email-адресом',
  'Incorrect login format (is not phone)': 'Логин должен быть номером телефона',
  'Registration of new users is prohibited': 'Регистрация новых пользователей закрыта',
  'Invalid captcha': 'Неверный ответ на капчу',
  'Captcha required': 'Введите ответ на капчу',
  'Not authorized': 'Требуется вход',
  'no auth': 'Требуется вход',
  '429 Too Many Requests': 'Слишком много попыток. Попробуйте позже',
  'Permission denied': 'Доступ запрещён',

  // Пароль
  'Password is empty': 'Введите пароль',
  'Password is short': 'Пароль слишком короткий',
  OLD_PASSWORD_REQUIRED: 'Введите текущий пароль',
  INVALID_OLD_PASSWORD: 'Неверный текущий пароль',
  'Token is required': 'Ссылка для сброса пароля недействительна',
  'Invalid token': 'Ссылка для сброса пароля недействительна',
  INVALID_TOKEN: 'Ссылка недействительна',
  TOKEN_REQUIRED: 'Ссылка недействительна',
  'Token expired': 'Срок действия ссылки истёк',
  'Password reset failed': 'Не удалось сбросить пароль',
  'Password reset successful': 'Пароль изменён',

  // Email
  'already in use': 'Этот email уже используется',
  'is not email': 'Некорректный email',
  'Incorrect email address': 'Некорректный email',
  'email not found': 'Email не найден',
  'Email not found': 'Email не найден',
  'Code for email is not set': 'Сначала запросите код подтверждения',
  'Invalid code': 'Неверный код',
  'Code expired': 'Срок действия кода истёк. Запросите новый',
  'Verification code sent': 'Код отправлен',
  'Email verified successfully': 'Email подтверждён',

  // 2FA и Passkey
  INVALID_OTP_TOKEN: 'Неверный код подтверждения',
  OTP_NOT_ENABLED: 'Двухфакторная защита не включена',
  OTP_NOT_SETUP: 'Сначала начните настройку 2FA',
  OTP_ALREADY_ENABLED: 'Двухфакторная защита уже включена',
  PASSKEY_REQUIRED: 'Сначала добавьте Passkey',
  CREDENTIAL_NOT_FOUND: 'Ключ не найден',
  UNKNOWN_CREDENTIAL: 'Ключ не найден',
  INVALID_CHALLENGE: 'Сеанс проверки истёк. Попробуйте ещё раз',
  INVALID_SIGNATURE: 'Не удалось проверить ключ',
  INVALID_PASSKEY_RESPONSE: 'Не удалось проверить ключ',
  INVALID_ATTESTATION_OBJECT: 'Не удалось проверить ключ',
  USER_NOT_FOUND: 'Пользователь не найден',

  // Telegram
  'Telegram auth data too old': 'Данные входа через Telegram устарели. Попробуйте ещё раз',
  'A valid session is required to bind a Telegram account': 'Войдите в кабинет, чтобы привязать Telegram',
  'A valid session is required to bind an account': 'Войдите в кабинет, чтобы привязать аккаунт',
  'Successfully bound to Telegram': 'Telegram привязан',
  'Invalid redirect URL': 'Некорректный адрес возврата',

  // Услуги и оплата
  'Not enough money': 'Недостаточно средств на балансе',
  'Service not exists': 'Тариф не найден',
  'User service not exists': 'Услуга не найдена',
  'The service is prohibited for registration': 'Этот тариф недоступен для заказа',
  'Switching to a free service is not allowed': 'Переход на бесплатный тариф недоступен',
  'The next service must not be free': 'Следующий тариф не может быть бесплатным',
  'The service is locked. Try again later.': 'Услуга сейчас обрабатывается. Попробуйте позже',
  'Object not found. Check the ID.': 'Не найдено',

  Successful: 'Готово',
};

const PATTERNS: [RegExp, string][] = [
  [/^promo code `.*` not found$/, 'Промокод не найден'],
  [/^promo code `.*` is inactive$/, 'Промокод неактивен'],
  [/^promo code `.*` has expired$/, 'Срок действия промокода истёк'],
  [/^promo code `.*` has no remaining uses$/, 'Промокод больше нельзя использовать'],
  [/^promo code `.*` has already been used( by this user)?$/, 'Промокод уже использован'],
  [/^Service not exists/, 'Тариф не найден'],
  [/^Telegram (WebApp |OIDC )?auth/i, 'Не удалось войти через Telegram'],
  [/^Telegram OIDC/, 'Не удалось войти через Telegram'],
  [/^OAuth2 /, 'Не удалось войти через внешний сервис'],
  [/^`.+` not present$/, 'Не хватает данных в запросе'],
];

const hasCyrillic = (s: string) => /[а-яё]/i.test(s);

/**
 * Русский текст для сообщения SHM. Неизвестное английское сообщение заменяется на fallback,
 * русское (например, из шаблонов SHM) показывается как есть.
 */
export function shmMessage(message: unknown, fallback = 'Что-то пошло не так. Попробуйте ещё раз'): string {
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text) return fallback;
  if (EXACT[text]) return EXACT[text];
  for (const [re, ru] of PATTERNS) if (re.test(text)) return ru;
  return hasCyrillic(text) ? text : fallback;
}
