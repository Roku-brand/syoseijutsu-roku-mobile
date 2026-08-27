import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText, DetailHeader } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { checkoutConfirmationRedirectUrl, purchaseClaimRedirectUrl, useAuth } from '@/auth/auth-state';
import { createCompleteEditionCheckout, reconcileCompleteEditionPurchase } from '@/lib/purchase';

export default function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ intent?: string; mode?: string; session_id?: string }>();
  const { configured, user, signInWithEmail, signUpWithEmail, sendPasswordReset, updatePassword, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const purchaseIntent = params.intent === 'checkout';
  const claimSessionId = typeof params.session_id === 'string' ? params.session_id : '';
  const claimIntent = params.intent === 'claim' && /^cs_(test_|live_)?[A-Za-z0-9]+$/.test(claimSessionId);
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>(
    params.mode === 'reset' ? 'reset' : params.mode === 'signin' ? 'signin' : 'signup',
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

  // This covers both a normal login and the return from the email-confirmation
  // link. `checkoutStarted` makes the redirect idempotent if auth state updates
  // more than once while Supabase exchanges the confirmation token.
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
      if (error) {
        setMessage(error);
      } else {
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

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <DetailHeader title="アカウント" />
      <AppText style={styles.sectionTitle}>アカウントの作成・ログイン</AppText>
      <View style={styles.card}>
        <AppText style={styles.title}>{mode === 'forgot' ? 'パスワードを再設定' : mode === 'reset' ? '新しいパスワードを設定' : user ? 'ログイン済み' : purchaseIntent ? '完全版を購入するための登録' : claimIntent ? '完全版を有効にする' : 'アカウントを作成・ログイン'}</AppText>
        <AppText style={styles.lead}>{mode === 'forgot' ? '登録したメールアドレスへ再設定リンクを送ります。' : mode === 'reset' ? '今後使用する新しいパスワードを入力してください。' : purchaseIntent ? '購入履歴を安全に保存し、機種変更後も完全版を復元できるよう、決済の前にアカウントを作成します。登録後はそのまま決済画面へ進みます。' : claimIntent ? '決済に使用したメールアドレスでアカウントを作成またはログインすると、完全版を安全に有効化できます。' : '無料版は登録なしで利用できます。完全版を購入済みの方は、こちらからログインして復元できます。'}</AppText>

        {!configured ? (
          <View style={styles.notice}>
            <AppText style={styles.noticeTitle}>Supabase設定待ち</AppText>
            <AppText style={styles.noticeText}>EXPO_PUBLIC_SUPABASE_URL と EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY を設定するとログインが有効になります。</AppText>
          </View>
        ) : user && mode !== 'reset' ? (
          <View style={styles.accountBox}>
            <AppText style={styles.accountLabel}>ログイン中</AppText>
            <AppText style={styles.accountEmail}>{user.email}</AppText>
            <Pressable style={styles.secondary} onPress={() => void signOut()}>
              <AppText style={styles.secondaryText}>ログアウト</AppText>
            </Pressable>
          </View>
        ) : (
          <>
            {mode === 'signin' || mode === 'signup' ? <View style={styles.tabs}>
              <Pressable onPress={() => setMode('signup')} style={[styles.tab, mode === 'signup' && styles.tabActive]}><AppText style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>新規登録</AppText></Pressable>
              <Pressable onPress={() => setMode('signin')} style={[styles.tab, mode === 'signin' && styles.tabActive]}><AppText style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>ログイン</AppText></Pressable>
            </View> : null}
            {mode !== 'reset' ? <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="メールアドレス" placeholderTextColor={colors.muted} style={styles.input} /> : null}
            {mode !== 'forgot' ? <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder={mode === 'reset' ? '新しいパスワード（6文字以上）' : 'パスワード（6文字以上）'} placeholderTextColor={colors.muted} style={styles.input} /> : null}
            {message ? <AppText style={styles.message}>{message}</AppText> : null}
            <Pressable disabled={submitting || (mode !== 'reset' && !email) || (mode !== 'forgot' && password.length < 6)} onPress={() => void submit()} style={[styles.primary, (submitting || (mode !== 'reset' && !email) || (mode !== 'forgot' && password.length < 6)) && styles.disabled]}>
              <AppText style={styles.primaryText}>{submitting ? '確認中…' : mode === 'forgot' ? '再設定メールを送る' : mode === 'reset' ? 'パスワードを更新' : mode === 'signin' ? purchaseIntent ? 'ログインして決済へ進む' : claimIntent ? 'ログインして完全版を有効にする' : 'ログイン' : purchaseIntent ? 'アカウントを作成して決済へ進む' : claimIntent ? 'アカウントを作成して完全版を有効にする' : 'アカウントを作成'}</AppText>
            </Pressable>
            {mode === 'signin' ? <Pressable onPress={() => { setMode('forgot'); setMessage(''); }} style={styles.textLink}><AppText style={styles.textLinkLabel}>パスワードを忘れた方</AppText></Pressable> : null}
            {mode === 'forgot' ? <Pressable onPress={() => { setMode('signin'); setMessage(''); }} style={styles.textLink}><AppText style={styles.textLinkLabel}>ログインへ戻る</AppText></Pressable> : null}
          </>
        )}
      </View>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 620, alignSelf: 'center' },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.sm, fontFamily: fonts.serif, fontSize: 20, lineHeight: 29, fontWeight: '700' },
  card: { width: '100%', padding: spacing.xl, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  eyebrow: { color: colors.gold, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  title: { marginTop: 8, fontFamily: fonts.serif, fontSize: 27, lineHeight: 38, fontWeight: '700' },
  lead: { marginTop: 10, color: colors.muted, fontSize: 13, lineHeight: 22 },
  tabs: { flexDirection: 'row', marginTop: spacing.xl, padding: 4, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.paperDeep },
  tab: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  tabActive: { backgroundColor: colors.gold },
  tabText: { color: colors.inkSoft, fontWeight: '700' },
  tabTextActive: { color: '#FFFFFF' },
  input: { minHeight: 52, marginTop: spacing.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.white, color: colors.ink, fontSize: 15 },
  primary: { minHeight: 54, marginTop: spacing.lg, borderRadius: radius.md, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },
  disabled: { opacity: 0.45 },
  secondary: { minHeight: 48, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.gold, fontWeight: '700' },
  message: { marginTop: spacing.md, color: colors.inkSoft, fontSize: 12, lineHeight: 19 },
  textLink: { minHeight: 42, marginTop: 6, alignItems: 'center', justifyContent: 'center' },
  textLinkLabel: { color: colors.gold, fontSize: 13, lineHeight: 19, textDecorationLine: 'underline' },
  notice: { marginTop: spacing.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.sm, backgroundColor: '#F5EFE3' },
  noticeTitle: { fontWeight: '700', fontFamily: fonts.serif },
  noticeText: { marginTop: 6, color: colors.muted, fontSize: 12, lineHeight: 19 },
  accountBox: { marginTop: spacing.xl },
  accountLabel: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  accountEmail: { marginTop: 6, fontSize: 16, fontWeight: '700' },
});
