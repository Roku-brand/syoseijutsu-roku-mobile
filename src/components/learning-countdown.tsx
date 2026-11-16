import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import { AppText } from './ui';
import { colors, fonts } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { LEARNING_SECONDS } from '@/hooks/use-learning-round';

export function LearningCountdown({ seconds, paused, soundEnabled, toggleSound, unlimited = false, started = true, onStart, startDisabled = false, onUnlimitedChange }: {
  seconds: number; paused: boolean; soundEnabled: boolean; toggleSound: () => void; unlimited?: boolean; started?: boolean; onStart?: () => void; startDisabled?: boolean; onUnlimitedChange?: (value: boolean) => void;
}) {
  const urgent = started && !unlimited && seconds <= 10;
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!urgent || paused || reduced) { pulse.setValue(1); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.55, duration: 450, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]));
    animation.start();
    return () => { animation.stop(); pulse.setValue(1); };
  }, [urgent, paused, reduced, pulse]);

  return <View style={[styles.panel, urgent && styles.urgent]} testID="learning-countdown">
    <View style={styles.row}>
      <View style={styles.copy}>
        <AppText style={styles.label}>{unlimited ? '練習モード・時間制限なし' : '60秒の判断チャレンジ'}</AppText>
        <AppText style={[styles.hint, urgent && styles.urgentInk]}>{!started ? '問題を確認してから、開始してください。' : paused ? '一時停止中' : urgent ? 'あと少し。あなたなら、どう動く？' : 'その場にいるつもりで、選んでみよう。'}</AppText>
      </View>
      {!unlimited ? <Animated.View style={{ opacity: pulse }}>
        <AppText accessibilityLabel={`残り${seconds}秒`} testID="learning-seconds" style={[styles.time, urgent && styles.urgentInk]}>{String(seconds).padStart(2, '0')}<AppText style={styles.unit}> 秒</AppText></AppText>
      </Animated.View> : null}
      <Pressable accessibilityRole="switch" accessibilityLabel="効果音" accessibilityState={{ checked: soundEnabled }} onPress={toggleSound} testID="learning-sound-toggle" style={styles.sound}>
        <AppText style={styles.soundText}>SE {soundEnabled ? 'ON' : 'OFF'}</AppText>
      </Pressable>
    </View>
    {!unlimited ? <View accessibilityRole="progressbar" accessibilityLabel="回答の残り時間" accessibilityValue={{ min: 0, max: LEARNING_SECONDS, now: seconds }} style={styles.track}>
      <View style={[styles.fill, urgent && styles.urgentFill, { width: `${seconds / LEARNING_SECONDS * 100}%` }]} />
    </View> : null}
    {onUnlimitedChange ? <View style={styles.practiceMode}><AppText style={styles.modeLabel}>時間制限なし</AppText><Switch accessibilityLabel="このケースを時間制限なしで練習する" {...(Platform.OS === 'web' ? { activeThumbColor: colors.surface } : {})} value={unlimited} onValueChange={onUnlimitedChange} trackColor={{ false: colors.line, true: colors.gold }} thumbColor={colors.surface} /></View> : null}
    {!started && onStart ? <Pressable testID="learning-start" accessibilityRole="button" accessibilityLabel={unlimited ? '練習をはじめる' : '60秒で挑戦する'} disabled={startDisabled} onPress={onStart} style={({ pressed }) => [styles.start, startDisabled && { opacity: .6 }, pressed && { opacity: .8 }]}><AppText style={styles.startText}>{unlimited ? '練習をはじめる' : '60秒で挑戦する'}　→</AppText></Pressable> : null}
    <AppText accessibilityLiveRegion="polite" style={styles.announcement}>{urgent ? '残り10秒です。' : ''}</AppText>
  </View>;
}

const styles = StyleSheet.create({
  practiceMode: { marginTop: 8, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, modeLabel: { color: colors.inkSoft, fontSize: 13 },
  start: { minHeight: 48, marginTop: 6, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold }, startText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  panel: { marginBottom: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#DDCBA9', backgroundColor: '#F8F1E1' },
  urgent: { backgroundColor: '#FFF0E9', borderColor: '#CA6748' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  copy: { flex: 1, minWidth: 0 },
  label: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 12, lineHeight: 19, fontWeight: '700' },
  hint: { color: colors.inkSoft, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20 },
  time: { color: colors.ink, fontFamily: fonts.sans, fontSize: 32, lineHeight: 40, fontWeight: '800', fontVariant: ['tabular-nums'] },
  unit: { fontSize: 12 },
  urgentInk: { color: '#AC3B20' },
  sound: { minWidth: 54, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C9B991', borderRadius: 22, backgroundColor: colors.surface },
  soundText: { color: colors.inkSoft, fontSize: 12, fontWeight: '700' },
  track: { marginTop: 10, height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: '#E5D9C2' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: '#B98520' },
  urgentFill: { backgroundColor: '#CA6748' },
  announcement: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
