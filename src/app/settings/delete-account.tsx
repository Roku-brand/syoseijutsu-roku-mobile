import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppText, PrimaryButton, Screen } from '@/components/ui';
import { useAuth } from '@/auth/auth-state';
import { useAppState } from '@/state/app-state';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';
import { purchaseTimeout } from '@/lib/purchase-timeout';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { clearPersonalData } = useAppState();
  const [password, setPassword] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function remove() {
    setConfirming(false); setBusy(true); setMessage('');
    let deletionConfirmed = false;
    try {
      if (!supabase) throw new Error('アカウント機能が未設定です。');
      const result = await purchaseTimeout(supabase.functions.invoke('delete-account', { body: { password, confirmation: 'DELETE' } }), 20000,
        '削除処理の結果を確認できませんでした。通信が戻ってからログイン状態を確認してください。');
      if (result.error || result.data?.deleted !== true) throw new Error('削除できませんでした。パスワードと通信状態を確認して再試行してください。');
      deletionConfirmed = true;
      setPassword('');
      await signOut();
      await clearPersonalData();
      const keys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(keys.filter(key => key.startsWith('@shoseijutsu-roku/')));
      router.replace('/welcome');
    } catch (error) { setMessage(deletionConfirmed
      ? 'アカウントの削除は完了しましたが、この端末のデータ消去を完了できませんでした。設定の「端末内データをすべて消去」もお試しください。'
      : error instanceof Error ? error.message : '削除できませんでした。'); }
    finally { setBusy(false); }
  }
  return <Screen contentContainerStyle={styles.content}>
    <AppText variant="title">アカウントを削除</AppText>
    <AppText>アカウント、プロフィール画像、関連する利用データと完全版の利用権を削除します。元に戻せません。同じメールアドレスで登録し直しても、元の購入権限は復元されません。</AppText>
    <AppText>アカウント削除は返金手続きではありません。Apple購入の返金はAppleの手続き、Web購入の問題はお問い合わせ窓口をご利用ください。決済事業者の記録や法令上必要な情報は残る場合があります。</AppText>
    {user ? <>
      <TextInput accessibilityLabel="確認用パスワード" placeholder="現在のパスワード" secureTextEntry autoCapitalize="none" value={password} onChangeText={setPassword} style={styles.input} />
      <PrimaryButton disabled={busy || !password} onPress={() => setConfirming(true)}>{busy ? '削除中…' : 'アカウントを完全に削除'}</PrimaryButton>
    </> : <AppText>削除するアカウントでログインしてください。</AppText>}
    <Pressable accessibilityRole="button" onPress={() => router.push('/legal/privacy')}><AppText style={styles.link}>削除・お問い合わせの取扱い</AppText></Pressable>
    {message ? <AppText accessibilityRole="alert">{message}</AppText> : null}
    <Modal visible={confirming} transparent animationType="fade" onRequestClose={() => setConfirming(false)}>
      <View style={styles.backdrop}><View style={styles.dialog}>
        <AppText variant="serif">アカウントを削除しますか？</AppText>
        <AppText>残りの完全版利用期間も失われます。この操作は取り消せません。</AppText>
        <PrimaryButton onPress={() => void remove()}>完全に削除</PrimaryButton>
        <Pressable accessibilityRole="button" onPress={() => setConfirming(false)} style={styles.cancel}><AppText>キャンセル</AppText></Pressable>
      </View></View>
    </Modal>
  </Screen>;
}
const styles = StyleSheet.create({
  content: { padding: 24, gap: 20, maxWidth: 660, width: '100%', alignSelf: 'center' },
  input: { borderWidth: 1, borderColor: colors.line, padding: 14, borderRadius: 8 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.55)' },
  dialog: { width: '100%', maxWidth: 440, padding: 24, gap: 20, borderRadius: 16, backgroundColor: colors.paper },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, link: { color: colors.goldDeep, textDecorationLine: 'underline' },
});
