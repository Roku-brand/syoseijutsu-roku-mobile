import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';
import type { LearningCue } from './use-learning-feedback';

export function useLearningAudio() {
  const start = useAudioPlayer(require('../../assets/audio/learning-start.wav'));
  const tick = useAudioPlayer(require('../../assets/audio/learning-tick.wav'));
  const correct = useAudioPlayer(require('../../assets/audio/learning-correct.wav'));
  const incorrect = useAudioPlayer(require('../../assets/audio/learning-incorrect.wav'));
  const timeout = useAudioPlayer(require('../../assets/audio/learning-timeout.wav'));
  const players = useRef({ start, tick, correct, incorrect, timeout });
  players.current = { start, tick, correct, incorrect, timeout };
  const generation = useRef(0);
  const stopSounds = useCallback(() => {
    generation.current += 1;
    for (const player of Object.values(players.current)) {
      try { player.pause(); } catch { /* The player may already have been released. */ }
    }
  }, []);
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
    return stopSounds;
  }, [stopSounds]);
  const playCue = useCallback((cue: LearningCue) => {
    stopSounds();
    const token = generation.current;
    const player = players.current[cue];
    try {
      player.volume = cue === 'tick' ? 0.22 : 0.4;
      void player.seekTo(0).then(() => {
        if (generation.current === token) player.play();
      }).catch(() => undefined);
    } catch { /* Audio must never block answering. */ }
  }, [stopSounds]);
  return { playCue, stopSounds };
}
