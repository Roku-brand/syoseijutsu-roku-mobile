import { Asset } from 'expo-asset';
import { useCallback, useEffect, useRef } from 'react';
import type { LearningCue } from './use-learning-feedback';

const sources = {
  start: require('../../assets/audio/learning-start.wav'),
  tick: require('../../assets/audio/learning-tick.wav'),
  correct: require('../../assets/audio/learning-correct.wav'),
  incorrect: require('../../assets/audio/learning-incorrect.wav'),
  timeout: require('../../assets/audio/learning-timeout.wav'),
};

export function useLearningAudio() {
  const players = useRef<Partial<Record<LearningCue, HTMLAudioElement>>>({});
  const stopSounds = useCallback(() => {
    for (const player of Object.values(players.current)) player?.pause();
  }, []);
  useEffect(() => {
    for (const cue of Object.keys(sources) as LearningCue[]) {
      const player = new Audio(Asset.fromModule(sources[cue]).uri);
      player.preload = 'auto';
      players.current[cue] = player;
    }
    return () => {
      stopSounds();
      for (const player of Object.values(players.current)) {
        player?.removeAttribute('src');
        player?.load();
      }
      players.current = {};
    };
  }, [stopSounds]);
  const playCue = useCallback((cue: LearningCue) => {
    const player = players.current[cue];
    if (!player) return;
    stopSounds();
    try {
      player.currentTime = 0;
      player.volume = cue === 'tick' ? 0.22 : 0.4;
      // Calling play synchronously preserves the answer/toggle's user gesture.
      // Autoplay restrictions or missing audio devices leave the quiz usable.
      void player.play().catch(() => undefined);
    } catch { /* Audio must never block answering. */ }
  }, [stopSounds]);
  return { playCue, stopSounds };
}
