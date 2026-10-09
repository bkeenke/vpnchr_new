'use client';

import { createContext, useContext } from 'react';
import type { PublicConfig } from '@/lib/config';

const Ctx = createContext<PublicConfig | null>(null);

export function ConfigProvider({ value, children }: { value: PublicConfig; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConfig() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useConfig outside ConfigProvider');
  return v;
}
