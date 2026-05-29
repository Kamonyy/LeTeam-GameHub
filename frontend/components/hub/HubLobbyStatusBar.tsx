'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useGameState } from '@/hooks/useSocket';
import { gameLabelForPresence } from '@/lib/hub/groupOnlinePlayers';
import { navigateToGameLobby } from '@/lib/hub/navigateToGameLobby';
import { useLeaveToHub } from '@/lib/hub/useLeaveToHub';

export default function HubLobbyStatusBar() {
  const router = useRouter();
  const { lobby } = useGameState();
  const leaveToHub = useLeaveToHub();

  const goToLobby = useCallback(() => {
    if (!lobby?.roomId || !lobby.gameType) return;
    navigateToGameLobby(router, lobby.roomId, lobby.gameType);
  }, [lobby, router]);

  const handleLeave = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      void leaveToHub();
    },
    [leaveToHub]
  );

  if (!lobby) {
    return (
      <div
        className="hub-lobby-status hub-lobby-status--idle"
        aria-live="polite"
      >
        <span className="hub-lobby-status__dot hub-lobby-status__dot--idle" aria-hidden />
        <span className="hub-lobby-status__idle-text">No lobby</span>
      </div>
    );
  }

  const inMatch = lobby.status === 'playing';
  const gameName = gameLabelForPresence(lobby.gameType);
  const statusWord = inMatch ? 'In game' : 'Lobby';

  return (
    <div className="hub-lobby-status hub-lobby-status--active" role="group">
      <button
        type="button"
        className="hub-lobby-status__main"
        onClick={goToLobby}
        title={`Open ${gameName} room ${lobby.roomId}`}
      >
        <span className="hub-lobby-status__dot hub-lobby-status__dot--active" aria-hidden />
        <span className="hub-lobby-status__line truncate">
          <span className="font-semibold">{statusWord}</span>
          <span className="text-stone-500"> · </span>
          <span>{gameName}</span>
          <span className="text-stone-500"> · </span>
          <span className="font-mono tabular-nums">{lobby.roomId}</span>
        </span>
      </button>
      <button
        type="button"
        className="hub-lobby-status__leave"
        onClick={handleLeave}
        title="Leave room"
        aria-label="Leave lobby"
      >
        <LogOut className="w-3 h-3" aria-hidden />
      </button>
    </div>
  );
}
