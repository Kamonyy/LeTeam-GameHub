'use client';

import { useEffect, useRef, useState } from 'react';

export function isDocumentGameFocused(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible' && document.hasFocus();
}

/** Reports tab/window focus to the hub while a Secret Word match is active. */
export function useWordGameTabFocus(
  active: boolean,
  report: (focused: boolean) => void
): boolean {
  const lastReported = useRef<boolean | null>(null);
  const [selfFocused, setSelfFocused] = useState(true);

  useEffect(() => {
    if (!active) {
      lastReported.current = null;
      setSelfFocused(true);
      return;
    }

    const sync = () => {
      const focused = isDocumentGameFocused();
      setSelfFocused(focused);
      if (lastReported.current === focused) return;
      lastReported.current = focused;
      report(focused);
    };

    sync();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('blur', sync);

    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('blur', sync);
      if (lastReported.current !== true) {
        lastReported.current = true;
        report(true);
      }
    };
  }, [active, report]);

  return selfFocused;
}
