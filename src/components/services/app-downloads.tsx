'use client';

import { useClientValue } from '@/lib/hooks';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { IconChevronDown, IconDownload } from '@tabler/icons-react';
import type { App, Platform } from '@/lib/config';
import { openLink } from '@/lib/api';
import { PLATFORM_ICONS } from '@/components/brand/icons';
import { Button } from '@/components/ui/button';

export function detectPlatform(): Platform | '' {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Windows NT/i.test(ua)) return 'windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macos';
  if (/Linux/i.test(ua)) return 'linux';
  return '';
}

/** Кнопки приложений текущей платформы (их может быть несколько) + меню остальных. */
export function AppDownloads({ apps: all }: { apps: App[] }) {
  const platform = useClientValue(detectPlatform, '');
  const apps = all.filter((a) => a.url);
  if (!apps.length) return null;

  const current = apps.filter((a) => a.platform === platform);
  const primary = current.length ? current : apps.filter((a) => a.platform === apps[0].platform);
  const others = apps.filter((a) => !primary.includes(a));

  return (
    <div className="flex flex-wrap gap-2">
      {primary.map((a, i) => {
        const Icon = PLATFORM_ICONS[a.platform].icon;
        return (
          <Button key={i} variant={i === 0 ? undefined : 'ghost'} onClick={() => openLink(a.url)}>
            <Icon className="size-5" /> {a.name ? `Скачать ${a.name}` : `Скачать для ${PLATFORM_ICONS[a.platform].label}`}
            <IconDownload className="size-4 opacity-70" />
          </Button>
        );
      })}
      {others.length > 0 && (
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button variant="ghost" size="icon" aria-label="Другие платформы">
              <IconChevronDown className="size-5" />
            </Button>
          </Menu.Trigger>
          <Menu.Portal>
            {/* Сплошной фон: .glass полупрозрачный и поверх модалки сливается с её содержимым */}
            <Menu.Content align="end" sideOffset={6} className="border-line shadow-card z-[60] min-w-52 rounded-2xl border bg-[#0a1410] p-1.5">
              <Menu.Label className="text-muted px-3 py-1.5 text-xs">Другие платформы</Menu.Label>
              {others.map((a, i) => {
                const I = PLATFORM_ICONS[a.platform].icon;
                return (
                  <Menu.Item
                    key={`${a.platform}:${i}`}
                    onSelect={() => openLink(a.url)}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none data-[highlighted]:bg-white/5"
                  >
                    <I className="text-muted size-5" /> {PLATFORM_ICONS[a.platform].label}
                    <span className="text-muted ml-auto text-xs">{a.name || 'Скачать'}</span>
                  </Menu.Item>
                );
              })}
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      )}
    </div>
  );
}
