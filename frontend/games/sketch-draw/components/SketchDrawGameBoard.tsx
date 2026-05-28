'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LobbyState } from '@/lib/hub/types';
import { useSketchCanvas, useSocketActions } from '@/hooks/useSocket';
import type { SketchDrawGameState, SketchStrokeBatch } from '../types';
import DrawingBoard, { type DrawingBoardApi } from './DrawingBoard';
import ArtPalette from './ArtPalette';
import WordChoiceOverlay from './WordChoiceOverlay';
import GuessChatPanel from './GuessChatPanel';
import LeaderboardSidebar from './LeaderboardSidebar';
import WinnerPodium from './WinnerPodium';
import SketchDrawTimer from './SketchDrawTimer';
import WordBlanksBanner from './WordBlanksBanner';
import MatchEndStage from './MatchEndStage';
import SketchDrawMuteButton from './SketchDrawMuteButton';
import { useSketchDrawAudio } from '../hooks/useSketchDrawAudio';
import type { StrokeBatchPayload } from '../types';

type SketchDrawGameBoardProps = {
  lobby: LobbyState;
  state: SketchDrawGameState;
  playerId: string;
  onLeave: () => void;
  onCancel: () => void;
  onReturnToLobby: () => void;
  onDisbandRoom: () => void;
};

