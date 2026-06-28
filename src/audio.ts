// Audio + haptics — fully crash-safe. Every call is wrapped so a missing native
// module (web, CI, or a stripped build) silently no-ops instead of throwing.
// Sounds are tiny procedurally-generated WAV tones embedded as base64 data URIs,
// so there are no binary asset files to bundle or path to break.
import { Platform } from 'react-native';

// expo-audio is the SDK 56 replacement for the deprecated expo-av (which no
// longer compiles — its EXAV.h imports the removed ExpoModulesCore/EXEventEmitter.h).
let ExpoAudio: any = null;
let Haptics: any = null;
try { ExpoAudio = require('expo-audio'); } catch (e) { ExpoAudio = null; }
try { Haptics = require('expo-haptics'); } catch (e) { Haptics = null; }

// ── WAV tone generator (PCM 16-bit mono) ─────────────────────────────────────
function toBase64(bytes: Uint8Array): string {
  // btoa exists on web; on native use Buffer if available, else manual.
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  if (typeof btoa === 'function') return btoa(bin);
  // @ts-ignore
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  return '';
}

function makeTone(freqs: number[], ms: number, decay = true, sampleRate = 22050): string {
  const n = Math.floor((sampleRate * ms) / 1000);
  const data = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let s = 0;
    for (const f of freqs) s += Math.sin(2 * Math.PI * f * t);
    s /= freqs.length;
    const env = decay ? Math.pow(1 - i / n, 2) : 1;
    data[i] = Math.max(-1, Math.min(1, s * env)) * 32767 * 0.6;
  }
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = data.length * bytesPerSample;
  const buf = new Uint8Array(44 + dataSize);
  const dv = new DataView(buf.buffer);
  const ws = (off: number, str: string) => { for (let i = 0; i < str.length; i++) dv.setUint8(off + i, str.charCodeAt(i)); };
  ws(0, 'RIFF'); dv.setUint32(4, 36 + dataSize, true); ws(8, 'WAVE');
  ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true); dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, byteRate, true); dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, 16, true); ws(36, 'data'); dv.setUint32(40, dataSize, true);
  for (let i = 0; i < data.length; i++) dv.setInt16(44 + i * 2, data[i], true);
  return 'data:audio/wav;base64,' + toBase64(buf);
}

const TONES = {
  pour:   makeTone([330], 90),
  merge:  makeTone([523, 784], 180),
  bank:   makeTone([659, 988, 1319], 260),
  win:    makeTone([523, 659, 784, 1047], 480),
  tap:    makeTone([220], 50),
  error:  makeTone([140], 120),
};
type SoundName = keyof typeof TONES;

let enabled = true;
let hapticsEnabled = true;
const pool: Record<string, any> = {};
let ready = false;

export async function initAudio() {
  if (!ExpoAudio || ready) return;
  try {
    // expo-audio exposes a module-level setAudioModeAsync (no Audio namespace).
    if (typeof ExpoAudio.setAudioModeAsync === 'function') {
      await ExpoAudio.setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
    }
    ready = true;
  } catch (e) { /* ignore */ }
}

export function setSoundEnabled(v: boolean) { enabled = v; }
export function setHapticsEnabled(v: boolean) { hapticsEnabled = v; }

export async function play(name: SoundName) {
  if (!enabled || !ExpoAudio) return;
  try {
    if (!ready) await initAudio();
    // createAudioPlayer(source) returns a player; play() starts it. Each call
    // is fire-and-forget — release shortly after the tone's duration.
    const player = ExpoAudio.createAudioPlayer({ uri: TONES[name] });
    player.volume = 0.7;
    player.play();
    setTimeout(() => { try { player.remove(); } catch (e) { /* ignore */ } }, 1200);
  } catch (e) { /* ignore */ }
}

export function haptic(kind: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (!hapticsEnabled || !Haptics || Platform.OS === 'web') return;
  try {
    if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (kind === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else if (kind === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) { /* ignore */ }
}
