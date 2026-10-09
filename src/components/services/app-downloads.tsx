'use client';

import { useClientValue } from '@/lib/hooks';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { IconChevronDown, IconDownload } from '@tabler/icons-react';
import type { Platform } from '@/lib/config';
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

type App = { platform: Platform; url: string; name: string };

/** Кнопка приложения для текущей платформы + меню остальных. */
export function AppDownloads({ apps }: { apps: App[] }) {
  const platform = useClientValue(detectPlatform, '');
  if (!apps.length) return null;

  const primary = apps.find((a) => a.platform === platform) ?? apps[0];
  const others = apps.filter((a) => a !== primary);
  const Icon = PLATFORM_ICONS[primary.platform].icon;

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => openLink(primary.url)}>
        <Icon className="size-5" /> {primary.name || `Скачать для ${PLATFORM_ICONS[primary.platform].label}`}
        <IconDownload className="size-4 opacity-70" />
      </Button>
      {others.length > 0 && (
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button variant="ghost" size="icon" aria-label="Другие платформы">
              <IconChevronDown className="size-5" />
            </Button>
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content align="end" sideOffset={6} className="glass shadow-card z-[60] min-w-52 rounded-2xl bg-[#07100c]/95 p-1.5">
              <Menu.Label className="text-muted px-3 py-1.5 text-xs">Другие платформы</Menu.Label>
              {others.map((a) => {
                const I = PLATFORM_ICONS[a.platform].icon;
                return (
                  <Menu.Item
                    key={a.platform}
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
