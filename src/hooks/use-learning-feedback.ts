import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLearningAudio } from './use-learning-audio';

export type LearningCue = 'start' | 'tick' | 'correct' | 'incorrect' | 'timeout';
const SOUND_KEY = '@shoseijutsu-roku/learning-sound/v1';

export function useLearningFeedback() {
  const { playCue: playAudio, stopSounds } = useLearningAudio();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundReady, setSoundReady] = useState(false);
  const enabled = useRef(false);
  const changed = useRef(false);

  useEffect(() => {
    let active = true;
    const fallback = setTimeout(() => {
      if (active && !changed.current) { enabled.current = true; setSoundReady(true); }
    }, 900);
    void AsyncStorage.getItem(SOUND_KEY).then((stored) => {
      if (!active || changed.current) return;
      enabled.current = stored !== 'off';
      setSoundEnabled(enabled.current);
      setSoundReady(true);
      if (!enabled.current) stopSounds();
    }).catch(() => {
      if (active && !changed.current) { enabled.current = true; setSoundReady(true); }
    }).finally(() => clearTimeout(fallback));
    return () => { active = false; clearTimeout(fallback); stopSounds(); };
  }, [stopSounds]);

  const playCue = useCallback((cue: LearningCue) => {
    if (!enabled.current) return;
    playAudio(cue);
  }, [playAudio]);

  const toggleSound = useCallback(() => {
    changed.current = true;
    setSoundReady(true);
    enabled.current = !soundEnabled;
    setSoundEnabled(enabled.current);
    void AsyncStorage.setItem(SOUND_KEY, enabled.current ? 'on' : 'off').catch(() => undefined);
    if (enabled.current) playCue('start');
    else stopSounds();
  }, [soundEnabled, playCue, stopSounds]);

  return { soundReady, soundEnabled, toggleSound, playCue, stopSounds };
}
