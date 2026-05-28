import type { SketchDrawTimeTick } from '@/hooks/useSocket';
import type { SketchStrokeBatch } from '@/games/sketch-draw/types';

export type SketchCanvasSyncPayload = {
  canvasBuffer: SketchStrokeBatch[];
  canvasBufferVersion: number;
  at: number;
} | null;

type TickSetter = (tick: SketchDrawTimeTick | null) => void;
type RemoteBatchSetter = (
  batch: (SketchStrokeBatch & { _at?: number }) | null
) => void;
type CanvasSyncSetter = (sync: SketchCanvasSyncPayload) => void;

/** Bridges SocketProvider socket listeners to isolated context state setters. */
export const socketDispatchRegistry = {
  setGameTimerTick: null as TickSetter | null,
  setSketchRemoteBatch: null as RemoteBatchSetter | null,
  setSketchCanvasSync: null as CanvasSyncSetter | null,
  clearSketchStreams: null as (() => void) | null,
};
