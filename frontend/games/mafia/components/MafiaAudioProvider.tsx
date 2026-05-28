'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import type { MafiaPhase } from '../types';

interface MafiaAudioProviderProps {
  phase: MafiaPhase | undefined;
  deathCount: number;
  children: ReactNode;
}

function playTone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.04
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(ctx.destination);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration);
}

function phaseCue(ctx: AudioContext, phase: MafiaPhase) {
  if (phase === 'night') {
    playTone(ctx, 110, 0.5, 'triangle', 0.03);
    playTone(ctx, 82, 0.7, 'sine', 0.025);
  } else if (phase === 'day' || phase === 'morning') {
    playTone(ctx, 196, 0.25, 'sine', 0.035);
    playTone(ctx, 262, 0.35, 'sine', 0.03);
  } else if (phase === 'match_over') {
    playTone(ctx, 98, 0.9, 'triangle', 0.04);
  }
}

export default function MafiaAudioProvider({
  phase,
  deathCount,
  children,
}: MafiaAudioProviderProps) {
  const ctxRef = useRef<AudioContext | null>(null);
  const lastPhase = useRef<MafiaPhase | undefined>(undefined);
  const lastDeaths = useRef(0);

  useEffect(() => {
    if (!phase || phase === lastPhase.current) return;
    lastPhase.current = phase;
    try {
      const ctx = ctxRef.current ?? new AudioContext();
      ctxRef.current = ctx;
      if (ctx.state === 'suspended') void ctx.resume();
      phaseCue(ctx, phase);
    } catch {
      /* audio optional */
    }
  }, [phase]);

  useEffect(() => {
    if (deathCount <= lastDeaths.current) return;
    lastDeaths.current = deathCount;
    try {
      const ctx = ctxRef.current ?? new AudioContext();
      ctxRef.current = ctx;
      if (ctx.state === 'suspended') void ctx.resume();
      playTone(ctx, 73, 0.6, 'sawtooth', 0.025);
      playTone(ctx, 55, 0.8, 'triangle', 0.02);
    } catch {
      /* audio optional */
    }
  }, [deathCount]);

  return <>{children}</>;
}
