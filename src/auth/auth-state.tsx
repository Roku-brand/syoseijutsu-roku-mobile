import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { supabase, supabaseConfigured } from '@/lib/supabase';

export type AccountRole = 'user' | 'owner';
export type AuthResult = { error: string | null; hasSession: boolean };

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: AccountRole;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(supabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AccountRole>('user');

  const refreshRole = useCallback(async () => {
    const userId = session?.user.id;
    if (!supabase || !userId) {
      setRole('user');
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    setRole(data?.role === 'owner' ? 'owner' : 'user');
  }, [session?.user.id]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    }).catch(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    void refreshRole().catch(() => setRole('user'));
  }, [refreshRole]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabaseが未設定です。', hasSession: false };
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error: error?.message ?? null, hasSession: Boolean(data.session) };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabaseが未設定です。', hasSession: false };
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    return { error: error?.message ?? null, hasSession: Boolean(data.session) };
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setRole('user');
  }, []);

  const value = useMemo(() => ({
    configured: supabaseConfigured,
    loading,
    session,
    user: session?.user ?? null,
    role,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshRole,
  }), [loading, refreshRole, role, session, signInWithEmail, signOut, signUpWithEmail]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
