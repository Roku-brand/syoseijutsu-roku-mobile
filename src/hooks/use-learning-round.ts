import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { LearningCue } from './use-learning-feedback';

export const LEARNING_SECONDS = 60;
type Round = { key: string; milliseconds: number; deadline: number | null; ended: boolean; started: boolean; lastSecond: number };

export function useLearningRound(key: string, enabled: boolean, playCue: (cue: LearningCue) => void, stopSounds: () => void) {
  const round = useRef<Round>({ key: '', milliseconds: 60_000, deadline: null, ended: false, started: false, lastSecond: 60 });
  const cues = useRef({ playCue, stopSounds });
  cues.current = { playCue, stopSounds };
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(true);
  const [display, setDisplay] = useState({ key: '', seconds: LEARNING_SECONDS, timedOut: false });

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => { setFocused(false); cues.current.stopSounds(); };
  }, []));

  useEffect(() => {
    if (Platform.OS === 'web') {
      const update = () => { setForeground(!document.hidden); if (document.hidden) cues.current.stopSounds(); };
      update();
      document.addEventListener('visibilitychange', update);
      return () => document.removeEventListener('visibilitychange', update);
    }
    setForeground(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (state) => {
      setForeground(state === 'active');
      if (state !== 'active') cues.current.stopSounds();
    });
    return () => subscription.remove();
  }, []);

  const expire = useCallback(() => {
    const current = round.current;
    if (current.ended) return;
    current.ended = true;
    current.deadline = null;
    current.milliseconds = 0;
    setDisplay({ key: current.key, seconds: 0, timedOut: true });
    cues.current.playCue('timeout');
  }, []);

  useEffect(() => {
    if (round.current.key !== key) {
      round.current = { key, milliseconds: 60_000, deadline: null, ended: false, started: false, lastSecond: 60 };
      setDisplay({ key, seconds: LEARNING_SECONDS, timedOut: false });
    }
    const current = round.current;
    if (!key || !enabled || !focused || !foreground || current.ended) return;
    current.deadline = Date.now() + current.milliseconds;
    if (!current.started) { current.started = true; cues.current.playCue('start'); }
    const update = () => {
      if (current.ended || current.deadline === null) return;
      current.milliseconds = Math.max(0, current.deadline - Date.now());
      const seconds = Math.ceil(current.milliseconds / 1000);
      if (seconds === 0) { expire(); return; }
      if (seconds !== current.lastSecond) {
        current.lastSecond = seconds;
        setDisplay({ key, seconds, timedOut: false });
        if (seconds <= 10) cues.current.playCue('tick');
      }
    };
    const timer = setInterval(update, 100);
    return () => {
      clearInterval(timer);
      if (current.deadline !== null) current.milliseconds = Math.max(0, current.deadline - Date.now());
      current.deadline = null;
    };
  }, [key, enabled, focused, foreground, expire]);

  // Check the actual deadline inside the press handler, even between timer ticks.
  const finish = useCallback((correct: boolean) => {
    const current = round.current;
    if (current.key !== key || current.ended || !enabled || !focused || !foreground) return false;
    if (current.deadline !== null && Date.now() >= current.deadline) { expire(); return false; }
    current.ended = true;
    current.deadline = null;
    cues.current.playCue(correct ? 'correct' : 'incorrect');
    return true;
  }, [key, enabled, focused, foreground, expire]);

  const snapshot = display.key === key ? display : { seconds: LEARNING_SECONDS, timedOut: false };
  return { ...snapshot, paused: !focused || !foreground, finish };
}
