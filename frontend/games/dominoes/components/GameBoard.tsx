'use client';

import { useState, useEffect, useCallback, useMemo, type DragEvent } from 'react';
import { Trophy, RotateCcw, Sparkles } from 'lucide-react';
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

function tilesMatch(a: Tile, b: Tile) {
  return (
    (a.left === b.left && a.right === b.right) ||
    (a.left === b.right && a.right === b.left)
  );
}

function OpponentSeat({
  id,
  name,
  tileCount,
  isActive,
  isTeamMode,
  teamId,
  position,
}: {
  id: string;
  name: string;
  tileCount: number;
  isActive: boolean;
  isTeamMode: boolean;
  teamId?: 'team1' | 'team2';
  position: 'top' | 'left' | 'right';
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center gap-2 px-4 py-3 rounded-2xl border backdrop-blur-sm transition-all duration-500',
        isActive
          ? 'border-hub-accent/50 bg-hub-accent/10 shadow-lg shadow-hub-accent/15 scale-[1.02]'
          : 'border-hub-border/60 bg-hub-surface/70',
        isTeamMode && teamId === 'team1' && 'ring-1 ring-blue-500/30',
        isTeamMode && teamId === 'team2' && 'ring-1 ring-amber-500/30',
        position === 'left' && 'lg:self-center',
        position === 'right' && 'lg:self-center',
        position === 'top' && 'lg:justify-self-center'
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={clsx(
            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase',
            isActive ? 'bg-hub-accent text-white' : 'bg-hub-border text-hub-muted'
          )}
        >
          {name.charAt(0)}
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-gray-100 leading-tight truncate max-w-[100px]">
            {name}
          </p>
          {isTeamMode && teamId && (
            <p className="text-[10px] text-hub-muted">{TEAM_LABELS[teamId]}</p>
          )}
        </div>
      </div>
      <div className="flex gap-0.5 justify-center flex-wrap max-w-[140px]">
        {Array.from({ length: tileCount }).map((_, i) => (
          <div
            key={`${id}-${i}`}
            className="domino-back w-3.5 h-5 rounded-sm transition-transform duration-300"
            style={{ transform: `rotate(${(i - tileCount / 2) * 3}deg)` }}
          />
        ))}
      </div>
      <span className="text-[10px] text-hub-muted tabular-nums">{tileCount} tiles</span>
    </div>
  );
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
  const [dragTile, setDragTile] = useState<Tile | null>(null);
  const [dragOverEnd, setDragOverEnd] = useState<'left' | 'right' | null>(null);
  const [localTimer, setLocalTimer] = useState(gameState.turnTimeRemaining);
  const [recentlyPlaced, setRecentlyPlaced] = useState<number | null>(null);

  const isMyTurn = gameState.currentPlayerId === playerId;
  const isTeamMode = gameState.settings?.mode === '2v2';
  const scoreCap = gameState.settings?.scoreCap ?? 100;

  const playerNames = useMemo(
    () => Object.fromEntries(lobby.players.map((p) => [p.id, p.displayName])),
    [lobby.players]
  );

  const opponents = useMemo(
    () => gameState.playerIds.filter((id) => id !== playerId),
    [gameState.playerIds, playerId]
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
      const t = setTimeout(() => setRecentlyPlaced(null), 700);
      return () => clearTimeout(t);
    }
  }, [gameState.lastAction, gameState.board.length]);

  useEffect(() => {
    if (gameState.phase === 'playing') {
      setSelectedTile(null);
      setDragTile(null);
      setDragOverEnd(null);
    }
  }, [gameState.currentPlayerId, gameState.phase]);

  const validMoves = gameState.validMoves || [];

  const isPlayable = useCallback(
    (tile: Tile): ValidMove[] => {
      if (!isMyTurn) return [];
      return validMoves.filter((m) => tilesMatch(m.tile, tile));
    },
    [isMyTurn, validMoves]
  );

  const canPlayEnd = (end: 'left' | 'right') =>
    validMoves.some((m) => m.end === end);

  const playTile = (tile: Tile, end: 'left' | 'right') => {
    if (!isPlayable(tile).some((m) => m.end === end)) return;
    onPlayMove(tile, end);
    setSelectedTile(null);
    setDragTile(null);
    setDragOverEnd(null);
  };

  const handleTileClick = (tile: Tile) => {
    if (!isMyTurn) return;
    const moves = isPlayable(tile);
    if (moves.length === 0) return;

    if (moves.length === 1) {
      playTile(tile, moves[0].end);
      return;
    }

    setSelectedTile(
      selectedTile && tilesMatch(selectedTile, tile) ? null : tile
    );
  };

  const handleBoardEndClick = (end: 'left' | 'right') => {
    const tile = dragTile || selectedTile;
    if (!tile) return;
    playTile(tile, end);
  };

  const handleDragStart = (tile: Tile) => (e: DragEvent) => {
    const moves = isPlayable(tile);
    if (moves.length === 0) {
      e.preventDefault();
      return;
    }
    setDragTile(tile);
    setSelectedTile(tile);
    e.dataTransfer.setData('application/json', JSON.stringify(tile));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDragTile(null);
    setDragOverEnd(null);
  };

  const handleDropOnEnd = (end: 'left' | 'right') => (e: DragEvent) => {
    e.preventDefault();
    let tile = dragTile;
    if (!tile) {
      try {
        tile = JSON.parse(e.dataTransfer.getData('application/json')) as Tile;
      } catch {
        tile = null;
      }
    }
    if (tile) playTile(tile, end);
    setDragOverEnd(null);
  };

  const handleDragOverEnd = (end: 'left' | 'right') => (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverEnd(end);
  };

  const canDraw =
    isMyTurn && validMoves.length === 0 && gameState.boneyardCount > 0;
  const showDropZones = isMyTurn && gameState.phase === 'playing';
  const activeDragTile = dragTile || selectedTile;

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

  const opponentPositions: Array<'top' | 'left' | 'right'> =
    opponents.length === 1
      ? ['top']
      : opponents.length === 2
        ? ['left', 'right']
        : ['left', 'top', 'right'];

  if (gameState.phase === 'match_over') {
    const won = isTeamMode
      ? gameState.matchWinnerId === gameState.teamIds[playerId]
      : gameState.matchWinnerId === playerId;
    const winnerLabel = isTeamMode
      ? TEAM_LABELS[gameState.matchWinnerId as 'team1' | 'team2'] ?? 'Team'
      : playerNames[gameState.matchWinnerId || ''] || 'Unknown';

    return (
      <div className="flex flex-col items-center justify-center gap-8 py-16 animate-fade-in">
        <Trophy
          className={clsx(
            'w-24 h-24 animate-overlay-pop',
            won ? 'text-amber-400 drop-shadow-[0_0_24px_rgba(251,191,36,0.4)]' : 'text-hub-muted'
          )}
        />
        <div className="text-center">
          <p className="text-sm text-hub-muted uppercase tracking-widest mb-2">Match Complete</p>
          <h2 className="text-4xl font-black mb-2">{won ? 'Victory!' : `${winnerLabel} wins!`}</h2>
          <p className="text-hub-muted">
            First to {scoreCap} points · {gameState.roundNumber} rounds
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4 w-full max-w-2xl px-4">{scoreBars}</div>
      </div>
    );
  }

  if (gameState.phase === 'round_over') {
    const roundWinner = playerNames[gameState.roundWinnerId || ''] || 'Unknown';
    const reason = gameState.lastAction?.reason;

    return (
      <div className="flex flex-col items-center gap-8 py-12 animate-fade-in">
        <div
          className={clsx(
            'px-10 py-6 rounded-2xl border-2 text-center animate-overlay-pop',
            reason === 'domino'
              ? 'border-amber-400/50 bg-amber-950/40 shadow-lg shadow-amber-500/10'
              : 'border-orange-400/40 bg-orange-950/30'
          )}
        >
          <p className="text-4xl font-black tracking-wider mb-1">
            {reason === 'domino' ? 'DOMINO!' : 'TABLE LOCKED'}
          </p>
          <p className="text-hub-muted">
            {roundWinner} wins round {gameState.roundNumber}
            {gameState.lastAction?.points != null && ` · +${gameState.lastAction.points} pts`}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 w-full max-w-3xl px-4">{scoreBars}</div>
        <p className="text-sm text-hub-muted flex items-center gap-2 animate-pulse-soft">
          <RotateCcw className="w-4 h-4" />
          Next round starting…
        </p>
      </div>
    );
  }

  return (
    <div className="domino-arena flex flex-col gap-4 w-full max-w-6xl mx-auto min-h-[calc(100dvh-5rem)] animate-fade-in pb-4">
      {/* Score strip */}
      <div className="flex flex-col gap-2 px-1">
        <div className="flex items-center justify-center gap-2 text-xs text-hub-muted uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5 text-hub-accent" />
          Round {gameState.roundNumber} · First to {scoreCap}
        </div>
        <div className="flex flex-wrap justify-center gap-2">{scoreBars}</div>
      </div>

      <TurnIndicator
        currentPlayerId={gameState.currentPlayerId}
        myPlayerId={playerId}
        playerNames={playerNames}
        turnTimeRemaining={localTimer}
        turnTimerPaused={gameState.turnTimerPaused}
      />

      {/* Arena: opponents + square table */}
      <div className="flex-1 flex flex-col gap-4 min-h-[320px]">
        <div className="flex flex-wrap justify-center gap-3">
          {opponents.map((id, idx) => (
            <OpponentSeat
              key={id}
              id={id}
              name={playerNames[id] || 'Player'}
              tileCount={gameState.tileCounts[id] || 0}
              isActive={id === gameState.currentPlayerId}
              isTeamMode={isTeamMode}
              teamId={gameState.teamIds[id]}
              position={opponentPositions[idx] ?? 'top'}
            />
          ))}
        </div>

        {/* Square table */}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 w-full">
          <div className="domino-table-square animate-table-glow relative flex items-center justify-center p-4 sm:p-6">
            <GameActionOverlay
              lastAction={gameState.lastAction}
              playerNames={playerNames}
            />

            {gameState.board.length === 0 ? (
              <div className="relative z-10 flex flex-col items-center justify-center gap-4">
                <DropZone
                  end="left"
                  active={showDropZones}
                  valid={validMoves.length > 0}
                  previewTile={activeDragTile}
                  dragOver={dragOverEnd === 'left'}
                  onClick={() => activeDragTile && handleBoardEndClick('left')}
                  onDragOver={handleDragOverEnd('left')}
                  onDragLeave={() => setDragOverEnd(null)}
                  onDrop={handleDropOnEnd('left')}
                  vertical={false}
                  large
                />
                {!showDropZones && (
                  <p className="text-emerald-200/40 text-sm font-medium tracking-wide">
                    Play the first tile
                  </p>
                )}
              </div>
            ) : (
              <div className="relative z-10 w-full h-full flex items-center justify-center overflow-auto scrollbar-thin max-h-full">
                <div className="flex items-center gap-0 py-4 px-2 transition-all duration-500 ease-out">
                  <DropZone
                    end="left"
                    active={showDropZones}
                    valid={canPlayEnd('left')}
                    previewTile={activeDragTile}
                    dragOver={dragOverEnd === 'left'}
                    onClick={() => handleBoardEndClick('left')}
                    onDragOver={handleDragOverEnd('left')}
                    onDragLeave={() => setDragOverEnd(null)}
                    onDrop={handleDropOnEnd('left')}
                    large
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
                        'transition-all duration-500',
                        recentlyPlaced === i && 'animate-tile-snap z-10',
                        i > 0 && '-ml-0.5'
                      )}
                    />
                  ))}

                  <DropZone
                    end="right"
                    active={showDropZones}
                    valid={canPlayEnd('right')}
                    previewTile={activeDragTile}
                    dragOver={dragOverEnd === 'right'}
                    onClick={() => handleBoardEndClick('right')}
                    onDragOver={handleDragOverEnd('right')}
                    onDragLeave={() => setDragOverEnd(null)}
                    onDrop={handleDropOnEnd('right')}
                    large
                  />
                </div>
              </div>
            )}

            {gameState.openEnds && gameState.board.length > 0 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-4 text-xs font-mono">
                <span className="px-3 py-1 rounded-full bg-black/40 text-emerald-300/90 border border-emerald-500/20 backdrop-blur-sm">
                  ◀ {gameState.openEnds.left}
                </span>
                <span className="px-3 py-1 rounded-full bg-black/40 text-emerald-300/90 border border-emerald-500/20 backdrop-blur-sm">
                  {gameState.openEnds.right} ▶
                </span>
              </div>
            )}
          </div>

          {gameState.boneyardCount > 0 && (
            <Boneyard count={gameState.boneyardCount} canDraw={canDraw} onDraw={onDraw} />
          )}
        </div>
      </div>

      {/* Player hand */}
      <div className="domino-hand-rail rounded-2xl border border-hub-border/40 mt-auto pt-6 pb-4 px-2 sm:px-4">
        <p className="text-center text-[10px] uppercase tracking-widest text-hub-muted mb-4">
          Your hand · {isMyTurn ? 'Drag a tile to the table or tap to select' : 'Waiting for your turn'}
        </p>

        <div className="domino-hand-fan flex justify-center items-end min-h-[7.5rem] gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
          {gameState.myHand.map((tile, i) => {
            const playable = isPlayable(tile).length > 0;
            const isSelected =
              selectedTile !== null && tilesMatch(selectedTile, tile);
            const isDragging =
              dragTile !== null && tilesMatch(dragTile, tile);
            const count = gameState.myHand.length;
            const center = (count - 1) / 2;
            const spread = count > 1 ? (i - center) * (count > 5 ? 4 : 6) : 0;
            const lift = Math.abs(i - center) * 1.5;
            const fanTransform = isSelected
              ? `rotate(${spread}deg) translateY(-1.75rem) scale(1.08)`
              : `rotate(${spread}deg) translateY(${lift}px)`;

            return (
              <DominoTile
                key={`${tile.left}-${tile.right}-${i}`}
                left={tile.left}
                right={tile.right}
                playable={playable && isMyTurn}
                selected={isSelected}
                dragging={isDragging}
                draggable={playable && isMyTurn}
                onDragStart={handleDragStart(tile)}
                onDragEnd={handleDragEnd}
                onClick={() => handleTileClick(tile)}
                className="animate-hand-deal origin-bottom transition-transform duration-300"
                style={{
                  animationDelay: `${i * 55}ms`,
                  transform: fanTransform,
                  zIndex: isSelected || isDragging ? 30 : i + 1,
                }}
              />
            );
          })}
        </div>

        {selectedTile && isMyTurn && isPlayable(selectedTile).length > 1 && !dragTile && (
          <p className="text-center text-sm text-emerald-400/90 animate-pulse-soft mt-3">
            Drop on a glowing zone — or tap left / right on the table
          </p>
        )}

        {canDraw && (
          <p className="text-center text-xs text-hub-muted mt-2">
            No valid moves — draw from the boneyard
          </p>
        )}
      </div>
    </div>
  );
}
