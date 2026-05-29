'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { useGameRoom, useCoreSession } from '@/hooks/useSocket';
import { useLeaveToHub } from '@/lib/hub/useLeaveToHub';
import { setDisplayName, getDisplayName } from '@/lib/player';
import { normalizeRoomCode } from '@/lib/hub/room';
import WordGamePlayerProfile from '@/games/wordgame/components/WordGamePlayerProfile';
import ErrorToast from '@/components/shared/ErrorToast';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import WordLobby from '@/games/wordgame/components/WordLobby';
import InactiveGameScreen from '@/components/hub/InactiveGameScreen';
import { getGameEntry, isGameActive } from '@/lib/hub/games-registry';
import WordGameBoard from '@/games/wordgame/components/WordGameBoard';
import WordGameAtmosphere from '@/games/wordgame/components/WordGameAtmosphere';
import ConnectionStatus from '@/components/hub/ConnectionStatus';
import { useWordGameTabFocus } from '@/games/wordgame/hooks/useWordGameTabFocus';
import WordPanelFrame from '@/games/wordgame/components/WordPanelFrame';
import WordGameAudioProvider from '@/games/wordgame/components/WordGameAudioProvider';
import GameLobbyPendingOverlay from '@/components/hub/GameLobbyPendingOverlay';
import GameClientFrame from '@/components/ui/GameClientFrame';
import '@/games/wordgame/wordgame.css';

