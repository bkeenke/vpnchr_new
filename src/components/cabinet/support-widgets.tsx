'use client';

import Script from 'next/script';
import { useState } from 'react';
import { useConfig } from '@/components/providers/config';
import { useUser } from '@/components/providers/user';

/** Виджеты поддержки (Bitrix24 и собственный) — только для вошедших пользователей. */
export function SupportWidgets() {
  const { widgets } = useConfig();
  const { user } = useUser();
  // Bitrix кэширует скрипт — добавляем метку минуты, как в оригинальном клиенте
  const [stamp] = useState(() => Math.floor(Date.now() / 60000));
  return (
    <>
      {widgets.supportWidgetUrl && (
        <Script
          id="__support_widget__"
          src={widgets.supportWidgetUrl}
          strategy="afterInteractive"
          // Корень API без /widget — виджет сам дописывает /widget/session; пусто — берёт адрес скрипта
          data-api={widgets.supportWidgetApi.replace(/\/+$/, '') || undefined}
          data-user-id={String(user.user_id)}
          data-color-primary="#22e58c"
          data-lang="ru"
        />
      )}
      {widgets.bitrixScriptUrl && <Script id="__bitrix_widget__" src={`${widgets.bitrixScriptUrl}?${stamp}`} strategy="lazyOnload" />}
    </>
  );
}
