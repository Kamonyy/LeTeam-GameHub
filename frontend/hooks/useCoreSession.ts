'use client';

import { useCallback } from 'react';
import {
  CORE_SESSION_KEY,
  patchCoreSession,
  readCoreSession,
  writeCoreSession,
  type CoreSessionV1,
} from '@/lib/session/core-session';
import { useBrowserStorage } from '@/hooks/useBrowserStorage';

export function useCoreSession() {
  const { value: session, setValue, isHydrated } = useBrowserStorage<CoreSessionV1>(
    CORE_SESSION_KEY,
    readCoreSession,
    writeCoreSession,
    null
  );

  const patchSession = useCallback(
    (
      patch: Partial<{
        player: Partial<CoreSessionV1['player']>;
        prefs: Partial<CoreSessionV1['prefs']>;
      }>
    ) => {
      const next = patchCoreSession(patch);
      setValue(next);
      return next;
    },
    [setValue]
  );

  return { session, setSession: setValue, patchSession, isHydrated };
}
