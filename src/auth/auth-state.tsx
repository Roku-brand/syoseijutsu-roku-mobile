import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { clearSecureContentCache, purgeSecureContent } from '@/lib/secure-content';

export type AccountRole = 'user' | 'owner';
export type AuthResult = { error: string | null; hasSession: boolean; session: Session | null };
export type SignUpOptions = { emailRedirectTo?: string };
export type AccountProfile = { displayName: string | null; avatarUrl: string | null };
export type ProfileImageUpload = { uri: string; mimeType?: string | null; fileName?: string | null };

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: AccountProfile | null;
  role: AccountRole;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string, options?: SignUpOptions) => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  updateProfile: (displayName: string, image?: ProfileImageUpload | null) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
  const [profile, setProfile] = useState<AccountProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    const userId = session?.user.id;
    if (!supabase || !userId) {
      setRole('user');
      setProfile(null);
      return;
    }
    const result = await settleWithin(Promise.resolve(supabase
      .from('profiles')
      .select('role, display_name, avatar_url')
      .eq('user_id', userId)
      .maybeSingle()), AUTH_TIMEOUT_MS);
    if (!result) {
      setRole('user');
      setProfile(null);
      return;
    }
    const { data, error } = result;
    if (error) throw error;
    setRole(data?.role === 'owner' ? 'owner' : 'user');
    setProfile(data ? { displayName: data.display_name ?? null, avatarUrl: data.avatar_url ?? null } : null);
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
    void refreshProfile().catch(() => {
      setRole('user');
      setProfile(null);
    });
  }, [refreshProfile]);

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
    setProfile(null);
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

  const updateProfile = useCallback(async (displayName: string, image?: ProfileImageUpload | null) => {
    if (!supabase || !session?.user) return 'ログイン後にプロフィールを変更できます。';
    const trimmedName = displayName.trim();
    if (!trimmedName) return '表示名を入力してください。';
    if (trimmedName.length > 24) return '表示名は24文字以内にしてください。';

    let avatarUrl = profile?.avatarUrl ?? null;
    if (image) {
      const mimeType = image.mimeType && ['image/jpeg', 'image/png', 'image/webp'].includes(image.mimeType)
        ? image.mimeType
        : 'image/jpeg';
      const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
      const response = await fetch(image.uri);
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 2 * 1024 * 1024) return '画像は2MB以下にしてください。';
      const path = `${session.user.id}/avatar.${extension}`;
      const upload = await supabase.storage.from('profile-avatars').upload(path, bytes, { upsert: true, contentType: mimeType });
      if (upload.error) return upload.error.message;
      const publicUrl = supabase.storage.from('profile-avatars').getPublicUrl(path).data.publicUrl;
      avatarUrl = `${publicUrl}?v=${Date.now()}`;
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({ user_id: session.user.id, display_name: trimmedName, avatar_url: avatarUrl }, { onConflict: 'user_id' });
    if (error) return error.message;
    await refreshProfile();
    return null;
  }, [profile?.avatarUrl, refreshProfile, session?.user]);

  const value = useMemo(() => ({
    configured: supabaseConfigured,
    loading,
    session,
    user: session?.user ?? null,
    profile,
    role,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    updatePassword,
    updateProfile,
    signOut,
    refreshProfile,
  }), [loading, profile, refreshProfile, role, sendPasswordReset, session, signInWithEmail, signOut, signUpWithEmail, updatePassword, updateProfile]);

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
    return `${window.location.origin}/auth.html?intent=checkout`;
  }
  return 'shoseijutsuroku://auth?intent=checkout';
}

export function passwordResetRedirectUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/auth.html?mode=reset`;
  }
  return 'shoseijutsuroku://auth?mode=reset';
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
