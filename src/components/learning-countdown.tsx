import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './ui';
import { colors, fonts } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { LEARNING_SECONDS } from '@/hooks/use-learning-round';

export function LearningCountdown({ seconds, paused, soundEnabled, toggleSound }: {
  seconds: number; paused: boolean; soundEnabled: boolean; toggleSound: () => void;
}) {
  const urgent = seconds <= 10;
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
        <AppText style={styles.label}>60秒の判断チャレンジ</AppText>
        <AppText style={[styles.hint, urgent && styles.urgentInk]}>{paused ? '一時停止中' : urgent ? 'あと少し。あなたなら、どう動く？' : 'その場にいるつもりで、選んでみよう。'}</AppText>
      </View>
      <Animated.View style={{ opacity: pulse }}>
        <AppText accessibilityLabel={`残り${seconds}秒`} testID="learning-seconds" style={[styles.time, urgent && styles.urgentInk]}>{String(seconds).padStart(2, '0')}<AppText style={styles.unit}> 秒</AppText></AppText>
      </Animated.View>
      <Pressable accessibilityRole="switch" accessibilityLabel="効果音" accessibilityState={{ checked: soundEnabled }} onPress={toggleSound} testID="learning-sound-toggle" style={styles.sound}>
        <AppText style={styles.soundText}>SE {soundEnabled ? 'ON' : 'OFF'}</AppText>
      </Pressable>
    </View>
    <View accessibilityRole="progressbar" accessibilityLabel="回答の残り時間" accessibilityValue={{ min: 0, max: LEARNING_SECONDS, now: seconds }} style={styles.track}>
      <View style={[styles.fill, urgent && styles.urgentFill, { width: `${seconds / LEARNING_SECONDS * 100}%` }]} />
    </View>
    <AppText accessibilityLiveRegion="polite" style={styles.announcement}>{seconds <= 10 ? '残り10秒です。' : ''}</AppText>
  </View>;
}

const styles = StyleSheet.create({
  panel: { marginBottom: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#DDCBA9', backgroundColor: '#F8F1E1' },
  urgent: { backgroundColor: '#FFF0E9', borderColor: '#CA6748' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  copy: { flex: 1, minWidth: 0 },
  label: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 12, lineHeight: 19, fontWeight: '700' },
  hint: { color: colors.inkSoft, fontFamily: fonts.sans, fontSize: 10, lineHeight: 16 },
  time: { color: colors.ink, fontFamily: fonts.sans, fontSize: 32, lineHeight: 40, fontWeight: '800', fontVariant: ['tabular-nums'] },
  unit: { fontSize: 11 },
  urgentInk: { color: '#AC3B20' },
  sound: { minWidth: 54, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C9B991', borderRadius: 22, backgroundColor: colors.surface },
  soundText: { color: colors.inkSoft, fontSize: 10, fontWeight: '700' },
  track: { marginTop: 10, height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: '#E5D9C2' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: '#B98520' },
  urgentFill: { backgroundColor: '#CA6748' },
  announcement: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
