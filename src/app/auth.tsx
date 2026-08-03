import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText, DetailHeader } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/auth/auth-state';

export default function AuthScreen() {
  const router = useRouter();
  const { configured, user, signInWithEmail, signUpWithEmail, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setMessage('');
    const error = mode === 'signin'
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password);
    setSubmitting(false);
    if (error) setMessage(error);
    else if (mode === 'signup') setMessage('確認メールを送信しました。メール内のリンクから登録を完了してください。');
    else router.back();
  };

  return (
    <BookScreen>
      <DetailHeader title="アカウント" />
      <View style={styles.card}>
        <AppText style={styles.eyebrow}>ACCOUNT</AppText>
        <AppText style={styles.title}>{user ? 'ログイン済み' : '蔵書と購入状態を引き継ぐ'}</AppText>
        <AppText style={styles.lead}>無料体験はログインなしでも利用できます。ログインすると、購入状態と学習記録を同じアカウントで管理できます。</AppText>

        {!configured ? (
          <View style={styles.notice}>
            <AppText style={styles.noticeTitle}>Supabase設定待ち</AppText>
            <AppText style={styles.noticeText}>EXPO_PUBLIC_SUPABASE_URL と EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY を設定するとログインが有効になります。</AppText>
          </View>
        ) : user ? (
          <View style={styles.accountBox}>
            <AppText style={styles.accountLabel}>ログイン中</AppText>
            <AppText style={styles.accountEmail}>{user.email}</AppText>
            <Pressable style={styles.secondary} onPress={() => void signOut()}>
              <AppText style={styles.secondaryText}>ログアウト</AppText>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.tabs}>
              <Pressable onPress={() => setMode('signin')} style={[styles.tab, mode === 'signin' && styles.tabActive]}><AppText style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>ログイン</AppText></Pressable>
              <Pressable onPress={() => setMode('signup')} style={[styles.tab, mode === 'signup' && styles.tabActive]}><AppText style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>新規登録</AppText></Pressable>
            </View>
            <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="メールアドレス" placeholderTextColor={colors.muted} style={styles.input} />
            <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="パスワード（6文字以上）" placeholderTextColor={colors.muted} style={styles.input} />
            {message ? <AppText style={styles.message}>{message}</AppText> : null}
            <Pressable disabled={submitting || !email || password.length < 6} onPress={() => void submit()} style={[styles.primary, (submitting || !email || password.length < 6) && styles.disabled]}>
              <AppText style={styles.primaryText}>{submitting ? '確認中…' : mode === 'signin' ? 'ログイン' : 'アカウントを作成'}</AppText>
            </Pressable>
          </>
        )}
      </View>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: 560, alignSelf: 'center', marginTop: spacing.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  eyebrow: { color: colors.gold, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  title: { marginTop: 8, fontFamily: fonts.serif, fontSize: 27, lineHeight: 38, fontWeight: '700' },
  lead: { marginTop: 10, color: colors.muted, fontSize: 13, lineHeight: 22 },
  tabs: { flexDirection: 'row', marginTop: spacing.xl, padding: 4, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.paperDeep },
  tab: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  tabActive: { backgroundColor: colors.charcoal },
  tabText: { color: colors.inkSoft, fontWeight: '700' },
  tabTextActive: { color: colors.goldLight },
  input: { minHeight: 52, marginTop: spacing.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.white, color: colors.ink, fontSize: 15 },
  primary: { minHeight: 54, marginTop: spacing.lg, borderRadius: radius.sm, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.goldLight, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  secondary: { minHeight: 48, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.gold, fontWeight: '700' },
  message: { marginTop: spacing.md, color: colors.inkSoft, fontSize: 12, lineHeight: 19 },
  notice: { marginTop: spacing.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.sm, backgroundColor: '#F5EFE3' },
  noticeTitle: { fontWeight: '700', fontFamily: fonts.serif },
  noticeText: { marginTop: 6, color: colors.muted, fontSize: 12, lineHeight: 19 },
  accountBox: { marginTop: spacing.xl },
  accountLabel: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  accountEmail: { marginTop: 6, fontSize: 16, fontWeight: '700' },
});
