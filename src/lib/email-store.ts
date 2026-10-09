'use client';

import { create } from 'zustand';

/** Глобальные модалки email: привязка и подтверждение кодом. */
export const useEmailModals = create<{
  emailOpen: boolean;
  /** Адрес, который подтверждаем; null — модалка закрыта, '' — текущий email пользователя. */
  verifyEmail: string | null;
  openEmail: () => void;
  openVerify: (email?: string) => void;
  close: () => void;
}>((set) => ({
  emailOpen: false,
  verifyEmail: null,
  openEmail: () => set({ emailOpen: true, verifyEmail: null }),
  openVerify: (email = '') => set({ verifyEmail: email, emailOpen: false }),
  close: () => set({ emailOpen: false, verifyEmail: null }),
}));
