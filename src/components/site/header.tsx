'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { IconArrowRight, IconMenu2, IconX } from '@tabler/icons-react';
import { Wordmark } from '@/components/brand/logo';
import { buttonVariants } from '@/components/ui/button';
import { useConfig } from '@/components/providers/config';
import { cn } from '@/lib/utils';

export function SiteHeader({ authenticated }: { authenticated: boolean }) {
  const { supportLink } = useConfig();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const nav = [
    { href: '/#features', label: 'Возможности' },
    { href: '/#plans', label: 'Тарифы' },
    { href: '/#how', label: 'Как подключить' },
    ...(supportLink ? [{ href: supportLink, label: 'Поддержка', external: true }] : []),
  ];
  const cta = authenticated ? { href: '/services', label: 'Кабинет' } : { href: '/login', label: 'Подключиться' };

  return (
    <header className={cn('fixed inset-x-0 top-0 z-40 transition-all duration-300', scrolled || open ? 'bg-bg/80 py-3 backdrop-blur-xl' : 'py-5')}>
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-10">
        <Link href="/" className="shrink-0" aria-label="На главную">
          <Wordmark className="text-2xl sm:text-[28px]" />
        </Link>

        <nav className="ml-auto hidden items-center gap-9 text-sm font-medium lg:flex" aria-label="Основная навигация">
          {nav.map((i) =>
            i.external ? (
              <a key={i.href} href={i.href} target="_blank" rel="noreferrer" className="hover:text-green text-white/85 transition">
                {i.label}
              </a>
            ) : (
              <Link key={i.href} href={i.href} className="hover:text-green text-white/85 transition">
                {i.label}
              </Link>
            ),
          )}
        </nav>

        <Link href={cta.href} className={cn(buttonVariants({ size: 'md' }), 'ml-auto hidden rounded-2xl sm:inline-flex lg:ml-8')}>
          {cta.label} <IconArrowRight className="size-5" />
        </Link>

        <button
          type="button"
          className="-mr-2 ml-auto p-2 text-white sm:ml-2 lg:hidden"
          aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <IconX className="size-7" /> : <IconMenu2 className="size-7" />}
        </button>
      </div>

      {open && (
        <div className="bg-bg/95 fixed inset-x-0 top-[64px] bottom-0 px-6 pt-6 backdrop-blur-xl lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Мобильная навигация">
            {nav.map((i) => (
              <a
                key={i.href}
                href={i.href}
                onClick={() => setOpen(false)}
                {...(i.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                className="border-line font-display border-b py-4 text-lg uppercase"
              >
                {i.label}
              </a>
            ))}
          </nav>
          <Link href={cta.href} onClick={() => setOpen(false)} className={cn(buttonVariants({ size: 'lg', block: true }), 'mt-8')}>
            {cta.label} <IconArrowRight className="size-5" />
          </Link>
        </div>
      )}
    </header>
  );
}
