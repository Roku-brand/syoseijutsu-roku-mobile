import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { BookScreen } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { checkoutConfirmationRedirectUrl, purchaseClaimRedirectUrl, useAuth } from '@/auth/auth-state';
import { createCompleteEditionCheckout, reconcileCompleteEditionPurchase } from '@/lib/purchase';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'reset';

export default function AuthScreen() {
  const router = useRouter();
  const { width } = useResponsiveLayout();
  const compact = width < 700;
  const params = useLocalSearchParams<{ intent?: string; mode?: string; session_id?: string }>();
  const { configured, user, signInWithEmail, signUpWithEmail, sendPasswordReset, updatePassword, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const purchaseIntent = params.intent === 'checkout';
  const claimSessionId = typeof params.session_id === 'string' ? params.session_id : '';
  const claimIntent = params.intent === 'claim' && /^cs_(test_|live_)?[A-Za-z0-9]+$/.test(claimSessionId);
  const [mode, setMode] = useState<AuthMode>(
    params.mode === 'reset' ? 'reset' : params.mode === 'signup' ? 'signup' : 'signin',
  );
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const checkoutStarted = useRef(false);
  const claimStarted = useRef(false);

  useEffect(() => {
    if (params.mode === 'reset') setMode('reset');
    else if (params.mode === 'forgot') setMode('forgot');
    else if (params.mode === 'signin') setMode('signin');
    else if (params.mode === 'signup') setMode('signup');
  }, [params.mode]);

  const continueToCheckout = useCallback(async (accessToken?: string) => {
    if (checkoutStarted.current) return;
    checkoutStarted.current = true;
    setSubmitting(true);
    setMessage('決済画面を開いています…');
    try {
      const result = await createCompleteEditionCheckout(accessToken);
      if (result.alreadyPaid) router.replace('/upgrade');
    } catch (error) {
      checkoutStarted.current = false;
      setMessage(error instanceof Error ? error.message : '決済画面を開けませんでした。');
    } finally {
      setSubmitting(false);
    }
  }, [router]);

  const continueToClaim = useCallback(async () => {
    if (!claimIntent || claimStarted.current) return;
    claimStarted.current = true;
    setSubmitting(true);
    setMessage('購入情報を確認し、完全版を有効にしています…');
    try {
      const access = await reconcileCompleteEditionPurchase(claimSessionId);
      if (access?.status === 'active') {
        router.replace({ pathname: '/upgrade', params: { checkout: 'success', session_id: claimSessionId } });
      } else {
        claimStarted.current = false;
        setMessage('購入を確認できませんでした。決済に使用したメールアドレスでログインしているか確認してください。');
      }
    } catch (error) {
      claimStarted.current = false;
      setMessage(error instanceof Error ? error.message : '購入情報を確認できませんでした。');
    } finally {
      setSubmitting(false);
    }
  }, [claimIntent, claimSessionId, router]);

  useEffect(() => {
    if (purchaseIntent && user) void continueToCheckout();
  }, [continueToCheckout, purchaseIntent, user]);

  useEffect(() => {
    if (claimIntent && user) void continueToClaim();
  }, [claimIntent, continueToClaim, user]);

  const submit = async () => {
    setSubmitting(true);
    setMessage('');
    if (mode === 'forgot') {
      const error = await sendPasswordReset(email);
      setSubmitting(false);
      setMessage(error ?? 'パスワード再設定メールを送信しました。メール内のリンクを開いてください。');
      return;
    }
    if (mode === 'reset') {
      if (!user) {
        setSubmitting(false);
        setMessage('再設定リンクを確認できませんでした。メール内のリンクをもう一度開いてください。');
        return;
      }
      const error = await updatePassword(password);
      setSubmitting(false);
      if (error) setMessage(error);
      else {
        setMessage('パスワードを更新しました。');
        setMode('signin');
      }
      return;
    }
    const result = mode === 'signin'
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password, purchaseIntent
        ? { emailRedirectTo: checkoutConfirmationRedirectUrl() }
        : claimIntent ? { emailRedirectTo: purchaseClaimRedirectUrl(claimSessionId) } : undefined);
    if (result.error) {
      setSubmitting(false);
      setMessage(result.error);
      return;
    }
    if (result.hasSession) {
      if (purchaseIntent) {
        setSubmitting(false);
        await continueToCheckout(result.session?.access_token);
      } else if (claimIntent) {
        setSubmitting(false);
        await continueToClaim();
      } else {
        setSubmitting(false);
        router.back();
      }
      return;
    }
    setSubmitting(false);
    setMessage(purchaseIntent
      ? '確認メールを送信しました。メール内のリンクを開くと、このまま決済画面へ進みます。'
      : claimIntent
        ? '確認メールを送信しました。メール内のリンクを開くと、購入確認を続けます。'
        : '確認メールを送信しました。メール内のリンクから登録を完了してください。');
  };

  const title = mode === 'forgot'
    ? 'パスワードを再設定'
    : mode === 'reset'
      ? '新しいパスワードを設定'
      : purchaseIntent
        ? '完全版を購入するための登録'
        : claimIntent
          ? '完全版を有効にする'
          : 'アカウント作成・ログイン';
  const lead = mode === 'forgot'
    ? '登録したメールアドレスへ再設定リンクを送ります。'
    : mode === 'reset'
      ? '今後使用する新しいパスワードを入力してください。'
      : purchaseIntent
        ? '購入履歴を安全に保存し、機種変更後も完全版を復元できるよう、決済の前にアカウントを作成します。'
        : claimIntent
          ? '決済に使用したメールアドレスでアカウントを作成またはログインすると、完全版を安全に有効化できます。'
          : '購入情報や保存した処世術・マイ処世術を、アカウントに紐づけて管理できます。';
  const submitLabel = submitting
    ? '確認中…'
    : mode === 'forgot'
      ? '再設定メールを送る'
      : mode === 'reset'
        ? 'パスワードを更新'
        : mode === 'signin'
          ? purchaseIntent ? 'ログインして決済へ進む' : claimIntent ? 'ログインして完全版を有効にする' : 'ログイン'
          : purchaseIntent ? 'アカウントを作成して決済へ進む' : claimIntent ? 'アカウントを作成して完全版を有効にする' : 'アカウントを作成';
  const disabled = submitting || (mode !== 'reset' && !email) || (mode !== 'forgot' && password.length < 6);

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <View style={styles.panel}>
        {user && mode !== 'reset' ? (
          <LoggedInAccount email={user.email ?? ''} onSignOut={() => void signOut()} />
        ) : (
          <>
            <View style={styles.intro}>
              <AppText variant="serif" style={[styles.title, compact && styles.titleCompact]}>{title}</AppText>
              <View style={styles.shortRule} />
              <AppText style={styles.lead}>{lead}</AppText>
            </View>

            {!configured ? (
              <View style={styles.notice}>
                <AppText style={styles.noticeTitle}>Supabase設定待ち</AppText>
                <AppText style={styles.noticeText}>ログイン機能を利用するための設定がまだ完了していません。</AppText>
              </View>
            ) : (
              <View style={styles.form}>
                {mode !== 'reset' ? (
                  <Field label="メールアドレス" icon="envelope">
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      placeholder="例）user@example.com"
                      placeholderTextColor={colors.muted}
                      accessibilityLabel="メールアドレス"
                      style={styles.input}
                    />
                  </Field>
                ) : null}
                {mode !== 'forgot' ? (
                  <Field label="パスワード" icon="lock">
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      placeholder={mode === 'reset' ? '新しいパスワード（6文字以上）' : 'パスワードを入力'}
                      placeholderTextColor={colors.muted}
                      accessibilityLabel="パスワード"
                      style={styles.input}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'パスワードを隠す' : 'パスワードを表示する'}
                      onPress={() => setShowPassword((value) => !value)}
                      hitSlop={8}
                      style={styles.eyeButton}
                    >
                      <SymbolView name={{ ios: showPassword ? 'eye.slash' : 'eye', android: showPassword ? 'visibility_off' : 'visibility', web: showPassword ? 'visibility_off' : 'visibility' }} fallback={<AppText style={styles.fieldFallback}>◉</AppText>} size={20} tintColor={colors.inkSoft} weight="regular" />
                    </Pressable>
                  </Field>
                ) : null}
                {message ? <AppText accessibilityRole="alert" style={styles.message}>{message}</AppText> : null}
                <Pressable accessibilityRole="button" disabled={disabled} onPress={() => void submit()} style={({ pressed }) => [styles.primary, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
                  <AppText variant="serif" style={styles.primaryText}>{submitLabel}</AppText>
                </Pressable>
                {mode === 'signin' ? <Pressable accessibilityRole="button" onPress={() => { setMode('forgot'); setMessage(''); }} style={styles.textLink}><AppText style={styles.textLinkLabel}>パスワードを忘れた方</AppText></Pressable> : null}
                {mode === 'forgot' ? <Pressable accessibilityRole="button" onPress={() => { setMode('signin'); setMessage(''); }} style={styles.textLink}><AppText style={styles.textLinkLabel}>ログインへ戻る</AppText></Pressable> : null}
                {mode === 'signin' && !claimIntent ? (
                  <>
                    <View style={styles.orRow}><View style={styles.orLine} /><AppText style={styles.orText}>または</AppText><View style={styles.orLine} /></View>
                    <AppText style={styles.newAccountLead}>はじめて利用する方</AppText>
                    <Pressable accessibilityRole="button" onPress={() => { setMode('signup'); setMessage(''); }} style={({ pressed }) => [styles.signupButton, pressed && styles.pressed]}>
                      <AppText variant="serif" style={styles.signupButtonText}>新規登録はこちら</AppText>
                      <AppText style={styles.signupChevron}>›</AppText>
                    </Pressable>
                  </>
                ) : null}
                {mode === 'signup' && !claimIntent ? <Pressable accessibilityRole="button" onPress={() => { setMode('signin'); setMessage(''); }} style={styles.textLink}><AppText style={styles.textLinkLabel}>ログインはこちら</AppText></Pressable> : null}
              </View>
            )}
            <SecurityNote includeGuestNote={!purchaseIntent && !claimIntent} />
          </>
        )}
      </View>
    </BookScreen>
  );
}

