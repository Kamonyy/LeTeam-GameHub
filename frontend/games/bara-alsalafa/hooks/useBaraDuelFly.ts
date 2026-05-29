'use client';

import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

const FLY_MS = 560;
const BLEND_AT = 0.72;
const EASE = 'cubic-bezier(0.25, 1, 0.5, 1)';

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function findSeat(board: HTMLElement | null, playerId: string) {
  return board?.querySelector(
    `[data-bara-seat-id="${playerId}"][data-bara-seat-variant="grid"]`
  ) as HTMLElement | null;
}

function waitForSeats(
  board: HTMLElement | null,
  interviewerId: string,
  targetId: string,
  maxFrames = 20
): Promise<{ asker: HTMLElement | null; answerer: HTMLElement | null }> {
  return new Promise((resolve) => {
    let frame = 0;
    const tick = () => {
      const asker = findSeat(board, interviewerId);
      const answerer = findSeat(board, targetId);
      if ((asker && answerer) || frame >= maxFrames) {
        resolve({ asker, answerer });
        return;
      }
      frame += 1;
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function flyClone(
  fromEl: HTMLElement,
  toEl: HTMLElement,
  accent: 'asker' | 'answerer',
  onBlend: () => void,
  ghosts: Set<HTMLElement>,
): Promise<void> {
  return new Promise((resolve) => {
    const from = fromEl.getBoundingClientRect();
    const to = toEl.getBoundingClientRect();

    const ghost = fromEl.cloneNode(true) as HTMLElement;
    ghost.classList.add('bara-fly-ghost', `bara-fly-ghost--${accent}`);
    ghost.removeAttribute('disabled');
    ghost.setAttribute('aria-hidden', 'true');

    Object.assign(ghost.style, {
      position: 'fixed',
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`,
      margin: '0',
      zIndex: '200',
      pointerEvents: 'none',
      transformOrigin: 'center center',
      boxSizing: 'border-box',
    });

    document.body.appendChild(ghost);
    ghosts.add(ghost);

    let blended = false;
    const triggerBlend = () => {
      if (blended) return;
      blended = true;
      onBlend();
    };

    const anim = ghost.animate(
      [
        {
          left: `${from.left}px`,
          top: `${from.top}px`,
          width: `${from.width}px`,
          height: `${from.height}px`,
          opacity: '1',
          filter: 'blur(0px)',
        },
        {
          offset: 0.55,
          left: `${from.left + (to.left - from.left) * 0.58}px`,
          top: `${from.top + (to.top - from.top) * 0.58 - 6}px`,
          width: `${from.width + (to.width - from.width) * 0.58}px`,
          height: `${from.height + (to.height - from.height) * 0.58}px`,
          opacity: '1',
          filter: 'blur(0.5px)',
        },
        {
          offset: 0.88,
          left: `${to.left}px`,
          top: `${to.top}px`,
          width: `${to.width}px`,
          height: `${to.height}px`,
          opacity: '0.35',
          filter: 'blur(0px)',
        },
        {
          left: `${to.left}px`,
          top: `${to.top}px`,
          width: `${to.width}px`,
          height: `${to.height}px`,
          opacity: '0',
          filter: 'blur(0px)',
        },
      ],
      { duration: FLY_MS, easing: EASE, fill: 'forwards' }
    );

    const blendTimer = window.setTimeout(triggerBlend, FLY_MS * BLEND_AT);

    const finish = () => {
      window.clearTimeout(blendTimer);
      ghosts.delete(ghost);
      ghost.remove();
      resolve();
    };

    anim.onfinish = finish;
    anim.oncancel = finish;
  });
}

export function useBaraDuelFly(
  duelKey: string | null,
  interviewerId: string | null,
  targetId: string | null,
  boardRootRef: RefObject<HTMLElement | null>
) {
  const askerSlotRef = useRef<HTMLDivElement>(null);
  const answererSlotRef = useRef<HTMLDivElement>(null);
  const flyGhostsRef = useRef<Set<HTMLElement>>(new Set());
  const [landed, setLanded] = useState(false);
  const [flying, setFlying] = useState(false);

  const clearFlyGhosts = () => {
    for (const ghost of flyGhostsRef.current) {
      ghost.remove();
    }
    flyGhostsRef.current.clear();
  };

  useLayoutEffect(() => {
    if (!duelKey || !interviewerId || !targetId) {
      setLanded(false);
      setFlying(false);
      return;
    }

    const board = boardRootRef.current;
    const askerSlot = askerSlotRef.current;
    const answererSlot = answererSlotRef.current;

    if (!askerSlot || !answererSlot) {
      setLanded(true);
      return;
    }

    if (prefersReducedMotion()) {
      setLanded(true);
      setFlying(false);
      return;
    }

    let cancelled = false;
    setLanded(false);
    setFlying(true);

    const blendIn = () => {
      if (!cancelled) setLanded(true);
    };

    void (async () => {
      const { asker: askerGrid, answerer: answererGrid } = await waitForSeats(
        board,
        interviewerId,
        targetId
      );

      if (cancelled) return;

      if (!askerGrid || !answererGrid) {
        setFlying(false);
        setLanded(true);
        return;
      }

      await Promise.all([
        flyClone(askerGrid, askerSlot, 'asker', blendIn, flyGhostsRef.current),
        flyClone(answererGrid, answererSlot, 'answerer', blendIn, flyGhostsRef.current),
      ]);
      if (!cancelled) {
        setFlying(false);
        setLanded(true);
      }
    })();

    return () => {
      cancelled = true;
      clearFlyGhosts();
    };
  }, [duelKey, interviewerId, targetId, boardRootRef]);

  return { askerSlotRef, answererSlotRef, landed, flying };
}
