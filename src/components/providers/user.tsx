'use client';

import { createContext, useContext } from 'react';
import type { User } from '@/lib/types';

type Value = { user: User; email: { email: string; email_verified: number } | null };
const Ctx = createContext<Value | null>(null);

export function UserProvider({ user, email, children }: Value & { children: React.ReactNode }) {
  return <Ctx.Provider value={{ user, email }}>{children}</Ctx.Provider>;
}

export function useUser() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUser outside UserProvider');
  return v;
}
