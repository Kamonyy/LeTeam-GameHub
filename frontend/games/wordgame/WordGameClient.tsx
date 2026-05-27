'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, LogIn, UserPlus, OctagonX } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { setDisplayName, getDisplayName, hasDisplayName } from '@/lib/player';
import { normalizeRoomCode } from '@/lib/hub/room';
import PlayerNameControl from '@/components/hub/PlayerNameControl';
import ErrorToast from '@/components/shared/ErrorToast';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import WordLobby from '@/games/wordgame/components/WordLobby';
import GameAboutPanel from '@/components/hub/GameAboutPanel';
import { getGameEntry } from '@/lib/hub/games-registry';
import WordGameBoard from '@/games/wordgame/components/WordGameBoard';
import WordGameAtmosphere from '@/games/wordgame/components/WordGameAtmosphere';
import WordConnectionBadge from '@/games/wordgame/components/WordConnectionBadge';
import WordPanelFrame from '@/games/wordgame/components/WordPanelFrame';
import '@/games/wordgame/wordgame.css';

export default function WordGameClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomParam = searchParams.get('room');

  const {
    connected,
    playerId,
    lobby,
    gameState,
    error,
    clearError,
    createRoom,
    joinRoom,
    leaveRoom,
    updateRoomSettings,
    startGame,
    kickPlayer,
    cancelMatch,
    submitSecretWord,
    submitSecretChampion,
    confirmWordGuessed,
  } = useSocket();

  const [displayName, setDisplayNameState] = useState('');
  const [joinCode, setJoinCode] = useState(roomParam || '');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [autoJoined, setAutoJoined] = useState(false);

  const inviteJoin = !!roomParam && !hasDisplayName();
  const wordState =
    lobby?.gameType === 'wordgame' &&
    gameState &&
    'gameType' in gameState &&
    gameState.gameType === 'wordgame'
      ? gameState
      : null;

  useEffect(() => {
    setDisplayNameState(getDisplayName());
  }, []);

  useEffect(() => {
    if (!connected || !roomParam || lobby || autoJoined || inviteJoin) return;
    const code = normalizeRoomCode(roomParam);
    if (!code) return;

    const attemptJoin = async () => {
      setLoading(true);
      const ok = await joinRoom(code, getDisplayName());
      if (ok) {
        router.replace(`/wordgame?room=${code}`, { scroll: false });
      }
      setAutoJoined(true);
      setLoading(false);
    };

    attemptJoin();
  }, [connected, roomParam, lobby, autoJoined, inviteJoin, joinRoom, router]);

  const handleCreate = async () => {
    if (!displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const roomId = await createRoom(displayName.trim(), 'wordgame');
    if (roomId) router.push(`/wordgame?room=${roomId}`);
    setLoading(false);
  };

  const handleJoin = async () => {
    const code = normalizeRoomCode(joinCode);
    if (!code || !displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const ok = await joinRoom(code, displayName.trim());
    if (ok) router.push(`/wordgame?room=${code}`);
    setLoading(false);
  };

  const handleInviteJoin = async () => {
    const code = roomParam ? normalizeRoomCode(roomParam) : null;
    if (!code || !displayName.trim()) return;
    setLoading(true);
    setDisplayName(displayName);
    const ok = await joinRoom(code, displayName.trim());
    if (ok) {
      router.replace(`/wordgame?room=${code}`, { scroll: false });
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

  const isHost = lobby?.hostId === playerId;
  const wordGameMeta = getGameEntry('wordgame');
  const inLobby = lobby && lobby.status === 'lobby';
  const inGame =
    lobby &&
    wordState &&
    (lobby.status === 'playing' ||
      lobby.status === 'finished' ||
      wordState.phase === 'match_over');

  return (
    <main className="sw-shell min-h-screen relative">
      <WordGameAtmosphere />

      <header className="sw-header">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/" className="sw-back-link shrink-0" aria-label="Back to hub">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="sw-header__title text-base sm:text-lg">Secret Word</h1>
              {wordGameMeta && (
                <p className="text-[10px] sm:text-xs sw-muted truncate max-w-[200px] sm:max-w-md tracking-wide">
                  {wordGameMeta.tagline}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {isHost && inGame && (
              <button
                type="button"
                onClick={() => setCancelConfirmOpen(true)}
                disabled={cancelling}
                className="sw-btn-secondary sw-btn-danger flex items-center gap-2 text-sm py-2"
              >
                <OctagonX className="w-4 h-4" />
                {cancelling ? 'Cancelling…' : 'Cancel'}
              </button>
            )}
            <WordConnectionBadge connected={connected} />
            <div className="[&_button]:border-[rgba(201,162,39,0.25)] [&_button]:text-[#e8edf7]">
              <PlayerNameControl disabled={!!inGame} />
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {!lobby && inviteJoin && (
          <div className="max-w-md mx-auto animate-fade-in">
            <WordPanelFrame className="p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="w-5 h-5 text-[#f0d78c]" />
                <h2 className="sw-heading text-base">Join the Rift</h2>
              </div>
              <div className="sw-divider-gold mb-4" />
              <p className="text-sm sw-muted mb-4 leading-relaxed">
                Summoned to room{' '}
                <span className="font-mono font-bold text-[#fff8e7] tracking-widest">
                  {roomParam}
                </span>
                . Inscribe your name to enter.
              </p>
              <label className="block text-[10px] sw-muted mb-2 uppercase tracking-widest">
                Champion Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayNameState(e.target.value)}
                className="sw-input normal-case tracking-normal text-left mb-6"
                placeholder="Enter your name"
                maxLength={20}
                autoFocus
              />
              <button
                type="button"
                onClick={handleInviteJoin}
                disabled={!connected || loading || !displayName.trim()}
                className="sw-btn-primary"
              >
                <LogIn className="w-4 h-4" />
                {loading ? 'Entering…' : 'Enter Room'}
              </button>
            </WordPanelFrame>
          </div>
        )}

        {!lobby && !inviteJoin && (
          <div className="max-w-md mx-auto animate-fade-in space-y-6">
            <div className="rounded-xl border border-[rgba(201,162,39,0.12)] bg-[rgba(6,8,22,0.5)] p-4 [&_p]:text-[#8b95ad]">
              <GameAboutPanel gameId="wordgame" />
            </div>
            {roomParam && loading && !autoJoined && (
              <p className="text-center text-sm sw-muted mb-4 animate-pulse-soft">
                Crossing into room {roomParam}…
              </p>
            )}
            <WordPanelFrame className="p-6 sm:p-8">
              <label className="block text-[10px] sw-muted mb-2 uppercase tracking-widest">
                Champion Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayNameState(e.target.value)}
                onBlur={() => displayName.trim() && setDisplayName(displayName)}
                className="sw-input normal-case tracking-normal text-left mb-6"
                placeholder="Your name"
                maxLength={20}
              />
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!connected || loading || !displayName.trim()}
                  className="sw-btn-primary"
                >
                  <Plus className="w-4 h-4" />
                  {loading ? 'Forging…' : 'Create Room'}
                </button>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="sw-input uppercase tracking-[0.25em] text-center font-mono"
                  placeholder="ROOM CODE"
                  maxLength={8}
                />
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={!connected || loading || !joinCode.trim() || !displayName.trim()}
                  className="sw-btn-secondary w-full"
                >
                  <LogIn className="w-4 h-4" />
                  {loading ? 'Entering…' : 'Join Room'}
                </button>
              </div>
            </WordPanelFrame>
          </div>
        )}

        {inLobby && (
          <WordLobby
            lobby={lobby}
            playerId={playerId}
            onKickPlayer={kickPlayer}
            onSettingsChange={updateRoomSettings}
            onStartGame={async () => {
              setStarting(true);
              await startGame();
              setStarting(false);
            }}
            onLeave={() => {
              leaveRoom();
              router.push('/wordgame');
            }}
            starting={starting}
          />
        )}

        {inGame && wordState && (
          <WordGameBoard
            gameState={wordState}
            lobby={lobby}
            playerId={playerId}
            onSubmitWord={submitSecretWord}
            onSubmitChampion={submitSecretChampion}
            onConfirmGuessed={confirmWordGuessed}
          />
        )}
      </div>

      <ErrorToast message={error} onDismiss={clearError} />

      <ConfirmDialog
        open={cancelConfirmOpen}
        title="Cancel this match?"
        message="Everyone will return to the lobby and all scores for this session will reset."
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
