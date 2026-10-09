'use client';

import { toast } from './toast';

/**
 * Копирование в буфер. navigator.clipboard есть только в защищённом контексте (HTTPS, localhost),
 * поэтому по http:// с IP — запасной путь через скрытый textarea и execCommand('copy').
 * Возвращает true, если текст скопирован.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* пробуем запасной путь */
  }
  // Внутри модального окна фокус заперт в нём — textarea кладём туда же, иначе выделение не сработает
  const host = document.activeElement?.closest('[role="dialog"]') ?? document.body;
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  host.appendChild(ta);
  const focused = document.activeElement as HTMLElement | null;
  ta.select();
  ta.setSelectionRange(0, text.length); // iOS
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  focused?.focus?.();
  return ok;
}

/** copyText с сообщением об ошибке; true — скопировано. */
export async function copyOrToast(text: string) {
  const ok = await copyText(text);
  if (!ok) toast.error('Не удалось скопировать — выделите и скопируйте вручную');
  return ok;
}
