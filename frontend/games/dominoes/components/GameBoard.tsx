'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Trophy, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import DominoTile from './DominoTile';
import Boneyard from './Boneyard';
import DropZone from './DropZone';
import ScoreProgressBar from './ScoreProgressBar';
import GameActionOverlay from './GameActionOverlay';
import TurnIndicator from '@/components/shared/TurnIndicator';
import type { GameState, Tile, ValidMove } from '../types';
import { TEAM_LABELS } from '../types';
import type { LobbyState } from '@/lib/hub/types';

interface GameBoardProps {
  gameState: GameState;
  lobby: LobbyState;
  playerId: string;
  onPlayMove: (tile: Tile, end: 'left' | 'right') => void;
  onDraw: () => void;
  onPass: () => void;
}

export default function GameBoard({
  gameState,
  lobby,
  playerId,
  onPlayMove,
  onDraw,
  onPass,
}: GameBoardProps) {
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [localTimer, setLocalTimer] = useState(gameState.turnTimeRemaining);
  const [recentlyPlaced, setRecentlyPlaced] = useState<number | null>(null);

  const isMyTurn = gameState.currentPlayerId === playerId;
  const isTeamMode = gameState.settings?.mode === '2v2';
  const scoreCap = gameState.settings?.scoreCap ?? 100;

  const playerNames = useMemo(
    () => Object.fromEntries(lobby.players.map((p) => [p.id, p.displayName])),
    [lobby.players]
  );

  useEffect(() => {
    setLocalTimer(gameState.turnTimeRemaining);
    if (gameState.turnTimerPaused || gameState.phase !== 'playing') return;

    const interval = setInterval(() => {
      setLocalTimer((t) => Math.max(0, t - 100));
    }, 100);

    return () => clearInterval(interval);
  }, [
    gameState.turnTimeRemaining,
    gameState.turnTimerPaused,
    gameState.currentPlayerId,
    gameState.phase,
  ]);

  useEffect(() => {
    if (gameState.lastAction?.type === 'play') {
      setRecentlyPlaced(gameState.board.length - 1);
      const t = setTimeout(() => setRecentlyPlaced(null), 600);
      return () => clearTimeout(t);
    }
  }, [gameState.lastAction, gameState.board.length]);

  useEffect(() => {
    if (gameState.phase === 'playing') {
      setSelectedTile(null);
    }
  }, [gameState.currentPlayerId, gameState.phase]);

  const validMoves = gameState.validMoves || [];

  const isPlayable = useCallback(
    (tile: Tile): ValidMove[] => {
      if (!isMyTurn) return [];
      return validMoves.filter(
        (m) =>
          (m.tile.left === tile.left && m.tile.right === tile.right) ||
          (m.tile.left === tile.right && m.tile.right === tile.left)
      );
    },
    [isMyTurn, validMoves]
  );

  const canPlayEnd = (end: 'left' | 'right') =>
    validMoves.some((m) => m.end === end);

  const handleTileClick = (tile: Tile) => {
    if (!isMyTurn) return;
    const moves = isPlayable(tile);
    if (moves.length === 0) return;

    if (moves.length === 1) {
      onPlayMove(tile, moves[0].end);
      setSelectedTile(null);
      return;
    }

    setSelectedTile(
      selectedTile &&
        selectedTile.left === tile.left &&
        selectedTile.right === tile.right
        ? null
        : tile
    );
  };

  const handleBoardEndClick = (end: 'left' | 'right') => {
    if (!selectedTile) return;
    const moves = isPlayable(selectedTile);
    if (moves.some((m) => m.end === end)) {
      onPlayMove(selectedTile, end);
      setSelectedTile(null);
    }
  };

  const canDraw =
    isMyTurn && validMoves.length === 0 && gameState.boneyardCount > 0;
  const showDropZones = isMyTurn && gameState.phase === 'playing';

  const scoreBars = isTeamMode ? (
    <>
      <ScoreProgressBar
        label={TEAM_LABELS.team1}
        score={gameState.matchScores.team1 ?? 0}
        cap={scoreCap}
        teamColor="blue"
        highlight={gameState.teamIds[playerId] === 'team1'}
      />
      <ScoreProgressBar
        label={TEAM_LABELS.team2}
        score={gameState.matchScores.team2 ?? 0}
        cap={scoreCap}
        teamColor="amber"
        highlight={gameState.teamIds[playerId] === 'team2'}
      />
    </>
  ) : (
    gameState.playerIds.map((id) => (
      <ScoreProgressBar
        key={id}
        label={playerNames[id] || 'Player'}
        score={gameState.matchScores[id] ?? 0}
        cap={scoreCap}
        highlight={id === playerId}
      />
    ))
  );

  if (gameState.phase === 'match_over') {
    const won = isTeamMode
      ? gameState.matchWinnerId === gameState.teamIds[playerId]
      : gameState.matchWinnerId === playerId;

    const winnerLabel = isTeamMode
      ? TEAM_LABELS[gameState.matchWinnerId as 'team1' | 'team2'] ?? 'Team'
      : playerNames[gameState.matchWinnerId || ''] || 'Unknown';

    return (
      <div className="flex flex-col items-center justify-center gap-8 py-12 animate-fade-in">
        <Trophy
          className={clsx(
            'w-20 h-20',
            won ? 'text-amber-400 drop-shadow-lg' : 'text-hub-muted'
          )}
        />
        <div className="text-center">
          <p className="text-sm text-hub-muted uppercase tracking-widest mb-2">
            Match Complete
          </p>
          <h2 className="text-3xl font-bold mb-2">
            {won ? 'Victory!' : `${winnerLabel} wins!`}
          </h2>
          <p className="text-hub-muted">
            First to {scoreCap} points after {gameState.roundNumber} rounds
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4 w-full max-w-2xl px-4">
          {scoreBars}
        </div>
      </div>
    );
  }

  if (gameState.phase === 'round_over') {
    const roundWinner =
      playerNames[gameState.roundWinnerId || ''] || 'Unknown';
    const reason = gameState.lastAction?.reason;

    return (
      <div className="flex flex-col items-center gap-8 py-10 animate-fade-in">
        <div
          className={clsx(
            'px-8 py-5 rounded-2xl border-2 text-center',
            reason === 'domino'
              ? 'border-amber-400/50 bg-amber-950/40'
              : 'border-orange-400/40 bg-orange-950/30'
          )}
        >
          <p className="text-3xl font-black tracking-wider mb-1">
            {reason === 'domino' ? 'DOMINO!' : 'TABLE LOCKED'}
          </p>
          <p className="text-hub-muted">
            {roundWinner} wins round {gameState.roundNumber}
            {gameState.lastAction?.points != null &&
              ` · +${gameState.lastAction.points} pts`}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 w-full max-w-3xl px-4">
          {scoreBars}
        </div>

        <p className="text-sm text-hub-muted flex items-center gap-2 animate-pulse-soft">
          <RotateCcw className="w-4 h-4" />
          Next round starting…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 w-full max-w-5xl mx-auto animate-fade-in">
      {/* Score progress */}
      <div className="flex flex-wrap justify-center gap-3 px-2">
        <span className="w-full text-center text-xs text-hub-muted uppercase tracking-widest mb-1">
          Round {gameState.roundNumber} · First to {scoreCap}
        </span>
        {scoreBars}
      </div>

      {/* Opponents */}
      <div className="flex flex-wrap justify-center gap-4">
        {gameState.playerIds
          .filter((id) => id !== playerId)
          .map((id) => (
            <div
              key={id}
              className={clsx(
                'text-center px-4 py-2 rounded-xl border transition-all duration-300',
                id === gameState.currentPlayerId
                  ? 'border-hub-accent/50 bg-hub-accent/10 shadow-lg shadow-hub-accent/10'
                  : 'border-hub-border bg-hub-surface/80',
                isTeamMode &&
                  gameState.teamIds[id] === 'team1' &&
                  'border-l-2 border-l-blue-500/40',
                isTeamMode &&
                  gameState.teamIds[id] === 'team2' &&
                  'border-l-2 border-l-amber-500/40'
              )}
            >
              <p className="text-xs text-hub-muted mb-1.5">
                {playerNames[id]}
                {isTeamMode && (
                  <span className="ml-1 opacity-70">
                    ({TEAM_LABELS[gameState.teamIds[id]]})
                  </span>
                )}
              </p>
              <div className="flex gap-0.5 justify-center">
                {Array.from({ length: gameState.tileCounts[id] || 0 }).map(
                  (_, i) => (
                    <div key={i} className="domino-back w-3 h-5 rounded-sm" />
                  )
                )}
              </div>
            </div>
          ))}
      </div>

      <TurnIndicator
        currentPlayerId={gameState.currentPlayerId}
        myPlayerId={playerId}
        playerNames={playerNames}
        turnTimeRemaining={localTimer}
        turnTimerPaused={gameState.turnTimerPaused}
      />

      {/* Felt board */}
      <div className="domino-table relative min-h-[160px] flex items-center justify-center py-10 px-4 rounded-2xl">
        <GameActionOverlay
          lastAction={gameState.lastAction}
          playerNames={playerNames}
        />

        {gameState.board.length === 0 ? (
          <div className="flex items-center justify-center">
            <DropZone
              end="left"
              active={showDropZones}
              valid={validMoves.length > 0}
              previewTile={selectedTile}
              onClick={() => selectedTile && handleBoardEndClick('left')}
              vertical={false}
            />
            {!showDropZones && (
              <p className="text-hub-muted/60 text-sm">Play the first tile</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-0 overflow-x-auto max-w-full py-3 px-2 scrollbar-thin">
            <DropZone
              end="left"
              active={showDropZones}
              valid={canPlayEnd('left')}
              previewTile={selectedTile}
              onClick={() => handleBoardEndClick('left')}
            />

            {gameState.board.map((tile, i) => (
              <DominoTile
                key={`${tile.left}-${tile.right}-${i}`}
                left={tile.left}
                right={tile.right}
                horizontal
                compact
                placed
                className={clsx(
                  recentlyPlaced === i && 'animate-tile-snap',
                  i > 0 && 'ml-0.5'
                )}
              />
            ))}

            <DropZone
              end="right"
              active={showDropZones}
              valid={canPlayEnd('right')}
              previewTile={selectedTile}
              onClick={() => handleBoardEndClick('right')}
            />
          </div>
        )}

        {gameState.openEnds && gameState.board.length > 0 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-6 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-black/30 text-emerald-300/90">
              ◀ {gameState.openEnds.left}
            </span>
            <span className="px-2 py-0.5 rounded bg-black/30 text-emerald-300/90">
              {gameState.openEnds.right} ▶
            </span>
          </div>
        )}
      </div>

      {/* Boneyard — hidden when empty (4-player block) */}
      {gameState.boneyardCount > 0 && (
        <div className="flex items-center justify-center gap-6">
          <Boneyard
            count={gameState.boneyardCount}
            canDraw={canDraw}
            onDraw={onDraw}
          />
        </div>
      )}

      {/* Player hand */}
      <div className="domino-hand-rail flex flex-wrap justify-center gap-3 pb-8 pt-5 px-4">
        {gameState.myHand.map((tile, i) => {
          const playable = isPlayable(tile).length > 0;
          const isSelected =
            selectedTile !== null &&
            selectedTile.left === tile.left &&
            selectedTile.right === tile.right;

          return (
            <DominoTile
              key={`${tile.left}-${tile.right}-${i}`}
              left={tile.left}
              right={tile.right}
              playable={playable}
              selected={isSelected}
              onClick={() => handleTileClick(tile)}
            />
          );
        })}
      </div>

      {selectedTile && isMyTurn && isPlayable(selectedTile).length > 1 && (
        <p className="text-center text-sm text-emerald-400/90 animate-pulse-soft -mt-4">
          Tap a glowing drop zone to play your tile
        </p>
      )}
    </div>
  );
}
