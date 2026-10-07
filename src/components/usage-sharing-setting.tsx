import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from './ui';
import { colors } from '@/constants/theme';
import { isUsageSharingEnabled, setUsageSharingEnabled } from '@/lib/usage-consent';

export function UsageSharingSetting() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { let active = true; void isUsageSharingEnabled().then(value => { if (active) { setEnabled(value); setReady(true); } }); return () => { active = false; }; }, []);
  const change = async (value: boolean) => {
    setSaving(true); setMessage('');
    try { await setUsageSharingEnabled(value); setEnabled(value); }
    catch { setEnabled(await isUsageSharingEnabled()); setMessage('設定を保存できませんでした。端末の保存領域を確認してください。'); }
    finally { setSaving(false); }
  };
  return <View style={styles.root}>
    <View style={styles.row}><AppText style={styles.title}>利用状況の送信</AppText><Switch accessibilityLabel="利用状況の送信" value={enabled} disabled={!ready || saving} onValueChange={value => void change(value)} trackColor={{ true: colors.gold, false: colors.line }} /></View>
    <AppText style={styles.description}>任意です。閲覧・保存した項目のIDと日時、集計用識別子を人気ランキングの集計に送ります。ログイン中はアカウントと関連する場合があります。オフでも購入・閲覧・学習を利用できます。</AppText>
    <Pressable accessibilityRole="button" onPress={() => router.push('/legal/privacy')} style={styles.link}><AppText style={styles.linkText}>送信する情報・停止・削除について</AppText></Pressable>
    {message ? <AppText accessibilityRole="alert" style={styles.description}>{message}</AppText> : null}
  </View>;
}
const styles = StyleSheet.create({
  root: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E5E5E3' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  title: { color: colors.inkSoft, fontSize: 16, lineHeight: 25, flex: 1 },
  description: { marginTop: 8, fontSize: 12, lineHeight: 19, color: colors.muted },
  link: { alignSelf: 'flex-start', paddingVertical: 10 }, linkText: { fontSize: 12, color: colors.goldDeep, textDecorationLine: 'underline' },
});
