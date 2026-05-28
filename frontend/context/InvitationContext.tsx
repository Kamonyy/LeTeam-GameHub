'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  useGameState,
  useSocketActions,
  useSocketConnection,
} from '@/hooks/useSocket';
import { getSessionToken } from '@/lib/player';
import { getGameEntry } from '@/lib/hub/games-registry';
import InvitationOverlay from '@/components/InvitationOverlay';
import {
  playInviteReceivedSound,
  unlockInviteAudio,
} from '@/lib/invitations/invite-notification-sound';

export const INVITE_TTL_MS = 30_000;

export interface IncomingInvite {
  inviteId: string;
  fromName: string;
  fromPlayerId: string;
  roomId: string;
  gameType: string;
  expiresAt: number;
}

export type InviteOverlayPhase = 'hidden' | 'entering' | 'visible' | 'exiting';

interface SentInviteState {
  inviteId: string;
  expiresAt: number;
}

interface InvitationContextValue {
  incomingInvite: IncomingInvite | null;
  overlayPhase: InviteOverlayPhase;
  secondsRemaining: number;
  sentInvites: Map<string, SentInviteState>;
  inviteError: string | null;
  sendInvite: (
    targetPlayerId: string,
    roomId: string,
    gameType: string
  ) => Promise<{ ok: boolean; error?: string }>;
  respondToInvite: (accept: boolean) => Promise<void>;
  dismissIncoming: () => void;
  clearInviteError: () => void;
}

const InvitationContext = createContext<InvitationContextValue | null>(null);

const EXIT_ANIMATION_MS = 200;

