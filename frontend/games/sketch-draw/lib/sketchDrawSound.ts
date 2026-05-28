import { patchCoreSession, readCoreSession } from '@/lib/session/core-session';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

export function isSketchDrawSfxMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return readCoreSession()?.prefs.sketchMuted ?? false;
}

export function setSketchDrawSfxMuted(muted: boolean) {
  patchCoreSession({ prefs: { sketchMuted: muted } });
}

export function toggleSketchDrawSfxMuted(): boolean {
  const next = !isSketchDrawSfxMuted();
  setSketchDrawSfxMuted(next);
  return next;
}

export function unlockSketchDrawAudio() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
}

function playTone(
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType,
  peak: number,
  ramp?: { endFreq?: number; filterHz?: number }
) {
  const ctx = getAudioContext();
  if (!ctx || isSketchDrawSfxMuted()) return;
  if (ctx.state === 'suspended') void ctx.resume();

  const now = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (ramp?.endFreq) {
    osc.frequency.exponentialRampToValueAtTime(ramp.endFreq, now + duration);
  }

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(ramp?.filterHz ?? 2800, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.03);
}

/** Soft two-note “you got it!” */
export function playSketchCorrectGuessSound() {
  unlockSketchDrawAudio();
  playTone(523.25, 0, 0.12, 'sine', 0.16);
  playTone(659.25, 0.08, 0.14, 'sine', 0.18);
  playTone(783.99, 0.16, 0.22, 'triangle', 0.14, { endFreq: 1046.5, filterHz: 3200 });
}

/** Half-minute warning — gentle bell */
export function playSketchTimer30Sound() {
  unlockSketchDrawAudio();
  playTone(440, 0, 0.2, 'sine', 0.1, { endFreq: 330, filterHz: 2000 });
  playTone(554.37, 0.12, 0.18, 'sine', 0.08);
}

/** Quarter-minute — slightly brighter */
export function playSketchTimer15Sound() {
  unlockSketchDrawAudio();
  playTone(587.33, 0, 0.16, 'triangle', 0.12);
  playTone(698.46, 0.1, 0.2, 'sine', 0.1, { endFreq: 523.25 });
}

/** Final seconds — urgent ticks (5 down to 1) */
export function playSketchCountdownTickSound(secondsLeft: number) {
  unlockSketchDrawAudio();
  const base = 660 + (6 - secondsLeft) * 55;
  const peak = 0.08 + (6 - secondsLeft) * 0.025;
  playTone(base, 0, 0.07, 'square', Math.min(peak, 0.2), {
    endFreq: base * 0.7,
    filterHz: 1800 + secondsLeft * 200,
  });
  if (secondsLeft <= 3) {
    playTone(base * 1.5, 0.04, 0.05, 'sine', peak * 0.6);
  }
}

/** Match complete fanfare */
export function playSketchMatchEndSound() {
  unlockSketchDrawAudio();
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    playTone(freq, i * 0.1, 0.28, i < 3 ? 'sine' : 'triangle', 0.12 - i * 0.01, {
      filterHz: 3600,
    });
  });
  playTone(1318.51, 0.42, 0.35, 'sine', 0.1, { endFreq: 1567.98 });
}

/** Own guess submitted — subtle click */
export function playSketchGuessSendSound() {
  unlockSketchDrawAudio();
  playTone(320, 0, 0.05, 'triangle', 0.06, { endFreq: 480, filterHz: 2400 });
}
