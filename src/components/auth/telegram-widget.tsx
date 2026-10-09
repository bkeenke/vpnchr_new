'use client';

import { useEffect, useEffectEvent, useRef } from 'react';
import type { TelegramUser } from '@/lib/telegram';

/** Официальный Telegram Login Widget. */
export function TelegramWidget({ botName, onAuth }: { botName: string; onAuth: (u: TelegramUser) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const handleAuth = useEffectEvent((u: TelegramUser) => onAuth(u));

  useEffect(() => {
    if (!ref.current) return;
    const name = `__tgAuth_${Math.random().toString(36).slice(2)}`;
    (window as unknown as Record<string, unknown>)[name] = (u: TelegramUser) => handleAuth(u);
    const s = document.createElement('script');
    s.src = 'https://telegram.org/js/telegram-widget.js?22';
    s.async = true;
    s.setAttribute('data-telegram-login', botName);
    s.setAttribute('data-size', 'large');
    s.setAttribute('data-radius', '12');
    s.setAttribute('data-request-access', 'write');
    s.setAttribute('data-onauth', `${name}(user)`);
    ref.current.innerHTML = '';
    ref.current.appendChild(s);
    return () => {
      delete (window as unknown as Record<string, unknown>)[name];
    };
  }, [botName]);

  return <div ref={ref} className="flex min-h-10 justify-center" />;
}