export function InvitationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { connected } = useSocketConnection();
  const { lobby } = useGameState();
  const { registerSocketListener, emitInviteSend, emitInviteRespond } =
    useSocketActions();
  const [incomingInvite, setIncomingInvite] = useState<IncomingInvite | null>(null);
  const incomingInviteRef = useRef<IncomingInvite | null>(null);
  const [overlayPhase, setOverlayPhase] = useState<InviteOverlayPhase>('hidden');
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [sentInvites, setSentInvites] = useState<Map<string, SentInviteState>>(
    () => new Map()
  );
  const [inviteError, setInviteError] = useState<string | null>(null);
  const pendingNavigateRef = useRef<{ roomId: string; gameType: string } | null>(
    null
  );
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  incomingInviteRef.current = incomingInvite;

  const clearExitTimer = useCallback(() => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  const runExitAnimation = useCallback(
    (onDone?: () => void) => {
      clearExitTimer();
      setOverlayPhase('exiting');
      exitTimerRef.current = setTimeout(() => {
        setOverlayPhase('hidden');
        setIncomingInvite(null);
        onDone?.();
      }, EXIT_ANIMATION_MS);
    },
    [clearExitTimer]
  );

  const showIncoming = useCallback(
    (invite: IncomingInvite) => {
      clearExitTimer();
      playInviteReceivedSound();
      setIncomingInvite(invite);
      setOverlayPhase('entering');
      requestAnimationFrame(() => {
        setOverlayPhase('visible');
      });
    },
    [clearExitTimer]
  );

  useEffect(() => {
    const unlock = () => unlockInviteAudio();
    document.addEventListener('pointerdown', unlock, { once: true, passive: true });
    return () => document.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(() => {
    if (!incomingInvite) {
      setSecondsRemaining(0);
      return;
    }
    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil((incomingInvite.expiresAt - Date.now()) / 1000)
      );
      setSecondsRemaining(left);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [incomingInvite]);

  useEffect(() => {
    if (!connected || !registerSocketListener) return undefined;

    const offReceived = registerSocketListener('invite:received', (...args: unknown[]) => {
      const payload = args[0] as IncomingInvite | undefined;
      if (!payload?.inviteId) return;
      showIncoming(payload);
    });

    const offExpired = registerSocketListener('invite:expired', (...args: unknown[]) => {
      const payload = args[0] as { inviteId?: string } | undefined;
        setSentInvites((prev) => {
          const next = new Map(prev);
          for (const [targetId, sent] of next) {
            if (sent.inviteId === payload?.inviteId) {
              next.delete(targetId);
            }
          }
          return next;
        });
        if (incomingInviteRef.current?.inviteId === payload?.inviteId) {
          runExitAnimation();
        }
      }
    );

    const offDeclined = registerSocketListener('invite:declined', (...args: unknown[]) => {
      const payload = args[0] as { inviteId?: string } | undefined;
        setSentInvites((prev) => {
          const next = new Map(prev);
          for (const [targetId, sent] of next) {
            if (sent.inviteId === payload?.inviteId) {
              next.delete(targetId);
            }
          }
          return next;
        });
      }
    );

    const offError = registerSocketListener('invite:error', (...args: unknown[]) => {
      const payload = args[0] as { message?: string } | undefined;
      if (payload?.message) setInviteError(payload.message);
    });

    const offAccepted = registerSocketListener('invite:accepted', (...args: unknown[]) => {
      const payload = args[0] as { targetId?: string; inviteId?: string } | undefined;
      setSentInvites((prev) => {
        const next = new Map(prev);
        if (payload?.targetId) next.delete(payload.targetId);
        if (payload?.inviteId) {
          for (const [targetId, sent] of next) {
            if (sent.inviteId === payload.inviteId) next.delete(targetId);
          }
        }
        return next;
      });
    });

    return () => {
      offReceived?.();
      offExpired?.();
      offDeclined?.();
      offError?.();
      offAccepted?.();
    };
  }, [connected, registerSocketListener, showIncoming, runExitAnimation]);

  useEffect(() => {
    if (!pendingNavigateRef.current || !lobby) return;
    const pending = pendingNavigateRef.current;
    if (lobby.roomId !== pending.roomId) return;
    const entry = getGameEntry(pending.gameType);
    if (entry) {
      router.push(`${entry.href}?room=${pending.roomId}`);
    }
    pendingNavigateRef.current = null;
  }, [lobby, router]);

  const sendInvite = useCallback(
    async (targetPlayerId: string, roomId: string, gameType: string) => {
      setInviteError(null);
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        return { ok: false, error: 'Session required' };
      }
      const res = await emitInviteSend({
        targetPlayerId,
        roomId,
        gameType,
        sessionToken,
      });
      if (res.error) {
        setInviteError(res.error);
        return { ok: false, error: res.error };
      }
      if (res.inviteId && res.expiresAt) {
        setSentInvites((prev) => {
          const next = new Map(prev);
          next.set(targetPlayerId, {
            inviteId: res.inviteId!,
            expiresAt: res.expiresAt!,
          });
          return next;
        });
      }
      return { ok: true };
    },
    [emitInviteSend]
  );

  const respondToInvite = useCallback(
    async (accept: boolean) => {
      if (!incomingInviteRef.current) return;
      const sessionToken = getSessionToken();
      if (!sessionToken) return;

      const invite = incomingInviteRef.current;

      const res = await emitInviteRespond({
        inviteId: invite.inviteId,
        accept,
        sessionToken,
      });

      if (res.error) {
        setInviteError(res.error);
        return;
      }

      runExitAnimation();

      if (accept && res.accepted) {
        pendingNavigateRef.current = {
          roomId: invite.roomId,
          gameType: invite.gameType,
        };
        const entry = getGameEntry(invite.gameType);
        if (lobby?.roomId === invite.roomId && entry) {
          router.push(`${entry.href}?room=${invite.roomId}`);
          pendingNavigateRef.current = null;
        }
      }
    },
    [runExitAnimation, emitInviteRespond, lobby?.roomId, router]
  );

  const dismissIncoming = useCallback(() => {
    if (!incomingInviteRef.current) return;
    void respondToInvite(false);
  }, [respondToInvite]);

  const clearInviteError = useCallback(() => setInviteError(null), []);

  const value = useMemo(
    () => ({
      incomingInvite,
      overlayPhase,
      secondsRemaining,
      sentInvites,
      inviteError,
      sendInvite,
      respondToInvite,
      dismissIncoming,
      clearInviteError,
    }),
    [
      incomingInvite,
      overlayPhase,
      secondsRemaining,
      sentInvites,
      inviteError,
      sendInvite,
      respondToInvite,
      dismissIncoming,
      clearInviteError,
    ]
  );

  return (
    <InvitationContext.Provider value={value}>
      {children}
      <InvitationOverlay />
    </InvitationContext.Provider>
  );
}

export function useInvitation(): InvitationContextValue {
  const ctx = useContext(InvitationContext);
  if (!ctx) {
    throw new Error('useInvitation must be used within InvitationProvider');
  }
  return ctx;
}