export default function WordGameClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomParam = searchParams.get('room');

  const wordgameEnabled = isGameActive('wordgame');
  const { isHydrated } = useCoreSession();
  const [displayName, setDisplayNameState] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<'create' | 'join' | null>(
    null
  );
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [postMatchBusy, setPostMatchBusy] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const leaveToHub = useLeaveToHub();

  const {
    connected,
    playerId,
    lobby,
    gameState,
    error,
    clearError,
    createRoom,
    joinRoom,
    updateRoomSettings,
    startGame,
    requestRematch,
    kickPlayer,
    cancelMatch,
    submitSecretWord,
    submitSecretChampion,
    confirmWordGuessed,
    reportWordTabFocus,
    autoJoined,
    inviteJoin,
    joinCode,
    setJoinCode,
    setAutoJoined,
  } = useGameRoom({
    gameType: 'wordgame',
    gameEnabled: wordgameEnabled,
    basePath: '/wordgame',
    roomParam,
    onAutoJoinLoading: setLoading,
  });
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

  const handleCreate = async () => {
    if (!displayName.trim()) return;
    setLoading(true);
    setPendingAction('create');
    setDisplayName(displayName);
    try {
      const roomId = await createRoom(displayName.trim(), 'wordgame');
      if (roomId) {
        setAutoJoined(true);
        router.push(`/wordgame?room=${roomId}`);
      }
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
  };

  const handleJoin = async () => {
    const code = normalizeRoomCode(joinCode);
    if (!code || !displayName.trim()) return;
    setLoading(true);
    setPendingAction('join');
    setDisplayName(displayName);
    try {
      const ok = await joinRoom(code, displayName.trim());
      if (ok) {
        setAutoJoined(true);
        router.push(`/wordgame?room=${code}`);
      }
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
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

  const wordLobby = lobby?.gameType === 'wordgame' ? lobby : null;
  const isHost = wordLobby?.hostId === playerId;
  const wordGameMeta = getGameEntry('wordgame');
  const inLobby = wordLobby?.status === 'lobby';
  const matchFinished = wordState?.phase === 'match_over';
  const inGame =
    wordLobby &&
    wordState &&
    (wordLobby.status === 'playing' ||
      wordLobby.status === 'finished' ||
      matchFinished);

  const handlePlayAgain = async () => {
    setPostMatchBusy(true);
    clearError();
    try {
      await requestRematch();
    } finally {
      setPostMatchBusy(false);
    }
  };

  const handleReturnToLobby = async () => {
    setPostMatchBusy(true);
    await cancelMatch();
    setPostMatchBusy(false);
  };

  const lobbyWordCategory =
    wordLobby?.settings && 'wordCategory' in wordLobby.settings ?
      (wordLobby.settings.wordCategory as string)
    : undefined;

  const isLolAudioEnabled =
    lobbyWordCategory === 'lol-champions' ||
    wordState?.wordCategory === 'lol-champions';

  const matchInProgress = !!(inGame && !matchFinished);
  const selfTabFocused = useWordGameTabFocus(matchInProgress, reportWordTabFocus);

  if (!isHydrated) {
    return (
      <>
        <WordGameAtmosphere />
        <GameLobbyPendingOverlay message="Loading session…" />
      </>
    );
  }

  return (
    <WordGameAudioProvider enabled={isLolAudioEnabled}>
      <GameClientFrame
        className="sw-shell min-h-dvh relative overflow-x-hidden"
        headerClassName="sw-header border-0 bg-transparent"
        contentClassName="relative z-10 py-8 sm:py-12 px-4 sm:px-6"
        title="Secret Word"
        subtitle={wordGameMeta?.tagline}
        connected={connected}
        showConnection={false}
        onCancelMatch={
          isHost && inGame && !matchFinished ?
            () => setCancelConfirmOpen(true)
          : undefined
        }
        cancelMatchDisabled={cancelling}
        cancelMatchLabel={cancelling ? 'Cancelling…' : 'End match'}
        headerExtra={
          <>
            <ConnectionStatus connected={connected} variant="word" />
            <WordGamePlayerProfile
              nameLocked={!!inGame}
              audioEnabled={isLolAudioEnabled}
            />
          </>
        }
      >
        <WordGameAtmosphere />

        {!wordLobby && !wordgameEnabled && <InactiveGameScreen gameId="wordgame" />}

        {!wordLobby && wordgameEnabled && inviteJoin && (
          <div className="max-w-md mx-auto sw-animate-ascend">
            <WordPanelFrame className="p-6 sm:p-8">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleInviteJoin();
                }}
              >
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
                <label
                  htmlFor="sw-invite-name"
                  className="block text-[10px] sw-muted mb-2 uppercase tracking-widest"
                >
                  Champion Name
                </label>
                <input
                  id="sw-invite-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayNameState(e.target.value)}
                  className="sw-input normal-case tracking-normal text-left mb-6"
                  placeholder="Enter your name"
                  maxLength={20}
                  autoComplete="off"
                  enterKeyHint="go"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!connected || loading || !displayName.trim()}
                  className="sw-btn-primary"
                >
                  <LogIn className="w-4 h-4" />
                  {loading ? 'Entering…' : 'Enter Room'}
                </button>
              </form>
            </WordPanelFrame>
          </div>
        )}

        {!wordLobby && wordgameEnabled && !inviteJoin && (
          <div className="relative max-w-md w-full mx-auto sw-animate-ascend-slow">
            {!connected && (
              <p
                className="flex items-center justify-center gap-2 text-sm sw-muted mb-4"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
                Connecting to server…
              </p>
            )}
            {roomParam && loading && !autoJoined && (
              <p className="text-center text-sm sw-muted mb-4 animate-pulse-soft">
                Crossing into room {roomParam}…
              </p>
            )}
            {loading && pendingAction && (
              <GameLobbyPendingOverlay
                message={
                  pendingAction === 'create' ?
                    'Creating your lobby…'
                  :	'Joining room…'
                }
              />
            )}
            <WordPanelFrame className="p-6 sm:p-8">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleJoin();
                }}
              >
                <label
                  htmlFor="sw-create-name"
                  className="block text-[10px] sw-muted mb-2 uppercase tracking-widest"
                >
                  Champion Name
                </label>
                <input
                  id="sw-create-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayNameState(e.target.value)}
                  onBlur={() => displayName.trim() && setDisplayName(displayName)}
                  className="sw-input normal-case tracking-normal text-left mb-6"
                  placeholder="Your name"
                  maxLength={20}
                  autoComplete="off"
                />
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => void handleCreate()}
                    disabled={!connected || loading || !displayName.trim()}
                    className="sw-btn-primary"
                  >
                    <Plus className="w-4 h-4" />
                    {loading ? 'Forging…' : 'Create Room'}
                  </button>
                  <label htmlFor="sw-join-code" className="sr-only">
                    Room code
                  </label>
                  <input
                    id="sw-join-code"
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="sw-input uppercase tracking-[0.25em] text-center font-mono"
                    placeholder="ROOM CODE"
                    maxLength={8}
                    autoComplete="off"
                    enterKeyHint="go"
                  />
                  <button
                    type="submit"
                    disabled={!connected || loading || !joinCode.trim() || !displayName.trim()}
                    className="sw-btn-secondary w-full"
                  >
                    <LogIn className="w-4 h-4" />
                    {loading ? 'Entering…' : 'Join Room'}
                  </button>
                </div>
              </form>
            </WordPanelFrame>
          </div>
        )}

        {inLobby && wordLobby && (
          <div key="word-lobby" className="sw-view-mount">
            <WordLobby
              lobby={wordLobby}
              playerId={playerId}
              onKickPlayer={kickPlayer}
              onSettingsChange={updateRoomSettings}
              onStartGame={async () => {
                setStarting(true);
                await startGame();
                setStarting(false);
              }}
              onLeave={() => void leaveToHub()}
              starting={starting}
            />
          </div>
        )}

        {inGame && wordState && wordLobby && (
          <div key="word-game" className="sw-view-mount">
            <WordGameBoard
              gameState={wordState}
              lobby={wordLobby}
              playerId={playerId}
              isHost={isHost}
              postMatchBusy={postMatchBusy}
              tabFocusActive={matchInProgress}
              selfTabFocused={selfTabFocused}
              onHostPlayAgain={isHost ? handlePlayAgain : undefined}
              onHostReturnToLobby={isHost ? handleReturnToLobby : undefined}
              onSubmitWord={submitSecretWord}
              onSubmitChampion={submitSecretChampion}
              onConfirmGuessed={confirmWordGuessed}
            />
          </div>
        )}
      </GameClientFrame>

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
    </WordGameAudioProvider>
  );
}
