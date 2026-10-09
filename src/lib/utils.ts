import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Только внутренний путь — защита от открытого редиректа через ?next=. */
export function safeNext(value: unknown, fallback = '/services') {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : fallback;
}

export function formatMoney(value: number | string) {
  const n = Number(value) || 0;
  return `${n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`;
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value.replace(' ', 'T'));
  return isNaN(d.getTime()) ? value : d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Период SHM: 1.0203 → 1 месяц 2 дня 3 часа. */
export function formatPeriod(value: number) {
  if (!value) return '—';
  const [m, rest = ''] = value.toString().split('.');
  const months = Number(m);
  const days = Number(rest.slice(0, 2) || 0);
  const hours = Number(rest.slice(2, 4) || 0);
  const parts: string[] = [];
  if (months) {
    if (months % 12 === 0 && !days && !hours) parts.push(plural(months / 12, 'год', 'года', 'лет'));
    else parts.push(plural(months, 'месяц', 'месяца', 'месяцев'));
  }
  if (days) parts.push(plural(days, 'день', 'дня', 'дней'));
  if (hours) parts.push(plural(hours, 'час', 'часа', 'часов'));
  return parts.join(' ');
}

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  const word = m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? few : many;
  return `${n} ${word}`;
}
