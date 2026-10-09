'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getTelegramWebApp } from '@/lib/telegram';

/** Внутри Telegram WebApp: раскрыть окно, цвета, кнопка «Назад». */
export function TelegramWebAppBridge() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg) return;
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.('#050807');
    tg.setBackgroundColor?.('#050807');
  }, []);

  useEffect(() => {
    const back = getTelegramWebApp()?.BackButton;
    if (!back) return;
    const onBack = () => router.push('/services');
    if (pathname === '/services') back.hide();
    else {
      back.show();
      back.onClick(onBack);
    }
    return () => back.offClick(onBack);
  }, [pathname, router]);

  return null;
}
