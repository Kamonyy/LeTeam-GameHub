'use client';

import { useEffect, useRef } from 'react';
import { useGameTimer, useGameState } from '@/hooks/useSocket';
import {
  playSketchCorrectGuessSound,
  playSketchCountdownTickSound,
  playSketchMatchEndSound,
  playSketchTimer15Sound,
  playSketchTimer30Sound,
  unlockSketchDrawAudio,
} from '../lib/sketchDrawSound';

/**
 * Reactive SFX for sketch-draw: timer warnings, correct guesses, match end.
 */
export function useSketchDrawAudio(phase: string | undefined) {
  const sketchDrawTimeTick = useGameTimer();
  const { sketchDrawRoomAlerts, lobby } = useGameState();
  const playedMarksRef = useRef(new Set<string>());
  const lastCorrectLenRef = useRef(0);
  const lastPhaseRef = useRef<string | undefined>(undefined);
  const lastTickAtRef = useRef(0);

  useEffect(() => {
    if (phase !== 'drawing') {
      playedMarksRef.current.clear();
    }
  }, [phase]);

  useEffect(() => {
    const onPointer = () => unlockSketchDrawAudio();
    window.addEventListener('pointerdown', onPointer, { once: true });
    return () => window.removeEventListener('pointerdown', onPointer);
  }, []);

  useEffect(() => {
    if (phase !== 'match_over' || lastPhaseRef.current === 'match_over') {
      lastPhaseRef.current = phase;
      return;
    }
    lastPhaseRef.current = phase;
    playSketchMatchEndSound();
  }, [phase]);

  useEffect(() => {
    if (phase !== 'drawing' || !sketchDrawTimeTick) return;
    if (sketchDrawTimeTick.phase !== 'drawing') return;
    if (lobby?.roomId && sketchDrawTimeTick.roomId !== lobby.roomId) return;

    if (sketchDrawTimeTick.at === lastTickAtRef.current) return;
    lastTickAtRef.current = sketchDrawTimeTick.at;

    const sec = Math.ceil(sketchDrawTimeTick.remainingMs / 1000);
    const mark = (key: string) => {
      const id = `${sketchDrawTimeTick.phase}-${key}`;
      if (playedMarksRef.current.has(id)) return false;
      playedMarksRef.current.add(id);
      return true;
    };

    if (sec === 30 && mark('30')) playSketchTimer30Sound();
    if (sec === 15 && mark('15')) playSketchTimer15Sound();
    if (sec >= 1 && sec <= 5 && mark(`cd-${sec}`)) {
      playSketchCountdownTickSound(sec);
    }
  }, [phase, sketchDrawTimeTick, lobby?.roomId]);

  useEffect(() => {
    const len = sketchDrawRoomAlerts.length;
    if (len > lastCorrectLenRef.current) {
      playSketchCorrectGuessSound();
    }
    lastCorrectLenRef.current = len;
  }, [sketchDrawRoomAlerts]);
}
