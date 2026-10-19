import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useAuth, type ProfileImageUpload } from '@/auth/auth-state';
import { AppText, Screen } from '@/components/ui';
import { colors, fonts, radius, shadow, spacing } from '@/constants/theme';

function suggestedName(email?: string | null) {
  return email?.split('@')[0] || 'ユーザー';
}

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { user, profile, updateProfile } = useAuth();
  const [nameSeed, setNameSeed] = useState({ userId: user?.id, value: profile?.displayName ?? suggestedName(user?.email) });
  const nameDraft = useRef(nameSeed.value);
  const nameEdited = useRef(false);
  const nameInput = useRef<TextInput>(null);
  const formArea = useRef<View>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [image, setImage] = useState<ProfileImageUpload | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const accountChanged = nameSeed.userId !== user?.id;
    if (accountChanged || !nameEdited.current) {
      const value = profile?.displayName ?? suggestedName(user?.email);
      nameDraft.current = value;
      nameEdited.current = false;
      setNameSeed(current => current.userId === user?.id && current.value === value ? current : { userId: user?.id, value });
    }
  }, [nameSeed.userId, profile?.displayName, user?.email, user?.id]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let timer: ReturnType<typeof setTimeout>;
    const revealName = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const element = nameInput.current as unknown as HTMLInputElement | null;
        if (element === document.activeElement) element?.scrollIntoView({ block: 'center', behavior: 'auto' });
      }, 180);
    };
    window.visualViewport?.addEventListener('resize', revealName);
    window.addEventListener('resize', revealName);
    document.addEventListener('focusin', revealName);
    return () => {
      clearTimeout(timer);
      window.visualViewport?.removeEventListener('resize', revealName);
      window.removeEventListener('resize', revealName);
      document.removeEventListener('focusin', revealName);
    };
  }, []);

  const selectImage = async () => {
    setMessage('');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setImage({ uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName });
  };

  const save = async () => {
    if (saving) return;
    Keyboard.dismiss();
    setSaving(true);
    setMessage('');
    try {
      const error = await updateProfile(nameDraft.current, image);
      if (error) { setMessage(error); return; }
      nameDraft.current = nameDraft.current.trim();
      nameEdited.current = false;
      setNameSeed({ userId: user?.id, value: nameDraft.current });
      setImage(null);
      setMessage('プロフィールを保存しました。');
    } catch {
      setMessage('プロフィールを保存できませんでした。通信状態を確認して、もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  const avatarUri = image?.uri ?? profile?.avatarUrl;
  const avatarInitial = nameSeed.value.trim().slice(0, 1) || '人';

  return (
    <View ref={formArea} style={styles.keyboardArea} onLayout={() => formArea.current?.measureInWindow((_left, top) => setKeyboardOffset(top))}>
    <KeyboardAvoidingView style={styles.keyboardArea} keyboardVerticalOffset={keyboardOffset} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen contentContainerStyle={styles.content}>
      {!user ? (
        <View style={styles.card}>
          <AppText variant="serif" style={styles.title}>ログインしてプロフィールをつくる</AppText>
          <AppText style={styles.lead}>表示名とプロフィール画像は、ログイン後に設定できます。</AppText>
          <Pressable accessibilityRole="button" onPress={() => router.push('/auth?mode=signin')} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <AppText style={styles.primaryText}>ログイン / アカウントを作成</AppText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.avatarArea}>
            <View style={styles.avatar}>
              {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} accessibilityLabel="プロフィール画像" /> : <AppText style={styles.avatarText}>{avatarInitial}</AppText>}
            </View>
            <Pressable accessibilityRole="button" onPress={() => void selectImage()} style={({ pressed }) => [styles.imageButton, pressed && styles.pressed]}>
              <AppText style={styles.imageButtonText}>画像を変更</AppText>
            </Pressable>
          </View>

          <AppText style={styles.help}>選んだ画像と表示名はサーバーへ保存します。画像は非公開の保存先で管理し、ログインした本人のプロフィール表示に使用します。</AppText>
          <Pressable accessibilityRole="button" onPress={() => router.push('/legal/privacy')} style={{ paddingVertical: 10 }}><AppText style={styles.help}>プロフィール情報の取扱いを確認する</AppText></Pressable>
          <AppText style={styles.label}>表示名</AppText>
          <TextInput
            ref={nameInput}
            key={`${nameSeed.userId}:${nameSeed.value}`}
            defaultValue={nameSeed.value}
            onChangeText={text => { nameDraft.current = text; nameEdited.current = true; }}
            onEndEditing={({ nativeEvent }) => { nameDraft.current = nativeEvent.text; }}
            accessibilityLabel="表示名"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="done"
            placeholder="表示名を入力"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <AppText style={styles.help}>24文字以内。マイページには、この名前だけが表示されます。</AppText>
          {message ? <AppText style={styles.message}>{message}</AppText> : null}
          <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={({ pressed }) => [styles.primary, saving && styles.disabled, pressed && styles.pressed]}>
            <AppText style={styles.primaryText}>{saving ? '保存中…' : 'プロフィールを保存'}</AppText>
          </Pressable>
        </View>
      )}
    </Screen>
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardArea: { flex: 1 },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center' },
  card: { marginTop: spacing.lg, padding: spacing.xl, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card },
  title: { color: colors.ink, fontSize: 23, lineHeight: 33, fontWeight: '700' },
  lead: { marginTop: 8, color: colors.muted, fontSize: 13, lineHeight: 21 },
  avatarArea: { alignItems: 'center', marginBottom: spacing.xl },
  avatar: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.charcoal },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 34, lineHeight: 42 },
  imageButton: { minHeight: 42, marginTop: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: '#D7C6AB', borderRadius: radius.pill, justifyContent: 'center' },
  imageButtonText: { color: '#81622A', fontSize: 13, lineHeight: 19, fontWeight: '700' },
  label: { color: colors.ink, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  input: { minHeight: 56, marginTop: 8, paddingHorizontal: spacing.md, paddingVertical: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.white, color: colors.ink, fontSize: 18, lineHeight: 26 },
  help: { marginTop: 7, color: colors.muted, fontSize: 12, lineHeight: 19 },
  message: { marginTop: spacing.md, color: colors.inkSoft, fontSize: 12, lineHeight: 19 },
  primary: { minHeight: 52, marginTop: spacing.lg, borderRadius: radius.sm, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.72 },
});