export default function SketchDrawGameBoard({
  lobby,
  state,
  playerId,
  onLeave,
  onCancel,
  onReturnToLobby,
  onDisbandRoom,
}: SketchDrawGameBoardProps) {
  const {
    sketchDrawStrokeBatch,
    sketchDrawCanvasUndo,
    sketchDrawCanvasRedo,
    sketchDrawCanvasClear,
    sketchDrawCanvasFill,
    sketchDrawRemoteBatch,
    sketchDrawCanvasSync,
    requestSketchCanvasRecovery,
  } = useSketchCanvas();
  const { sketchDrawSelectWord } = useSocketActions();

  const [tool, setTool] = useState('brush');
  const [color, setColor] = useState('#1a1a2e');
  const [brushSize, setBrushSize] = useState(8);
  const [canRedo, setCanRedo] = useState(false);
  const canvasApiRef = useRef<DrawingBoardApi | null>(null);

  const drawer = lobby.players.find((p) => p.id === state.currentDrawerId);
  const drawerName = drawer?.displayName ?? 'Artist';
  const secondsLeft = Math.ceil((state.phaseTimeRemaining ?? 0) / 1000);

  const onStrokeBatch = useCallback(
    (batch: StrokeBatchPayload) => {
      sketchDrawStrokeBatch(batch);
      setCanRedo(false);
    },
    [sketchDrawStrokeBatch]
  );

  const onFill = useCallback(
    (x: number, y: number, fillColor: string) => {
      void sketchDrawCanvasFill(x, y, fillColor);
      setCanRedo(false);
    },
    [sketchDrawCanvasFill]
  );

  const handleUndo = useCallback(async () => {
    const ok = await sketchDrawCanvasUndo();
    if (ok) setCanRedo(true);
  }, [sketchDrawCanvasUndo]);

  const handleRedo = useCallback(async () => {
    const ok = await sketchDrawCanvasRedo();
    if (ok) setCanRedo(false);
  }, [sketchDrawCanvasRedo]);

  const handleClear = useCallback(async () => {
    canvasApiRef.current?.localClear();
    setCanRedo(false);
    await sketchDrawCanvasClear();
  }, [sketchDrawCanvasClear]);

  const remoteBatch =
    sketchDrawRemoteBatch ?
      (() => {
        const { _at, ...rest } = sketchDrawRemoteBatch;
        void _at;
        return rest as SketchStrokeBatch;
      })()
    : null;

  const showTimer =
    state.phase === 'drawing' || state.phase === 'word_select';

  useEffect(() => {
    if (state.phase !== 'drawing' && state.phase !== 'word_select') return;
    requestSketchCanvasRecovery();
  }, [state.phase, state.roundNumber, requestSketchCanvasRecovery]);

  useSketchDrawAudio(state.phase);

  return (
    <div className="sketch-board-layout flex h-dvh max-h-dvh w-full max-w-[1600px] mx-auto overflow-hidden pb-[env(safe-area-inset-bottom)]">
      {state.phase === 'match_over' && (
        <WinnerPodium
          players={lobby.players}
          state={state}
          isHost={lobby.hostId === playerId}
          onReturnToLobby={onReturnToLobby}
          onExitEveryone={onDisbandRoom}
          onLeave={onLeave}
        />
      )}

      <LeaderboardSidebar players={lobby.players} state={state} playerId={playerId} />

      <div className="flex-1 flex flex-col lg:flex-row gap-2 p-2 min-w-0 min-h-0 overflow-hidden">
        <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-2">
          <header className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              className="sketch-exit-btn order-first"
              onClick={onLeave}
            >
              Exit
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-xs text-hub-muted uppercase tracking-wide">
                Round {state.roundNumber} / {state.totalRounds}
              </p>
              <h2 className="text-lg font-semibold truncate">
                {state.phase === 'word_select' && state.isDrawer ?
                  'Pick a word'
                : state.phase === 'drawing' ?
                  state.isDrawer ?
                    'Draw!'
                  : `${drawerName} is drawing`
                : state.phase === 'round_end' ?
                  'Round results'
                : 'Match over'}
              </h2>
            </div>

            {showTimer && (
              <SketchDrawTimer
                phase={state.phase}
                fallbackRemainingMs={state.phaseTimeRemaining ?? 0}
              />
            )}

            <SketchDrawMuteButton />

            <div className="flex gap-2 ml-auto">
              {lobby.hostId === playerId && (
                <button
                  type="button"
                  className="hub-btn-ghost text-xs text-red-400"
                  onClick={onCancel}
                >
                  End match
                </button>
              )}
            </div>
          </header>

          {state.phase === 'word_select' && state.isDrawer && state.wordOptions && (
            <WordChoiceOverlay
              words={state.wordOptions}
              secondsLeft={secondsLeft}
              onSelect={(i) => void sketchDrawSelectWord(i)}
            />
          )}

          {state.phase === 'word_select' && !state.isDrawer && (
            <p className="text-center text-hub-muted py-4 sketch-waiting shrink-0">
              {drawerName} is choosing a word…
            </p>
          )}

          {state.phase === 'drawing' && state.wordBlanks && (
            <WordBlanksBanner
              blanks={state.wordBlanks}
              drawerWord={state.drawerWord}
            />
          )}

          {state.phase === 'match_over' && (
            <MatchEndStage lobby={lobby} state={state} playerId={playerId} />
          )}

          {(state.phase === 'drawing' || state.phase === 'round_end') && (
            <div className="flex-1 min-h-0 flex flex-col gap-2">
              <DrawingBoard
                isDrawer={state.isDrawer}
                canDraw={state.canDraw}
                canvasBuffer={state.canvasBuffer}
                canvasBufferVersion={state.canvasBufferVersion}
                tool={tool}
                color={color}
                size={brushSize}
                onStrokeBatch={onStrokeBatch}
                onFill={onFill}
                canvasApiRef={canvasApiRef}
                remoteBatch={remoteBatch}
                syncBuffer={sketchDrawCanvasSync?.canvasBuffer ?? null}
                syncVersion={sketchDrawCanvasSync?.canvasBufferVersion}
              />
              {state.isDrawer && state.phase === 'drawing' && (
                <ArtPalette
                  tool={tool}
                  color={color}
                  brushSize={brushSize}
                  onToolChange={setTool}
                  onColorChange={setColor}
                  onBrushSizeChange={setBrushSize}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onClear={() => void handleClear()}
                  canRedo={canRedo}
                />
              )}
            </div>
          )}

          {state.phase === 'round_end' && state.revealedWord && (
            <p className="text-center text-lg shrink-0">
              Word: <span className="font-bold text-violet-300">{state.revealedWord}</span>
            </p>
          )}
        </div>

        <GuessChatPanel
          className="w-full lg:w-72 shrink-0 lg:max-h-full"
          canGuess={state.canGuess}
          guessFrozen={state.guessFrozen}
          phase={state.phase}
        />
      </div>
    </div>
  );
}
