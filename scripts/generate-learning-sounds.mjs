// Original, short synthesized cues. No external audio or runtime network request.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../assets/audio/', import.meta.url));
mkdirSync(directory, { recursive: true });
const sampleRate = 22050;
const cues = {
  start: [[0, 523.25, 0.12], [0.12, 783.99, 0.19]],
  tick: [[0, 880, 0.065]],
  correct: [[0, 659.25, 0.13], [0.11, 783.99, 0.13], [0.22, 1046.5, 0.32]],
  incorrect: [[0, 392, 0.16], [0.16, 329.63, 0.24]],
  timeout: [[0, 440, 0.13], [0.19, 440, 0.13], [0.38, 293.66, 0.31]],
};
for (const [name, notes] of Object.entries(cues)) {
  const duration = Math.max(...notes.map(([start, , length]) => start + length)) + 0.04;
  const samples = Math.ceil(duration * sampleRate);
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
  wav.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i += 1) {
    const time = i / sampleRate;
    let value = 0;
    for (const [start, frequency, length] of notes) {
      const t = time - start;
      if (t < 0 || t > length) continue;
      const envelope = Math.min(1, t / 0.006, (length - t) / 0.035) * Math.exp(-t * 3);
      value += Math.sin(2 * Math.PI * frequency * t) * envelope * 0.42;
    }
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), 44 + i * 2);
  }
  writeFileSync(`${directory}/learning-${name}.wav`, wav);
}
