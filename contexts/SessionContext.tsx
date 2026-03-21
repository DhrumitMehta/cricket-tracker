import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthError, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type SessionContextValue = {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<{ error: AuthError | null }>;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    console.log('[CricketOS][SessionContext] signOut: calling supabase.auth.signOut()');
    const { error } = await supabase.auth.signOut();
    console.log('[CricketOS][SessionContext] signOut: result', { error: error?.message ?? null });
    if (!error) {
      setSession(null);
      console.log('[CricketOS][SessionContext] signOut: session cleared in context');
    }
    return { error };
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      signOut,
    }),
    [session, loading, signOut]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return ctx;
}