function Field({ label, icon, children }: { label: string; icon: 'envelope' | 'lock'; children: React.ReactNode }) {
  const names = icon === 'envelope'
    ? ({ ios: 'envelope', android: 'mail', web: 'mail' } as const)
    : ({ ios: 'lock', android: 'lock', web: 'lock' } as const);
  return (
    <View style={styles.field}>
      <AppText style={styles.fieldLabel}>{label}</AppText>
      <View style={styles.inputFrame}>
        <SymbolView name={names} fallback={<AppText style={styles.fieldFallback}>{icon === 'envelope' ? '✉' : '♧'}</AppText>} size={20} tintColor={colors.inkSoft} weight="regular" />
        {children}
      </View>
    </View>
  );
}

function SecurityNote({ includeGuestNote }: { includeGuestNote: boolean }) {
  return (
    <View style={styles.securityNote}>
      <SymbolView name={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }} fallback={<AppText style={styles.securityFallback}>◇</AppText>} size={20} tintColor={colors.ink} weight="regular" />
      <View style={styles.securityCopy}>
        <AppText style={styles.securityText}>購入情報はアカウントに紐づけて安全に管理されます。</AppText>
        {includeGuestNote ? <AppText style={styles.securitySubtext}>無料版は登録なしでもご利用いただけます。</AppText> : null}
      </View>
    </View>
  );
}

