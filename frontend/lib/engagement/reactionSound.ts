import { readCoreSession } from '@/lib/session/core-session';

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

/** Unlock audio after user gesture (ReactionBar, mute toggle, etc.). */
export function unlockReactionAudio(): void {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'suspended') return;
  void ctx.resume();
}

function isReactionAudioMuted(): boolean {
  if (typeof window === 'undefined') return true;
  const session = readCoreSession();
  return session?.prefs.audioMuted ?? false;
}

type SoundProfile = {
  freqStart: number;
  freqEnd: number;
  peak: number;
  duration: number;
  type: OscillatorType;
};

const SOUND_PROFILES: Record<string, SoundProfile> = {
  fire: { freqStart: 220, freqEnd: 880, peak: 0.16, duration: 0.12, type: 'sawtooth' },
  laugh: { freqStart: 520, freqEnd: 780, peak: 0.12, duration: 0.08, type: 'sine' },
  skull: { freqStart: 180, freqEnd: 90, peak: 0.14, duration: 0.18, type: 'triangle' },
  clap: { freqStart: 1200, freqEnd: 400, peak: 0.2, duration: 0.06, type: 'square' },
  heart: { freqStart: 440, freqEnd: 660, peak: 0.11, duration: 0.14, type: 'sine' },
  think: { freqStart: 330, freqEnd: 440, peak: 0.09, duration: 0.2, type: 'sine' },
  boom: { freqStart: 80, freqEnd: 40, peak: 0.22, duration: 0.16, type: 'sine' },
  goat: { freqStart: 300, freqEnd: 500, peak: 0.13, duration: 0.1, type: 'triangle' },
};

/**
 * Procedural ping for room sound reactions. Respects core session mute pref.
 */
export function triggerProceduralPing(soundKey: string): void {
  if (isReactionAudioMuted()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    void ctx.resume();
  }

  const profile = SOUND_PROFILES[soundKey] ?? SOUND_PROFILES.clap;
  const session = readCoreSession();
  const vol = session?.prefs.vol ?? 0.8;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = profile.type;
  osc.frequency.setValueAtTime(profile.freqStart, now);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(profile.freqEnd, 1),
    now + profile.duration,
  );

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2400, now);

  const peak = profile.peak * vol;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + profile.duration + 0.02);
}
