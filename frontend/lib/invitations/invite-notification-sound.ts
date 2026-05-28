/** Short arcade-style chime when an invite toast arrives (Web Audio — no asset files). */

let audioCtx: AudioContext | null = null;
let lastPlayedAt = 0;
const MIN_INTERVAL_MS = 800;

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

/**
 * Pleasant rising three-note chime (C major arpeggio). Safe to call on every invite;
 * debounced so rapid duplicates do not stack harshly.
 */
export function playInviteReceivedSound(): void {
  const nowMs = Date.now();
  if (nowMs - lastPlayedAt < MIN_INTERVAL_MS) return;
  lastPlayedAt = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const t0 = ctx.currentTime;
    const notes = [
      { freq: 523.25, at: 0, dur: 0.22, peak: 0.14 },
      { freq: 659.25, at: 0.09, dur: 0.24, peak: 0.16 },
      { freq: 783.99, at: 0.18, dur: 0.32, peak: 0.18 },
      { freq: 1046.5, at: 0.28, dur: 0.4, peak: 0.12 },
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, t0 + note.at);

      const start = t0 + note.at;
      const end = start + note.dur;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(note.peak, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.05);
    }

    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(1318.51, t0 + 0.32);
    shimmerGain.gain.setValueAtTime(0.0001, t0 + 0.32);
    shimmerGain.gain.exponentialRampToValueAtTime(0.06, t0 + 0.36);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.62);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmer.start(t0 + 0.32);
    shimmer.stop(t0 + 0.65);
  } catch {
    /* autoplay policy or missing Web Audio */
  }
}

/** Call once after a user gesture so the first invite can play without blocking. */
export function unlockInviteAudio(): void {
  const ctx = getAudioContext();
  if (ctx?.state === 'suspended') {
    void ctx.resume();
  }
}
