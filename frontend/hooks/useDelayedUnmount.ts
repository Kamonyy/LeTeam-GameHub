'use client';

import { useState, useEffect, useRef } from 'react';

export const MOTION_UI_MS = 280;

export type AnimationPhase = 'entering' | 'exiting' | 'idle';

export function useDelayedUnmount(isMounted: boolean, delayMs: number) {
  const [shouldRender, setShouldRender] = useState(isMounted);
  const [animationState, setAnimationState] =
    useState<AnimationPhase>('idle');
  const shouldRenderRef = useRef(shouldRender);
  shouldRenderRef.current = shouldRender;

  useEffect(() => {
    if (isMounted) {
      setShouldRender(true);
      setAnimationState('entering');
      return;
    }

    if (!shouldRenderRef.current) return;

    setAnimationState('exiting');
    const timer = window.setTimeout(() => {
      setShouldRender(false);
      setAnimationState('idle');
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [isMounted, delayMs]);

  useEffect(() => {
    if (animationState !== 'entering' || !shouldRender) return;

    let outerId = 0;
    const innerId = requestAnimationFrame(() => {
      outerId = requestAnimationFrame(() => {
        setAnimationState('idle');
      });
    });

    return () => {
      cancelAnimationFrame(innerId);
      if (outerId) cancelAnimationFrame(outerId);
    };
  }, [animationState, shouldRender]);

  return { shouldRender, animationState };
}
