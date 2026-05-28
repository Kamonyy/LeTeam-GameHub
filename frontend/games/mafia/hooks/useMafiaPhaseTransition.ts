'use client';

import { useEffect, useRef, useState } from 'react';
import type { MafiaPhase } from '../types';

export const MAFIA_PHASE_TRANSITION_MS = 1200;

export type MafiaPhaseTransitionKind = 'role_reveal' | 'day' | 'night' | 'morning';

export interface MafiaPhaseTransitionView {
  key: string;
  phase: MafiaPhaseTransitionKind;
  label: string;
  icon: string;
}

export interface MafiaPhaseTransitionInput {
  phase: MafiaPhase;
  dayNumber: number;
  nightNumber: number;
}

/** Stable key for day / night / morning / role_reveal boundaries. */
export function mafiaPhaseTransitionKey(
  phase: MafiaPhase,
  dayNumber: number,
  nightNumber: number
): string | null {
  switch (phase) {
    case 'role_reveal':
      return 'role_reveal:0:0';
    case 'day':
      return `day:${dayNumber}:0`;
    case 'night':
      return `night:${dayNumber}:${nightNumber}`;
    case 'morning':
      return `morning:${dayNumber}:${nightNumber}`;
    default:
      return null;
  }
}

function transitionView(
  key: string,
  phase: MafiaPhaseTransitionKind,
  dayNumber: number,
  nightNumber: number
): MafiaPhaseTransitionView {
  switch (phase) {
    case 'role_reveal':
      return { key, phase, label: 'Role reveal', icon: '🎭' };
    case 'day':
    case 'morning':
      return { key, phase, label: 'Day', icon: '☀️' };
    case 'night':
      return { key, phase, label: 'Night', icon: '🌙' };
  }
}

function parseTransitionKind(key: string): MafiaPhaseTransitionKind | null {
  const kind = key.split(':')[0];
  if (
    kind === 'role_reveal' ||
    kind === 'day' ||
    kind === 'night' ||
    kind === 'morning'
  ) {
    return kind;
  }
  return null;
}

/** Fires a brief overlay payload when phase / day / night counters change in-game. */
export function useMafiaPhaseTransition(
  state: MafiaPhaseTransitionInput | null,
  active: boolean
): MafiaPhaseTransitionView | null {
  const prevKeyRef = useRef<string | null>(null);
  const skipInitialRef = useRef(true);
  const [transition, setTransition] = useState<MafiaPhaseTransitionView | null>(null);

  useEffect(() => {
    if (!active || !state) {
      prevKeyRef.current = null;
      skipInitialRef.current = true;
      setTransition(null);
      return;
    }

    const key = mafiaPhaseTransitionKey(
      state.phase,
      state.dayNumber,
      state.nightNumber
    );

    if (!key) {
      prevKeyRef.current = null;
      setTransition(null);
      return;
    }

    if (skipInitialRef.current) {
      skipInitialRef.current = false;
      prevKeyRef.current = key;
      return;
    }

    if (prevKeyRef.current === key) return;

    prevKeyRef.current = key;
    const kind = parseTransitionKind(key);
    if (!kind) return;

    const view = transitionView(
      key,
      kind,
      state.dayNumber,
      state.nightNumber
    );
    setTransition(view);

    const timer = window.setTimeout(
      () => setTransition(null),
      MAFIA_PHASE_TRANSITION_MS
    );
    return () => window.clearTimeout(timer);
  }, [active, state?.phase, state?.dayNumber, state?.nightNumber]);

  return transition;
}
