'use client';

import { createContext, useContext } from 'react';

import type { UserSession } from '@/lib/types';

const SessionContext = createContext<UserSession | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: UserSession;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
