import { useLocalSearchParams, usePathname, useSegments } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, fonts, spacing } from '@/constants/theme';
import { useAccess } from './access-state';
import { useAppState } from '@/state/app-state';

export function AccessBoundary({ children }: { children: React.ReactNode }) {
  const { accessState, refreshAccess, continueAsGuest, restorePurchase, isOwner, previewMode, setPreviewMode } = useAccess();
  const pathname = usePathname();
  const segments = useSegments();
  const params = useLocalSearchParams<{ checkout?: string | string[] }>();
  const { hydrated, welcomePageHidden } = useAppState();
  const checkout = Array.isArray(params.checkout) ? params.checkout[0] : params.checkout;
  // The welcome page is the entry point for every visitor. It must not be
  // hidden behind a slow auth or entitlement check, which otherwise leaves a
  // loading sheet over the welcome design on first launch.
  const isTabHome = segments[0] === '(tabs)';
  const isWelcome = pathname === '/welcome'
    || pathname === '/onboarding'
    || (pathname === '/' && !isTabHome && !checkout && (!hydrated || !welcomePageHidden));
  const simulated = isOwner && previewMode !== 'actual';

  if (isWelcome) return <>{children}</>;

  if (accessState === 'checking') {
    return (
      <View style={styles.screen}>
        <AppText style={styles.mark}>禄</AppText>
        <AppText style={styles.title}>処世術禄</AppText>
        <AppText style={styles.body}>利用状態を確認しています</AppText>
        <View style={styles.progress}><View style={styles.progressFill} /></View>
        {simulated ? (
          <Pressable style={styles.link} onPress={() => void setPreviewMode('actual')}>
            <AppText style={styles.linkText}>オーナープレビューを終了</AppText>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (accessState === 'error') {
    return (
      <View style={styles.screen}>
        <AppText style={styles.title}>利用状態を確認できませんでした</AppText>
        <AppText style={styles.body}>通信状態を確認して、もう一度お試しください。購入済みの場合も、再確認すると復元できます。</AppText>
        <Pressable style={styles.primary} onPress={() => simulated ? void setPreviewMode('actual') : void refreshAccess()}>
          <AppText style={styles.primaryText}>{simulated ? 'オーナープレビューを終了' : 'もう一度確認する'}</AppText>
        </Pressable>
        {!simulated ? (
          <>
            <Pressable style={styles.secondary} onPress={() => void restorePurchase()}>
              <AppText style={styles.secondaryText}>購入を復元する</AppText>
            </Pressable>
            <Pressable style={styles.link} onPress={continueAsGuest}>
              <AppText style={styles.linkText}>無料版を開く</AppText>
            </Pressable>
          </>
        ) : null}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  mark: { color: colors.gold, fontFamily: fonts.serif, fontSize: 48, lineHeight: 58 },
  title: { marginTop: 10, textAlign: 'center', color: colors.ink, fontFamily: fonts.serif, fontSize: 25, lineHeight: 36, fontWeight: '700' },
  body: { maxWidth: 420, marginTop: 14, textAlign: 'center', color: colors.muted, fontSize: 14, lineHeight: 24 },
  progress: { width: 160, height: 2, marginTop: 24, backgroundColor: colors.line, overflow: 'hidden' },
  progressFill: { width: '58%', height: 2, backgroundColor: colors.gold },
  primary: { width: '100%', maxWidth: 360, minHeight: 54, marginTop: 24, borderRadius: 16, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },
  secondary: { width: '100%', maxWidth: 360, minHeight: 52, marginTop: 10, borderWidth: 1, borderColor: colors.gold, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.gold, fontWeight: '700' },
  link: { marginTop: 14, padding: 10 },
  linkText: { color: colors.inkSoft, textDecorationLine: 'underline' },
});
