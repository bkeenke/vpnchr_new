import {
  IconBolt,
  IconShieldCheck,
  IconWorld,
  IconInfinity,
  IconBrandApple,
  IconBrandAndroid,
  IconBrandWindows,
  IconBrandFinder,
  IconBrandUbuntu,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export const FEATURES = [
  { icon: IconBolt, label: ['Высокая', 'скорость'] },
  { icon: IconShieldCheck, label: ['Надёжное', 'соединение'] },
  { icon: IconWorld, label: ['Доступ', 'ко всем сервисам'] },
  { icon: IconInfinity, label: ['Без', 'ограничений'] },
];

export const PLATFORM_ICONS = {
  ios: { icon: IconBrandApple, label: 'iOS' },
  android: { icon: IconBrandAndroid, label: 'Android' },
  windows: { icon: IconBrandWindows, label: 'Windows' },
  macos: { icon: IconBrandFinder, label: 'macOS' },
  linux: { icon: IconBrandUbuntu, label: 'Linux' },
} as const;

/** Иконка в неоновом круге, как в блоке преимуществ макета. */
export function NeonCircle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('neon-ring inline-grid size-14 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm sm:size-16', className)}>
      {children}
    </span>
  );
}
