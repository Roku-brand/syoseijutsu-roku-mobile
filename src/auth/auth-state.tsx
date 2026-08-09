import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { clearSecureContentCache, purgeSecureContent } from '@/lib/secure-content';

export type AccountRole = 'user' | 'owner';
export type AuthResult = { error: string | null; hasSession: boolean; session: Session | null };
export type SignUpOptions = { emailRedirectTo?: string };

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: AccountRole;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string, options?: SignUpOptions) => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_TIMEOUT_MS = 2_500;

function settleWithin<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), timeoutMs);
    promise.then((value) => {
      clearTimeout(timeout);
      resolve(value);
    }).catch(() => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}

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
    const result = await settleWithin(Promise.resolve(supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()), AUTH_TIMEOUT_MS);
    if (!result) {
      setRole('user');
      return;
    }
    const { data, error } = result;
    if (error) throw error;
    setRole(data?.role === 'owner' ? 'owner' : 'user');
  }, [session?.user.id]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    // Auth is only an enhancement at launch: the free edition is ready
    // immediately, and a late session result still upgrades the user.
    const sessionRequest = supabase.auth.getSession();
    void sessionRequest.then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    }).catch(() => setLoading(false));
    void settleWithin(sessionRequest, AUTH_TIMEOUT_MS).then(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    void refreshRole().catch(() => setRole('user'));
  }, [refreshRole]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabaseが未設定です。', hasSession: false, session: null };
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error: error?.message ?? null, hasSession: Boolean(data.session), session: data.session };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, options?: SignUpOptions) => {
    if (!supabase) return { error: 'Supabaseが未設定です。', hasSession: false, session: null };
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: options?.emailRedirectTo ? { emailRedirectTo: options.emailRedirectTo } : undefined,
    });
    return { error: error?.message ?? null, hasSession: Boolean(data.session), session: data.session };
  }, []);

  const signOut = useCallback(async () => {
    await clearSecureContentCache();
    purgeSecureContent();
    if (supabase) await supabase.auth.signOut();
    setRole('user');
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    if (!supabase) return 'Supabaseが未設定です。';
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: passwordResetRedirectUrl(),
    });
    return error?.message ?? null;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) return 'Supabaseが未設定です。';
    const { error } = await supabase.auth.updateUser({ password });
    return error?.message ?? null;
  }, []);

  const value = useMemo(() => ({
    configured: supabaseConfigured,
    loading,
    session,
    user: session?.user ?? null,
    role,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    updatePassword,
    signOut,
    refreshRole,
  }), [loading, refreshRole, role, sendPasswordReset, session, signInWithEmail, signOut, signUpWithEmail, updatePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * The confirmation link must bring a buyer back to the purchase intent,
 * instead of the generic home screen. The web URL is allow-listed in
 * Supabase Auth; native builds use the app's registered deep-link scheme.
 */
export function checkoutConfirmationRedirectUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // GitHub Pages serves Expo's static route as `auth.html`. Using `/auth`
    // makes the email-confirmation redirect depend on a server-side rewrite,
    // which Pages does not provide.
    return `${window.location.origin}/syoseijutsu-roku-mobile/auth.html?intent=checkout`;
  }
  return 'shoseijutsuroku://auth?intent=checkout';
}

export function passwordResetRedirectUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/syoseijutsu-roku-mobile/auth.html?mode=reset`;
  }
  return 'shoseijutsuroku://auth?mode=reset';
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
