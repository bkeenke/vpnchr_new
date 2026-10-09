'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { IconServer, IconUser, IconCreditCard, IconReceipt, IconLogout, IconHeadset, IconPlus } from '@tabler/icons-react';
import { Wordmark } from '@/components/brand/logo';
import { useUser } from '@/components/providers/user';
import { useConfig } from '@/components/providers/config';
import { openLink } from '@/lib/api';
import { cn, formatMoney } from '@/lib/utils';
import { PayModal } from './pay-modal';

export const NAV = [
  { href: '/services', label: 'Услуги', icon: IconServer },
  { href: '/profile', label: 'Профиль', icon: IconUser },
  { href: '/payments', label: 'Платежи', icon: IconCreditCard },
  { href: '/withdrawals', label: 'Списания', icon: IconReceipt },
];

export function CabinetHeader() {
  const { user } = useUser();
  const { supportLink } = useConfig();
  const pathname = usePathname();
  const [payOpen, setPayOpen] = useState(false);

  return (
    <header className="border-line bg-bg/75 fixed inset-x-0 top-0 z-40 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:h-20 lg:px-10">
        <Link href="/" aria-label="На главную">
          <Wordmark className="text-2xl" />
        </Link>

        <nav className="ml-10 hidden items-center gap-1 lg:flex" aria-label="Кабинет">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                pathname.startsWith(href) ? 'neon-ring bg-green/10 text-text' : 'hover:text-text text-white/75',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPayOpen(true)}
            className="glass hover:border-line-green flex items-center gap-2 rounded-full py-1.5 pr-1.5 pl-4 text-sm font-semibold transition"
            aria-label="Пополнить баланс"
          >
            <span className="tabular-nums">{formatMoney(user.balance)}</span>
            <span className="bg-green grid size-7 place-items-center rounded-full text-[#03140c]">
              <IconPlus className="size-4" stroke={2.6} />
            </span>
          </button>
          {supportLink && (
            <button
              type="button"
              onClick={() => openLink(supportLink)}
              className="text-muted hover:text-text rounded-full p-2.5 transition hover:bg-white/5"
              aria-label="Поддержка"
            >
              <IconHeadset className="size-5" />
            </button>
          )}
          <form action="/logout" method="post">
            <button type="submit" className="text-muted hover:text-danger rounded-full p-2.5 transition hover:bg-white/5" aria-label="Выйти">
              <IconLogout className="size-5" />
            </button>
          </form>
        </div>
      </div>
      <PayModal open={payOpen} onOpenChange={setPayOpen} />
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="border-line bg-bg/90 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      aria-label="Кабинет"
    >
      <div className="grid grid-cols-4">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium', active ? 'text-green' : 'text-muted')}
            >
              <Icon className={cn('size-6', active && 'drop-shadow-[0_0_8px_rgba(34,229,140,.7)]')} stroke={1.7} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
