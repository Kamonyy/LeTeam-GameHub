'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { useGameRoom, useCoreSession } from '@/hooks/useSocket';
import { useLeaveToHub } from '@/lib/hub/useLeaveToHub';
import {
  useNotifyRouteContentReady,
  useViewNavigator,
} from '@/lib/hub/ViewTransitionProvider';
import { navigateToGameLobby } from '@/lib/hub/navigateToGameLobby';
import HubGameLoadingScreen from '@/components/hub/arcade/HubGameLoadingScreen';
import { setDisplayName, getDisplayName } from '@/lib/player';
import { normalizeRoomCode } from '@/lib/hub/room';
import { useSpectatorAutoLeave } from '@/lib/hub/useSpectatorAutoLeave';
import WordGamePlayerProfile from '@/games/wordgame/components/WordGamePlayerProfile';
import ErrorToast from '@/components/shared/ErrorToast';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import WordLobby from '@/games/wordgame/components/WordLobby';
import InactiveGameScreen from '@/components/hub/InactiveGameScreen';
import { getGameEntry, isGameActive } from '@/lib/hub/games-registry';
import WordGameBoard from '@/games/wordgame/components/WordGameBoard';
import WordGameSpectatorBoard from '@/games/wordgame/components/WordGameSpectatorBoard';
import WordSpectatorBanner from '@/games/wordgame/components/WordSpectatorBanner';
import WordGameAtmosphere from '@/games/wordgame/components/WordGameAtmosphere';
import ConnectionStatus from '@/components/hub/ConnectionStatus';
import { useWordGameTabFocus } from '@/games/wordgame/hooks/useWordGameTabFocus';
import WordPanelFrame from '@/games/wordgame/components/WordPanelFrame';
import WordGameAudioProvider from '@/games/wordgame/components/WordGameAudioProvider';
import GameLobbyPendingOverlay from '@/components/hub/GameLobbyPendingOverlay';
import GameClientFrame from '@/components/ui/GameClientFrame';
import {
  useDelayedUnmount,
  MOTION_UI_MS,
} from '@/hooks/useDelayedUnmount';
import clsx from 'clsx';
import '@/games/wordgame/wordgame.css';

