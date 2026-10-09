'use client';

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { user?: { id: number; photo_url?: string; language_code?: string } };
  ready(): void;
  expand(): void;
  openLink(url: string): void;
  openTelegramLink(url: string): void;
  setHeaderColor?(c: string): void;
  setBackgroundColor?(c: string): void;
  BackButton?: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
  return tg && (tg.initData || tg.initDataUnsafe?.user?.id) ? tg : null;
}
