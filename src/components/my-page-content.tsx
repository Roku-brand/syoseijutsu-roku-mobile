import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { BookScreen } from './book-ui';
import { AppText } from './ui';
import { FavoritesOverview } from './favorites-overview';
import { PersonalMemosContent } from './personal-memos-content';
import { RecentReadingPreview } from './recent-reading-preview';
import { PersonalSectionHeading } from './personal-section-heading';
import { colors, fonts, layout, radius, spacing } from '@/constants/theme';
import { useAppState } from '@/state/app-state';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { APP_ROUTES, signInRoute } from '@/navigation/app-routes';
import { formatRemainingAccess } from '@/lib/purchase';
import { usePersonalMemoRoute } from '@/hooks/use-personal-memo-route';
const principleScrollArtwork = require('../../assets/my-page/personal-principle-scroll-refined.webp');

export default function MyPageContent() {
  const router = useRouter();
  const { composeRequested, onComposeHandled } = usePersonalMemoRoute();
  const { width } = useHydratedWindowDimensions();
  const mobile = width < 768;
  const { user, profile, loading: authLoading } = useAuth();
  const { accessState, accessInfo, isPaid } = useAccess();
  const { personalPrinciple, updatePersonalPrinciple } = useAppState();
  const [principleEditing, setPrincipleEditing] = useState(false);
  const [principleDraft, setPrincipleDraft] = useState(personalPrinciple);
  const displayName = authLoading ? 'プロフィールを確認中' : profile?.displayName ?? suggestedName(user?.email);
  const badge = accessState === 'checking' ? '利用状態を確認中'
    : accessState === 'error' ? '利用状態を確認できません'
    : accessInfo.status === 'expired' ? '利用期間終了'
    : accessState === 'paid' ? `完全版を利用中${accessInfo.accessType === 'thirty_day' && accessInfo.accessExpiresAt ? `・${formatRemainingAccess(accessInfo.accessExpiresAt)}` : ''}` : '無料版を利用中';


  const openPrincipleEditor = () => { void Haptics.selectionAsync().catch(() => undefined); setPrincipleDraft(personalPrinciple); setPrincipleEditing(true); };
  return <BookScreen testID="my-page-scroll" contentContainerStyle={[styles.content, mobile && styles.contentMobile]}>
    <View testID="my-page-dashboard" style={styles.dashboard}>
        <View testID="profile-principle-card" style={styles.profileCard}>
          <View style={[styles.profileRow, mobile && styles.profileRowMobile]}>
            <Pressable
              testID="account-membership-card"
              accessibilityRole="button"
              accessibilityLabel={user ? 'プロフィールを編集' : 'ログインしてプロフィールを設定'}
              onPress={() => router.push(user ? APP_ROUTES.profile : signInRoute())}
              style={({ pressed }) => [styles.identity, mobile && styles.identityMobile, pressed && styles.pressed]}
            >
              <ProfileMark avatarUrl={profile?.avatarUrl} />
              <View style={[styles.identityCopy, mobile && styles.identityCopyMobile]}>
                <AppText numberOfLines={2} style={[styles.profileName, mobile && styles.profileNameMobile]}>{displayName}</AppText>
                <View style={[styles.membershipBadge, mobile && styles.membershipBadgeMobile]}>{isPaid ? <AppText accessibilityElementsHidden style={styles.crown}>♛</AppText> : null}<AppText style={[styles.membershipBadgeText, mobile && styles.membershipBadgeTextMobile]}>{badge}</AppText></View>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={user ? 'プロフィールを編集' : 'ログインしてプロフィールを設定'}
              onPress={() => router.push(user ? APP_ROUTES.profile : signInRoute())}
              style={({ pressed }) => [styles.profileEdit, mobile && styles.profileEditMobile, pressed && styles.pressed]}
            ><AppText style={[styles.profileEditText, mobile && styles.profileEditTextMobile]}>{mobile ? '編集 ›' : '✎　編集　›'}</AppText></Pressable>
          </View>
          <View style={styles.profileDivider} />
          <View
            testID="personal-principle-card"
            style={[styles.scrollWrap, mobile && styles.scrollWrapMobile]}
          >
            <View pointerEvents="none" style={styles.scrollArtwork}>
              <Image source={principleScrollArtwork} resizeMode="stretch" style={styles.scrollImage} />
              <View style={styles.scrollLandscape}><Image source={require('../../assets/my-page/folder-sage.webp')} resizeMode="cover" style={styles.scrollImage} /></View>
            </View>
            <View style={[styles.scrollContent, mobile && styles.scrollContentMobile]}>
              <View style={styles.principleHeading}>
                <AppText style={styles.principleLabel}>いまの座右の銘</AppText><View style={styles.principleRule} />
                <Pressable
                  testID="personal-principle-edit"
                  accessibilityRole="button"
                  accessibilityLabel="座右の銘を編集"
                  onPress={openPrincipleEditor}
                  style={({ pressed }) => [styles.editPrinciple, pressed && styles.pressed]}
                ><AppText style={styles.editIcon}>✎</AppText></Pressable>
              </View>
              {personalPrinciple ? <AppText style={[styles.principle, mobile && styles.principleMobile]}>{personalPrinciple}</AppText>
                : <Pressable accessibilityRole="button" accessibilityLabel="座右の銘を設定" onPress={openPrincipleEditor}><AppText style={[styles.principle, mobile && styles.principleMobile]}>座右の銘を設定　›</AppText></Pressable>}
            </View>
          </View>
        </View>


      <View style={dashboardStyles.sections}>
        <FavoritesOverview />
        <PersonalMemosContent preview composeRequested={composeRequested} onComposeHandled={onComposeHandled} />
        <View testID="history-entry">
          <PersonalSectionHeading title="閲覧履歴" action="すべて見る ＞" actionLabel="閲覧履歴を開く" onAction={() => router.push(APP_ROUTES.history)} />
          <RecentReadingPreview railTestID="my-page-history-rail" cardTestID="my-page-history-card" />
        </View>
      </View>
    </View>
    <Modal transparent visible={principleEditing} animationType="fade" onRequestClose={() => setPrincipleEditing(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={dashboardStyles.modal}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={dashboardStyles.modalScroll}><View role="dialog" aria-modal accessibilityLabel="座右の銘の編集" tabIndex={-1} style={styles.modalCard}>
          <AppText style={styles.modalTitle}>座右の銘を編集</AppText>
          <TextInput multiline maxLength={100} value={principleDraft} onChangeText={setPrincipleDraft} accessibilityLabel="座右の銘" style={styles.input} />
          <View style={styles.modalActions}><Pressable accessibilityRole="button" onPress={() => setPrincipleEditing(false)} style={styles.cancel}><AppText style={styles.cancelText}>閉じる</AppText></Pressable><Pressable accessibilityRole="button" onPress={() => { updatePersonalPrinciple(principleDraft); setPrincipleEditing(false); }} style={styles.save}><AppText style={styles.saveText}>保存する</AppText></Pressable></View>
        </View></ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  </BookScreen>;
}
function suggestedName(email?: string | null) { return email?.split('@')[0] || 'プロフィールを設定'; }
function ProfileMark({ avatarUrl }: { avatarUrl?: string | null }) {
  const { width } = useHydratedWindowDimensions();
  const compact = width < 768;
  return <View accessibilityElementsHidden style={[styles.profileMark, compact && styles.profileMarkMobile]}>{avatarUrl ? <Image source={{ uri: avatarUrl }} resizeMode="cover" style={styles.profileImage} /> : <View testID="profile-avatar-fallback" style={styles.personGlyph}><View style={styles.personHead} /><View style={styles.personShoulders} /></View>}</View>;
}


const dashboardStyles = StyleSheet.create({
  sections: { gap: 34, marginTop: 30 },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.38)' }, modalScroll: { flexGrow: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
});
const styles = StyleSheet.create({
  content: { maxWidth: 1238, paddingHorizontal: 24, paddingTop: 26, paddingBottom: layout.bottomContentInset + spacing.xl },
  contentMobile: { paddingTop: spacing.md, paddingHorizontal: spacing.md },
  profileRowMobile: { minHeight: 84, paddingHorizontal: 0, gap: 6 },
  identityMobile: { gap: 12 },
  membershipBadgeMobile: { paddingHorizontal: 7, paddingVertical: 2, marginTop: 4 },
  membershipBadgeTextMobile: { fontSize: 10, lineHeight: 16 },
  profileEditTextMobile: { fontSize: 13, lineHeight: 20 },
  identityCopyMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 0 },
  profileMarkMobile: { width: 60, height: 60, borderRadius: 30 },
  profileEditMobile: { minHeight: 44, paddingHorizontal: 8 },
  principleRule: { width: 30, height: 1, backgroundColor: '#B78C48' },
  scrollLandscape: { position: 'absolute', top: '21%', bottom: '20%', right: '3%', width: '55%', opacity: 0.24, overflow: 'hidden' },
  crown: { color: colors.gold, fontSize: 20, lineHeight: 22 },
  personGlyph: { width: 44, height: 44, alignItems: 'center' },
  personHead: { position: 'absolute', top: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.muted },
  personShoulders: { position: 'absolute', bottom: 0, width: 38, height: 21, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: colors.muted },
  dashboard: { width: '100%' },
  profileCard: { backgroundColor: colors.paper },
  profileRow: { minHeight: 100, paddingHorizontal: 0, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 26 },
  identityCopy: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 28 },
  profileMark: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFFDFC', borderWidth: 1.5, borderColor: '#252A29', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  profileImage: { width: '100%', height: '100%' },
  profileName: { maxWidth: '100%', color: colors.ink, fontFamily: fonts.serif, fontSize: 30, lineHeight: 42, fontWeight: '600', letterSpacing: 3 },
  profileNameMobile: { fontSize: 22, lineHeight: 31 },
  membershipBadge: { maxWidth: '100%', paddingHorizontal: 13, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#C9974A', borderRadius: radius.pill, backgroundColor: '#FFFDF9' },
  membershipBadgeText: { flexShrink: 1, color: colors.goldDeep, fontSize: 13, lineHeight: 21, fontWeight: '600' },
  profileEdit: { minHeight: 54, paddingHorizontal: 24, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  profileEditText: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 18, lineHeight: 26, fontWeight: '600' },
  profileDivider: { height: 1, backgroundColor: colors.line },
  scrollWrap: { minHeight: 184, marginHorizontal: -4, marginTop: 10, marginBottom: 8, justifyContent: 'center' },
  scrollWrapMobile: { minHeight: 140, marginHorizontal: -spacing.md, marginTop: spacing.md },
  scrollArtwork: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  scrollImage: { width: '100%', height: '100%' },
  scrollContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 72, paddingVertical: 40 },
  scrollContentMobile: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  principleHeading: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  principleLabel: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 16, lineHeight: 24, fontWeight: '600', letterSpacing: 1 },
  principle: { marginTop: 9, color: colors.ink, fontFamily: fonts.serif, fontSize: 36, lineHeight: 50, fontWeight: '600', letterSpacing: 2 },
  principleMobile: { maxWidth: '100%', fontSize: 23, lineHeight: 34, letterSpacing: 0.2 },
  editPrinciple: { minHeight: 32, width: 32, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  editIcon: { color: colors.goldDeep, fontSize: 20, lineHeight: 26 },
  modalCard: { width: '100%', maxWidth: 520, padding: spacing.xl, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.lg, backgroundColor: colors.surface },
  modalTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 23, lineHeight: 32, fontWeight: '600' },
  input: { minHeight: 130, marginTop: spacing.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.white, color: colors.ink, fontFamily: fonts.serif, fontSize: 18, lineHeight: 30, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  cancel: { minHeight: 50, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.muted, fontWeight: '700' },
  save: { flex: 1, minHeight: 50, borderRadius: radius.md, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: '700' },
  pressed: { opacity: 0.7 }
});
