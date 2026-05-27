'use client';

import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, LogIn, UserPlus, OctagonX } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { setDisplayName, getDisplayName, hasDisplayName } from '@/lib/player';
import { normalizeRoomCode } from '@/lib/hub/room';
import ConnectionStatus from '@/components/hub/ConnectionStatus';
import PlayerNameControl from '@/components/hub/PlayerNameControl';
import ChatPanel from '@/components/hub/ChatPanel';
import ErrorToast from '@/components/shared/ErrorToast';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Lobby from '@/games/dominoes/components/Lobby';
import GameBoard from '@/games/dominoes/components/GameBoard';
import SpectatorBanner from '@/games/dominoes/components/SpectatorBanner';
import GameAboutPanel from '@/components/hub/GameAboutPanel';
import InactiveGameScreen from '@/components/hub/InactiveGameScreen';
import { getGameEntry, isGameActive } from '@/lib/hub/games-registry';
import type { GameState } from '@/games/dominoes/types';

export default function DominoesClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomParam = searchParams.get('room');
  const spectateParam =
    searchParams.get('spectate') === '1' || searchParams.get('spectate') === 'true';

  const {
    connected,
    playerId,
    lobby,
    gameState,
    isSpectator,
    error,
    clearError,
    createRoom,
    joinRoomOrSpectate,
    spectateRoom,
    leaveRoom,
    updateRoomSettings,
    startGame,
    kickPlayer,
    cancelMatch,
    playMove,
    drawTile,
    passTurn,
    continueRound,
    requestRematch,
  } = useSocket();

  const [displayName, setDisplayNameState] = useState('');
  const [joinCode, setJoinCode] = useState(roomParam || '');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [autoJoined, setAutoJoined] = useState(false);
  const [inviteJoin, setInviteJoin] = useState(false);

  useEffect(() => {
    setInviteJoin(!!roomParam && !hasDisplayName());
  }, [roomParam]);
  const dominoesEnabled = isGameActive('dominoes');
  const dominoesMeta = getGameEntry('dominoes');

  useEffect(() => {
    setDisplayNameState(getDisplayName());
  }, []);

  useEffect(() => {
    if (
      !dominoesEnabled ||
      !connected ||
      !roomParam ||
      lobby?.gameType === 'dominoes' ||
      autoJoined ||
      inviteJoin
    )
      return;
    if (lobby && lobby.gameType !== 'dominoes') return;
    const code = normalizeRoomCode(roomParam);
    if (!code) return;

    let cancelled = false;

    const attemptJoin = async () => {
      setLoading(true);
      const name = getDisplayName();
      if (spectateParam) {
        const ok = await spectateRoom(code, name);
        if (!cancelled && ok) {
          router.replace(`/dominoes?room=${code}&spectate=1`, { scroll: false });
        }
      } else {
        const result = await joinRoomOrSpectate(code, name);
        if (!cancelled && result.ok) {
          const query = result.spectating ? `?room=${code}&spectate=1` : `?room=${code}`;
          router.replace(`/dominoes${query}`, { scroll: false });
        }
      }
      if (!cancelled) {
        setAutoJoined(true);
        setLoading(false);
      }
    };

    attemptJoin();
    return () => {
      cancelled = true;
    };
  }, [
    connected,
    roomParam,
    lobby,
    autoJoined,
    inviteJoin,
    spectateParam,
    joinRoomOrSpectate,
    spectateRoom,
    router,
    dominoesEnabled,
  ]);

  const handleCreate = async () => {
    if (!displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const roomId = await createRoom(displayName.trim(), 'dominoes');
    if (roomId) router.push(`/dominoes?room=${roomId}`);
    setLoading(false);
  };

  const handleJoin = async () => {
    const code = normalizeRoomCode(joinCode);
    if (!code || !displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const result = await joinRoomOrSpectate(code, displayName.trim());
    if (result.ok) {
      router.push(
        result.spectating ? `/dominoes?room=${code}&spectate=1` : `/dominoes?room=${code}`
      );
    }
    setLoading(false);
  };

  const handleSpectate = async () => {
    const code = normalizeRoomCode(joinCode);
    if (!code || !displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const ok = await spectateRoom(code, displayName.trim());
    if (ok) router.push(`/dominoes?room=${code}&spectate=1`);
    setLoading(false);
  };

  const handleInviteJoin = async () => {
    const code = roomParam ? normalizeRoomCode(roomParam) : null;
    if (!code || !displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    if (spectateParam) {
      const ok = await spectateRoom(code, displayName.trim());
      if (ok) router.replace(`/dominoes?room=${code}&spectate=1`, { scroll: false });
    } else {
      const result = await joinRoomOrSpectate(code, displayName.trim());
      if (result.ok) {
        const query = result.spectating ? `?room=${code}&spectate=1` : `?room=${code}`;
        router.replace(`/dominoes${query}`, { scroll: false });
      }
    }
    setAutoJoined(true);
    setLoading(false);
  };

  const handleCancelMatch = async () => {
    setCancelling(true);
    await cancelMatch();
    setCancelling(false);
    setCancelConfirmOpen(false);
  };

  const dominoLobby = lobby?.gameType === 'dominoes' ? lobby : null;
  const isHost = dominoLobby?.hostId === playerId;
  const dominoesState =
    dominoLobby && gameState && 'board' in gameState ? (gameState as GameState) : null;
  const inLobby = dominoLobby?.status === 'lobby' && !isSpectator;
  const spectatorWaiting =
    isSpectator && dominoLobby && dominoLobby.status === 'lobby';
  const showGameBoard =
    !!dominoesState && !!dominoLobby && dominoLobby.status !== 'lobby';
  const waitingForGame =
    dominoLobby?.status === 'playing' && !dominoesState;
  const inActiveMatch =
    dominoLobby?.status === 'playing' && (showGameBoard || waitingForGame);

  const showChatSidebar = dominoLobby?.status === 'playing';

  return (
    <main
      className={clsx(
        'min-h-screen',
        showChatSidebar && 'lg:grid lg:grid-cols-[minmax(0,1fr)_20rem]',
      )}
    >
      <div className="min-w-0 flex flex-col">
      <header className="border-b border-hub-border bg-hub-surface/50 backdrop-blur-sm sticky top-0 z-40">
        <div
          className={clsx(
            'mx-auto px-6 py-4 flex items-center justify-between w-full',
            showGameBoard ? 'max-w-7xl' : 'max-w-6xl',
          )}
        >
          <div className="flex items-center gap-4">
            <Link href="/" className="text-hub-muted hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Dominoes</h1>
              {dominoesMeta && (
                <p className="text-xs text-hub-muted truncate max-w-[200px] sm:max-w-none">
                  {dominoesMeta.tagline}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isHost && inActiveMatch && (
              <button
                onClick={() => setCancelConfirmOpen(true)}
                disabled={cancelling}
                className="btn-secondary flex items-center gap-2 text-sm py-2 text-hub-danger border-hub-danger/30 hover:bg-hub-danger/10"
              >
                <OctagonX className="w-4 h-4" />
                {cancelling ? 'Cancelling…' : 'Cancel Match'}
              </button>
            )}
            <ConnectionStatus connected={connected} />
            <PlayerNameControl disabled={inActiveMatch} />
          </div>
        </div>
      </header>

      <div
        className={clsx(
          'mx-auto px-4 sm:px-6 py-10 w-full',
          showGameBoard ? 'max-w-none' : 'max-w-6xl',
        )}
      >
        {!dominoLobby && !dominoesEnabled && <InactiveGameScreen gameId="dominoes" />}

        {!dominoLobby && dominoesEnabled && inviteJoin && (
          <div className="max-w-md mx-auto animate-fade-in">
            <div className="card mb-6">
              <div className="flex items-center gap-2 text-hub-accent mb-4">
                <UserPlus className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Join Room</h2>
              </div>
              <p className="text-sm text-hub-muted mb-4">
                {spectateParam ?
                  'Enter a display name to watch this match as a spectator.'
                : <>
                    You&apos;ve been invited to room{' '}
                    <span className="font-mono font-bold text-white tracking-widest">
                      {roomParam}
                    </span>
                    . Choose a display name to continue.
                  </>}
              </p>
              <label className="block text-sm text-hub-muted mb-2">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayNameState(e.target.value)}
                className="input-field normal-case tracking-normal text-left mb-6"
                placeholder="Enter your name"
                maxLength={20}
                autoFocus
              />
              <button
                onClick={handleInviteJoin}
                disabled={!connected || loading || !displayName.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                {loading ?
                  spectateParam ? 'Joining as spectator…' : 'Joining…'
                : spectateParam ? 'Watch match' : 'Join Room'}
              </button>
            </div>
            {!connected && (
              <p className="text-center text-sm text-hub-warning animate-pulse-soft">
                Connecting to server…
              </p>
            )}
          </div>
        )}

        {!dominoLobby && dominoesEnabled && !inviteJoin && (
          <div className="max-w-md mx-auto animate-fade-in space-y-6">
            <GameAboutPanel gameId="dominoes" />
            {roomParam && loading && !autoJoined && (
              <p className="text-center text-sm text-hub-muted mb-4 animate-pulse-soft">
                {spectateParam ?
                  `Joining as spectator for ${roomParam}…`
                : `Joining room ${roomParam}…`}
              </p>
            )}
            <div className="card mb-6">
              <label className="block text-sm text-hub-muted mb-2">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayNameState(e.target.value)}
                onBlur={() => displayName.trim() && setDisplayName(displayName)}
                className="input-field normal-case tracking-normal text-left mb-6"
                placeholder="Your name"
                maxLength={20}
              />
              <div className="space-y-4">
                <button
                  onClick={handleCreate}
                  disabled={!connected || loading || !displayName.trim()}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {loading ? 'Creating…' : 'Create Room'}
                </button>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="input-field"
                  placeholder="ROOM CODE"
                  maxLength={8}
                />
                <button
                  onClick={handleJoin}
                  disabled={!connected || loading || !joinCode.trim() || !displayName.trim()}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  {loading ? 'Joining…' : 'Join Room'}
                </button>
                <button
                  onClick={handleSpectate}
                  disabled={!connected || loading || !joinCode.trim() || !displayName.trim()}
                  className="btn-secondary w-full flex items-center justify-center gap-2 text-hub-muted border-hub-border/60"
                >
                  Watch match
                </button>
              </div>
            </div>
            {!connected && (
              <p className="text-center text-sm text-hub-warning animate-pulse-soft">
                Connecting to server…
              </p>
            )}
          </div>
        )}

        {spectatorWaiting && dominoLobby && (
          <div className="max-w-md mx-auto text-center animate-fade-in py-16">
            <SpectatorBanner
              roomId={dominoLobby.roomId}
              onLeave={() => {
                leaveRoom();
                router.push('/dominoes');
              }}
            />
            <p className="text-sm text-hub-muted mt-6">
              Waiting for the host to start the match.
            </p>
          </div>
        )}

        {inLobby && dominoLobby && (
          <Lobby
            lobby={dominoLobby}
            playerId={playerId}
            onSettingsChange={updateRoomSettings}
            onKickPlayer={kickPlayer}
            onStartGame={async () => {
              setStarting(true);
              await startGame();
              setStarting(false);
            }}
            onLeave={() => {
              leaveRoom();
              router.push('/dominoes');
            }}
            starting={starting}
          />
        )}

        {waitingForGame && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 animate-fade-in">
            <div className="w-10 h-10 border-2 border-hub-accent/30 border-t-hub-accent rounded-full animate-spin" />
            <p className="text-sm text-hub-muted">Loading game…</p>
          </div>
        )}

        {showGameBoard && dominoLobby && (
          <>
            {isSpectator && (
              <SpectatorBanner
                roomId={dominoLobby.roomId}
                onLeave={() => {
                  leaveRoom();
                  router.push('/dominoes');
                }}
              />
            )}
            <GameBoard
              gameState={dominoesState!}
              lobby={dominoLobby}
              playerId={playerId}
              isHost={isHost}
              isSpectator={isSpectator}
              onPlayMove={playMove}
              onDraw={drawTile}
              onPass={passTurn}
              onContinueRound={continueRound}
              onRematch={requestRematch}
            />
          </>
        )}
      </div>
      </div>

      {showChatSidebar && (
        <ChatPanel className="hidden lg:flex lg:flex-col lg:col-start-2 lg:row-start-1 border-l border-hub-border bg-hub-surface/80 backdrop-blur-sm sticky top-0 h-dvh min-h-0 z-30" />
      )}

      <ErrorToast message={error} onDismiss={clearError} />

      <ConfirmDialog
        open={cancelConfirmOpen}
        title="Cancel this match?"
        message="Everyone will return to the lobby. Current round progress and scores will be cleared."
        confirmLabel="Cancel Match"
        cancelLabel="Keep Playing"
        variant="danger"
        icon="cancel"
        loading={cancelling}
        onConfirm={handleCancelMatch}
        onCancel={() => !cancelling && setCancelConfirmOpen(false)}
      />
    </main>
  );
}
