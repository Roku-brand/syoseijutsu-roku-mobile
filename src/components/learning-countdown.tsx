import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './ui';
import { colors, fonts, radius } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export function LearningCountdown({ seconds, paused, soundEnabled, toggleSound }: {
  seconds: number; paused: boolean; soundEnabled: boolean; toggleSound: () => void;
}) {
  const urgent = seconds <= 10;
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
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

  return <View style={styles.controls} testID="learning-countdown">
    <View style={styles.row}>
      <Animated.View style={[styles.clock, urgent && styles.urgent, { opacity: pulse }]}>
        <View aria-hidden accessibilityElementsHidden style={[styles.clockFace, urgent && styles.urgentFace]}>
          <View style={[styles.hourHand, urgent && styles.urgentHand]} />
          <View style={[styles.minuteHand, urgent && styles.urgentHand]} />
        </View>
        <AppText accessibilityLabel={`残り${seconds}秒`} testID="learning-seconds" style={[styles.time, urgent && styles.urgentInk]}>{time}</AppText>
      </Animated.View>
      <Pressable accessibilityRole="switch" accessibilityLabel="効果音" accessibilityState={{ checked: soundEnabled }} onPress={toggleSound} hitSlop={6} testID="learning-sound-toggle" style={styles.sound}>
        <AppText style={styles.soundText}>SE {soundEnabled ? 'ON' : 'OFF'}</AppText>
      </Pressable>
    </View>
    {paused ? <AppText style={styles.paused}>一時停止中</AppText> : null}
    <AppText accessibilityLiveRegion="polite" style={styles.announcement}>{urgent ? '残り10秒です。' : ''}</AppText>
  </View>;
}

const styles = StyleSheet.create({
  controls: { flexShrink: 0, alignItems: 'flex-end' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clock: { minHeight: 32, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.goldSoft, backgroundColor: colors.paperDeep },
  clockFace: { width: 14, height: 14, borderWidth: 1.2, borderRadius: 7, borderColor: colors.goldDeep },
  hourHand: { position: 'absolute', left: 5, top: 2, width: 1.2, height: 4, backgroundColor: colors.goldDeep },
  minuteHand: { position: 'absolute', left: 5, top: 5, width: 3.5, height: 1.2, backgroundColor: colors.goldDeep },
  time: { color: colors.ink, fontFamily: fonts.sans, fontSize: 15, lineHeight: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  urgent: { backgroundColor: '#FFF0E9', borderColor: '#CA6748' },
  urgentFace: { borderColor: colors.danger },
  urgentHand: { backgroundColor: colors.danger },
  urgentInk: { color: colors.danger },
  sound: { minWidth: 44, minHeight: 32, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.surface },
  soundText: { color: colors.inkSoft, fontSize: 10, fontWeight: '700' },
  paused: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 3 },
  announcement: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
