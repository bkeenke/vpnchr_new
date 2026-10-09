import { cn } from '@/lib/utils';

const tones = {
  green: 'bg-green/12 text-green border-green/30',
  red: 'bg-danger/12 text-danger border-danger/30',
  yellow: 'bg-warning/12 text-warning border-warning/30',
  blue: 'bg-info/12 text-info border-info/30',
  gray: 'bg-white/5 text-muted border-line',
} as const;

export type Tone = keyof typeof tones;

export function Badge({ tone = 'gray', className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)} {...props} />;
}

export const STATUS: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Активна', tone: 'green' },
  'NOT PAID': { label: 'Не оплачена', tone: 'blue' },
  BLOCK: { label: 'Заблокирована', tone: 'red' },
  PROGRESS: { label: 'В обработке', tone: 'yellow' },
  ERROR: { label: 'Ошибка', tone: 'red' },
  INIT: { label: 'Создаётся', tone: 'gray' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, tone: 'gray' as Tone };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
