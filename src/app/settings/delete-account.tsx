import { useState } from 'react';
import { Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppText, PrimaryButton, Screen } from '@/components/ui';
import { useAuth } from '@/auth/auth-state';
import { useAppState } from '@/state/app-state';
import { supabase } from '@/lib/supabase';
import { purchaseTimeout } from '@/lib/purchase-timeout';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { clearPersonalData } = useAppState();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function remove() {
    setBusy(true); setMessage('');
    try {
      if (!supabase) throw new Error('アカウント機能が未設定です。');
      const result = await purchaseTimeout(supabase.functions.invoke('delete-account', { body: { password, confirmation: 'DELETE' } }), 20000,
        '削除処理の結果を確認できませんでした。通信が戻ってからログイン状態を確認してください。');
      if (result?.error || result?.data?.deleted !== true) throw new Error('削除できませんでした。パスワードと通信状態を確認して再試行してください。');
      setPassword('');
      await signOut();
      await clearPersonalData();
      const keys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(keys.filter(key => key.startsWith('@shoseijutsu-roku/')));
      router.replace('/welcome');
    } catch (error) { setMessage(error instanceof Error ? error.message : '削除できませんでした。'); }
    finally { setBusy(false); }
  }
  return <Screen contentContainerStyle={{ padding: 24, gap: 20 }}>
    <AppText variant="title">アカウントを削除</AppText>
    <AppText>アカウント、プロフィール画像、このアカウントに紐づく利用データと完全版の利用権を削除します。元に戻せません。同じメールアドレスで登録し直しても、削除した購入権限は復元されません。</AppText>
    <AppText>アカウントの削除は返金手続きではありません。Appleへの返金申請はAppleの購入履歴から行ってください。法令上必要な取引記録、決済事業者の記録は保持する場合があります。</AppText>
    {user ? <><TextInput accessibilityLabel="確認用パスワード" placeholder="現在のパスワード" secureTextEntry autoCapitalize="none" value={password} onChangeText={setPassword} style={{ borderWidth: 1, padding: 14 }} />
      <PrimaryButton disabled={busy || !password} onPress={() => Alert.alert('アカウントを削除しますか？', '残りの完全版利用期間も失われます。この操作は取り消せません。', [{ text: 'キャンセル', style: 'cancel' }, { text: '完全に削除', style: 'destructive', onPress: () => void remove() }])}>{busy ? '削除中…' : 'アカウントを完全に削除'}</PrimaryButton></> : <AppText>削除するアカウントでログインしてください。</AppText>}
    {message ? <AppText accessibilityRole="alert">{message}</AppText> : null}
  </Screen>;
}