function LoggedInAccount({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const initial = email.trim().slice(0, 1).toUpperCase() || '禄';
  return (
    <View style={styles.loggedIn}>
      <View style={styles.accountInitial}><AppText style={styles.accountInitialText}>{initial}</AppText></View>
      <AppText style={styles.loggedInLabel}>ログイン中</AppText>
      <AppText variant="serif" style={styles.accountEmail}>{email}</AppText>
      <View style={styles.shortRule} />
      <AppText style={styles.loggedInLead}>購入情報や保存した処世術・マイ処世術は、このアカウントに紐づいています。</AppText>
      <Pressable accessibilityRole="button" onPress={onSignOut} style={({ pressed }) => [styles.primary, styles.logoutButton, pressed && styles.pressed]}>
        <AppText variant="serif" style={styles.primaryText}>ログアウト</AppText>
      </Pressable>
      <SecurityNote includeGuestNote={false} />
    </View>
  );
}

const brass = '#A77A25';
const softLine = '#DDD7CE';

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingTop: spacing.xxl, paddingBottom: spacing.section },
  panel: { width: '100%', minHeight: 600, paddingHorizontal: 28, paddingVertical: 34, borderWidth: 1, borderColor: softLine, backgroundColor: 'rgba(255,253,248,0.42)' },
  intro: { alignItems: 'center' },
  title: { color: colors.ink, fontSize: 28, lineHeight: 40, fontWeight: '600', letterSpacing: 1.2, textAlign: 'center' },
  titleCompact: { fontSize: 24, lineHeight: 34, letterSpacing: 0.8 },
  shortRule: { width: 48, height: 1, marginTop: 20, backgroundColor: brass },
  lead: { maxWidth: 420, marginTop: 23, color: colors.inkSoft, fontSize: 14, lineHeight: 25, textAlign: 'center' },
  form: { width: '100%', maxWidth: 466, alignSelf: 'center', marginTop: 30 },
  field: { marginTop: 18 },
  fieldLabel: { marginBottom: 8, color: colors.ink, fontSize: 12, lineHeight: 18, fontWeight: '700', letterSpacing: 0.8 },
  inputFrame: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: softLine, borderRadius: radius.sm, backgroundColor: colors.surface },
  input: { flex: 1, minWidth: 0, minHeight: 54, color: colors.ink, fontFamily: fonts.sans, fontSize: 15, lineHeight: 22 },
  fieldFallback: { color: colors.inkSoft, fontSize: 16, lineHeight: 20 },
  eyeButton: { width: 30, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  primary: { minHeight: 56, marginTop: 24, borderRadius: radius.sm, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.paper, fontSize: 18, lineHeight: 26, fontWeight: '600', letterSpacing: 1.5 },
  disabled: { backgroundColor: '#4A4A47' },
  pressed: { opacity: 0.78 },
  message: { marginTop: 14, color: colors.inkSoft, fontSize: 12, lineHeight: 19, textAlign: 'center' },
  textLink: { minHeight: 38, marginTop: 7, alignItems: 'center', justifyContent: 'center' },
  textLinkLabel: { color: brass, fontSize: 12, lineHeight: 18, textDecorationLine: 'underline' },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14 },
  orLine: { flex: 1, height: 1, backgroundColor: softLine },
  orText: { color: colors.inkSoft, fontSize: 12, lineHeight: 18, letterSpacing: 1 },
  newAccountLead: { marginTop: 14, color: colors.inkSoft, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  signupButton: { minHeight: 54, marginTop: 12, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, borderWidth: 1, borderColor: brass, borderRadius: radius.sm, backgroundColor: 'rgba(255,253,248,0.55)' },
  signupButtonText: { color: brass, fontSize: 17, lineHeight: 24, fontWeight: '600', letterSpacing: 0.8 },
  signupChevron: { color: brass, fontSize: 28, lineHeight: 30, marginTop: -2 },
  notice: { maxWidth: 466, marginTop: 30, alignSelf: 'center', padding: spacing.lg, borderWidth: 1, borderColor: softLine, borderRadius: radius.sm, backgroundColor: '#F5EFE3' },
  noticeTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  noticeText: { marginTop: 6, color: colors.muted, fontSize: 12, lineHeight: 19 },
  securityNote: { maxWidth: 466, marginTop: 34, alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  securityFallback: { color: colors.ink, fontSize: 18, lineHeight: 22 },
  securityCopy: { flex: 1 },
  securityText: { color: colors.inkSoft, fontSize: 12, lineHeight: 19 },
  securitySubtext: { marginTop: 5, color: colors.inkSoft, fontSize: 12, lineHeight: 19 },
  loggedIn: { width: '100%', maxWidth: 466, minHeight: 500, alignSelf: 'center', alignItems: 'center', paddingTop: 62 },
  accountInitial: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: brass, backgroundColor: 'rgba(255,253,248,0.5)' },
  accountInitialText: { color: brass, fontFamily: fonts.serif, fontSize: 49, lineHeight: 58, fontWeight: '600' },
  loggedInLabel: { marginTop: 26, color: brass, fontSize: 15, lineHeight: 22, fontWeight: '700', letterSpacing: 1.6 },
  accountEmail: { marginTop: 19, color: colors.ink, fontSize: 23, lineHeight: 33, fontWeight: '600', textAlign: 'center' },
  loggedInLead: { maxWidth: 390, marginTop: 25, color: colors.inkSoft, fontSize: 14, lineHeight: 25, textAlign: 'center' },
  logoutButton: { width: '100%', marginTop: 54 },
});
