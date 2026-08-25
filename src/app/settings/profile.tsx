import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useAuth, type ProfileImageUpload } from '@/auth/auth-state';
import { AppText, DetailHeader, Screen } from '@/components/ui';
import { colors, fonts, radius, shadow, spacing } from '@/constants/theme';

function suggestedName(email?: string | null) {
  return email?.split('@')[0] || 'ユーザー';
}

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { user, profile, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? suggestedName(user?.email));
  const [image, setImage] = useState<ProfileImageUpload | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.displayName ?? suggestedName(user?.email));
  }, [profile?.displayName, user?.email]);

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
    setSaving(true);
    setMessage('');
    const error = await updateProfile(displayName, image);
    setSaving(false);
    if (error) {
      setMessage(error);
      return;
    }
    setImage(null);
    setMessage('プロフィールを保存しました。');
  };

  const avatarUri = image?.uri ?? profile?.avatarUrl;
  const avatarInitial = displayName.trim().slice(0, 1) || '人';

  return (
    <Screen contentContainerStyle={styles.content}>
      <DetailHeader title="プロフィール" />
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

          <AppText style={styles.label}>表示名</AppText>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={24}
            placeholder="表示名を入力"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <AppText style={styles.help}>マイページには、この名前だけが表示されます。</AppText>
          {message ? <AppText style={styles.message}>{message}</AppText> : null}
          <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={({ pressed }) => [styles.primary, saving && styles.disabled, pressed && styles.pressed]}>
            <AppText style={styles.primaryText}>{saving ? '保存中…' : 'プロフィールを保存'}</AppText>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  input: { minHeight: 52, marginTop: 8, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.white, color: colors.ink, fontSize: 16 },
  help: { marginTop: 7, color: colors.muted, fontSize: 12, lineHeight: 19 },
  message: { marginTop: spacing.md, color: colors.inkSoft, fontSize: 12, lineHeight: 19 },
  primary: { minHeight: 52, marginTop: spacing.lg, borderRadius: radius.sm, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.72 },
});
