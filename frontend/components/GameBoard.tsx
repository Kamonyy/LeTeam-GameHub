'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SkipForward, Trophy } from 'lucide-react';
import DominoTile from './DominoTile';
import TurnIndicator from './TurnIndicator';
import Boneyard from './Boneyard';
import type { GameState, LobbyState, Tile, ValidMove } from '@/lib/types';

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

  const isMyTurn = gameState.currentPlayerId === playerId;
  const playerNames = useMemo(
    () =>
      Object.fromEntries(
        lobby.players.map((p) => [p.id, p.displayName])
      ),
    [lobby.players]
  );

  /** Client-side countdown interpolation between server ticks */
  useEffect(() => {
    setLocalTimer(gameState.turnTimeRemaining);
    if (gameState.turnTimerPaused || gameState.phase === 'finished') return;

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
  const canPass =
    isMyTurn && validMoves.length === 0 && gameState.boneyardCount === 0;

  if (gameState.phase === 'finished') {
    const won = gameState.winnerId === playerId;
    const winnerName =
      playerNames[gameState.winnerId || ''] || 'Unknown';

    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 animate-fade-in">
        <Trophy
          className={`w-16 h-16 ${won ? 'text-hub-warning' : 'text-hub-muted'}`}
        />
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">
            {won ? 'You won!' : `${winnerName} wins!`}
          </h2>
          {gameState.lastAction && (
            <p className="text-hub-muted">
              +{(gameState.lastAction as { points?: number }).points ?? 0} points
            </p>
          )}
        </div>
        <div className="flex gap-6">
          {gameState.playerIds.map((id) => (
            <div key={id} className="text-center">
              <p className="text-sm text-hub-muted">{playerNames[id]}</p>
              <p className="text-xl font-bold">{gameState.scores[id] ?? 0}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto animate-fade-in">
      {/* Opponent tile counts */}
      <div className="flex justify-center gap-8">
        {gameState.playerIds
          .filter((id) => id !== playerId)
          .map((id) => (
            <div
              key={id}
              className={`text-center px-4 py-2 rounded-lg border ${
                id === gameState.currentPlayerId
                  ? 'border-hub-accent/40 bg-hub-accent/10'
                  : 'border-hub-border bg-hub-surface'
              }`}
            >
              <p className="text-xs text-hub-muted mb-1">{playerNames[id]}</p>
              <div className="flex gap-0.5 justify-center">
                {Array.from({ length: gameState.tileCounts[id] || 0 }).map(
                  (_, i) => (
                    <div
                      key={i}
                      className="w-3 h-5 bg-[#e8e0d4] rounded-sm border border-gray-400"
                    />
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

      {/* Board — line of play */}
      <div className="relative min-h-[120px] flex items-center justify-center py-8 px-4">
        {gameState.board.length === 0 ? (
          <div className="flex items-center gap-8">
            <button
              onClick={() => selectedTile && handleBoardEndClick('left')}
              className="w-24 h-12 border-2 border-dashed border-hub-border rounded-lg
                         flex items-center justify-center text-hub-muted text-xs
                         hover:border-hub-accent/50 transition-colors"
            >
              Play here
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-0 overflow-x-auto max-w-full py-2 px-2">
            {/* Left end drop zone */}
            {selectedTile && isMyTurn && (
              <button
                onClick={() => handleBoardEndClick('left')}
                className="shrink-0 w-8 h-16 border-2 border-dashed border-hub-accent/50 rounded
                           mr-1 hover:bg-hub-accent/10 transition-colors"
                aria-label="Play on left end"
              />
            )}

            {gameState.board.map((tile, i) => (
              <DominoTile
                key={i}
                left={tile.left}
                right={tile.right}
                horizontal
                compact
              />
            ))}

            {/* Right end drop zone */}
            {selectedTile && isMyTurn && (
              <button
                onClick={() => handleBoardEndClick('right')}
                className="shrink-0 w-8 h-16 border-2 border-dashed border-hub-accent/50 rounded
                           ml-1 hover:bg-hub-accent/10 transition-colors"
                aria-label="Play on right end"
              />
            )}
          </div>
        )}

        {gameState.openEnds && gameState.board.length > 0 && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-4 text-xs text-hub-muted">
            <span>Left: {gameState.openEnds.left}</span>
            <span>Right: {gameState.openEnds.right}</span>
          </div>
        )}
      </div>

      {/* Actions + Boneyard */}
      <div className="flex items-center justify-center gap-6">
        <Boneyard count={gameState.boneyardCount} canDraw={canDraw} onDraw={onDraw} />

        {canPass && (
          <button onClick={onPass} className="btn-secondary flex items-center gap-2 text-sm">
            <SkipForward className="w-4 h-4" />
            Pass
          </button>
        )}
      </div>

      {/* Player hand */}
      <div className="flex flex-wrap justify-center gap-3 pb-8 pt-4 border-t border-hub-border">
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
        <p className="text-center text-sm text-hub-accent animate-pulse-soft">
          Choose left or right end to play
        </p>
      )}
    </div>
  );
}