export default function WordGameClient() {
  const searchParams = useSearchParams();
  const navigateWithTransition = useViewNavigator();
  const roomParam = searchParams.get('room');
  const spectateParam =
    searchParams.get('spectate') === '1' || searchParams.get('spectate') === 'true';

  const wordgameEnabled = isGameActive('wordgame');
  const { isHydrated } = useCoreSession();
  const notifyRouteContentReady = useNotifyRouteContentReady();
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
    isSpectator,
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
    spectateParam,
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

  useEffect(() => {
    if (isHydrated) {
      notifyRouteContentReady();
    }
  }, [isHydrated, notifyRouteContentReady]);

  const handleCreate = async () => {
    if (!displayName.trim()) return;
    setLoading(true);
    setPendingAction('create');
    setDisplayName(displayName);
    try {
      const roomId = await createRoom(displayName.trim(), 'wordgame');
      if (roomId) {
        setAutoJoined(true);
        navigateToGameLobby(navigateWithTransition, roomId, 'wordgame', {
          replace: true,
        });
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
        navigateToGameLobby(navigateWithTransition, code, 'wordgame');
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
      navigateToGameLobby(navigateWithTransition, code, 'wordgame', {
        replace: true,
      });
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
  const isRoomPlayer =
    wordLobby?.players?.some((p) => p.id === playerId) ?? false;
  // Active roster in lobby.players overrides isSpectator during hydration flicker.
  const viewingAsSpectator = isSpectator && !isRoomPlayer;
  const isHost = wordLobby?.hostId === playerId;

  useEffect(() => {
    if (!spectateParam || !roomParam || !isRoomPlayer) return;
    const code = normalizeRoomCode(roomParam);
    if (!code) return;
    navigateToGameLobby(navigateWithTransition, code, 'wordgame', {
      replace: true,
    });
  }, [spectateParam, roomParam, isRoomPlayer, navigateWithTransition]);

  useSpectatorAutoLeave({ lobby: wordLobby, isSpectator: viewingAsSpectator });

  const wordGameMeta = getGameEntry('wordgame');
  const inLobby = wordLobby?.status === 'lobby' && !viewingAsSpectator;
  const spectatorWaiting =
    viewingAsSpectator && wordLobby && wordLobby.status === 'lobby';
  const matchFinished = wordState?.phase === 'match_over';
  const inGame =
    isRoomPlayer &&
    wordLobby &&
    wordState &&
    (wordLobby.status === 'playing' ||
      wordLobby.status === 'finished' ||
      matchFinished);
  const showSpectatorMatch =
    viewingAsSpectator &&
    wordLobby?.status === 'playing' &&
    wordState;

  const lobbyMounted = !!(inLobby && wordLobby);
  const gameMounted = !!(inGame && wordState && wordLobby);

  /** Lobby unmounted but engine payload not yet received over the socket. */
  const isHydratingGamePayload =
    !!wordLobby &&
    wordLobby.status === 'playing' &&
    !wordState &&
    (isRoomPlayer || viewingAsSpectator);

  const { shouldRender: renderLobby, animationState: lobbyPhase } =
    useDelayedUnmount(lobbyMounted, MOTION_UI_MS);
  const { shouldRender: renderGame, animationState: gamePhase } =
    useDelayedUnmount(gameMounted, MOTION_UI_MS);

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
  const selfTabFocused = useWordGameTabFocus(
    matchInProgress && isRoomPlayer,
    reportWordTabFocus
  );

  if (!isHydrated) {
    return <HubGameLoadingScreen gameId="wordgame" />;
  }

  return (
    <WordGameAudioProvider enabled={isLolAudioEnabled}>
      <GameClientFrame
        className="sw-shell min-h-dvh relative overflow-x-hidden"
        engagementRoomId={wordLobby?.roomId}
        headerClassName="sw-header border-0 bg-transparent"
        contentClassName={
          viewingAsSpectator && (showSpectatorMatch || spectatorWaiting) ?
            'relative z-10 py-4 sm:py-6 px-4 sm:px-6'
          :	'relative z-10 py-8 sm:py-12 px-4 sm:px-6'
        }
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
              nameLocked={!!inGame || viewingAsSpectator}
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

        {spectatorWaiting && wordLobby && (
          <div key="word-spectator-wait" className="max-w-md mx-auto sw-view-mount">
            <WordSpectatorBanner
              roomId={wordLobby.roomId}
              onLeave={() => void leaveToHub()}
            />
            <p className="text-center text-sm sw-muted mt-4">
              Waiting for the host to start the match.
            </p>
          </div>
        )}

        {showSpectatorMatch && wordState && wordLobby && (
          <div key="word-spectator" className="sw-view-mount space-y-3">
            <WordSpectatorBanner
              roomId={wordLobby.roomId}
              onLeave={() => void leaveToHub()}
            />
            <WordGameSpectatorBoard
              gameState={wordState}
              lobby={wordLobby}
            />
          </div>
        )}

        {(renderLobby || renderGame || isHydratingGamePayload) && (
          <div className="relative w-full min-h-[min(28rem,60dvh)] motion-layer-isolated">
            {renderLobby && wordLobby && (
              <div
                className={clsx(
                  'w-full transition-all duration-ui ease-premium-fluid motion-reduce:transition-none',
                  lobbyPhase === 'exiting' &&
                    'pointer-events-none opacity-0 -translate-y-6',
                  (lobbyPhase === 'idle' || lobbyPhase === 'entering') &&
                    'translate-y-0 opacity-100',
                )}
              >
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

            {isHydratingGamePayload && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-hub-bg/80 motion-reduce:animate-none animate-radix-enter"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <Loader2
                  className="h-8 w-8 animate-spin text-hub-accent"
                  aria-hidden
                />
                <p className="text-sm text-hub-muted">Loading match…</p>
              </div>
            )}

            {renderGame && wordState && wordLobby && (
              <div
                className={clsx(
                  'absolute inset-0 w-full transition-all duration-ui ease-premium-in motion-reduce:transition-none',
                  gamePhase === 'entering' &&
                    'translate-y-4 scale-[0.98] opacity-0',
                  gamePhase !== 'entering' &&
                    'translate-y-0 scale-100 opacity-100',
                )}
              >
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
