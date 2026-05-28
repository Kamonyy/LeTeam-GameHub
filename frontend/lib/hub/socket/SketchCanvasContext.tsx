'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { SketchStrokeBatch } from '@/games/sketch-draw/types';
import { socketDispatchRegistry, type SketchCanvasSyncPayload } from './dispatch-registry';
import { useSocketConnection } from './SocketConnectionContext';

export interface SketchCanvasContextValue {
  sketchDrawRemoteBatch: (SketchStrokeBatch & { _at?: number }) | null;
  sketchDrawCanvasSync: SketchCanvasSyncPayload;
  sketchDrawStrokeBatch: (
    batch: SketchStrokeBatch & { strokeComplete?: boolean }
  ) => void;
  sketchDrawCanvasUndo: () => Promise<boolean>;
  sketchDrawCanvasRedo: () => Promise<boolean>;
  sketchDrawCanvasClear: () => Promise<boolean>;
  sketchDrawCanvasFill: (x: number, y: number, color: string) => Promise<boolean>;
  requestSketchCanvasRecovery: () => void;
}

const SketchCanvasContext = createContext<SketchCanvasContextValue | null>(null);

export function SketchCanvasProvider({ children }: { children: ReactNode }) {
  const { socketRef } = useSocketConnection();
  const [sketchDrawRemoteBatch, setSketchDrawRemoteBatch] = useState<
    (SketchStrokeBatch & { _at?: number }) | null
  >(null);
  const [sketchDrawCanvasSync, setSketchDrawCanvasSync] =
    useState<SketchCanvasSyncPayload>(null);
  const recoveryRequestedRef = useRef(false);

  useEffect(() => {
    socketDispatchRegistry.setSketchRemoteBatch = setSketchDrawRemoteBatch;
    socketDispatchRegistry.setSketchCanvasSync = setSketchDrawCanvasSync;
    socketDispatchRegistry.clearSketchStreams = () => {
      setSketchDrawRemoteBatch(null);
      setSketchDrawCanvasSync(null);
      recoveryRequestedRef.current = false;
    };
    return () => {
      socketDispatchRegistry.setSketchRemoteBatch = null;
      socketDispatchRegistry.setSketchCanvasSync = null;
      socketDispatchRegistry.clearSketchStreams = null;
    };
  }, []);

  const sketchDrawStrokeBatch = useCallback(
    (batch: SketchStrokeBatch & { strokeComplete?: boolean }) => {
      const socket = socketRef.current;
      if (!socket?.connected) return;
      if (!Array.isArray(batch?.points) || batch.points.length === 0) return;
      socket.emit('sketch-draw:canvas:stroke:batch', batch, () => {});
    },
    [socketRef]
  );

  const requestSketchCanvasRecovery = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected || recoveryRequestedRef.current) return;
    recoveryRequestedRef.current = true;
    socket.emit('sketch-draw:canvas:recovery:request', {}, (res: { error?: string }) => {
      if (res?.error) recoveryRequestedRef.current = false;
    });
  }, [socketRef]);

  const sketchDrawCanvasUndo = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        resolve(false);
        return;
      }
      socket.emit('sketch-draw:canvas:undo', {}, (res: { error?: string }) => {
        resolve(!res?.error);
      });
    });
  }, [socketRef]);

  const sketchDrawCanvasRedo = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        resolve(false);
        return;
      }
      socket.emit('sketch-draw:canvas:redo', {}, (res: { error?: string }) => {
        resolve(!res?.error);
      });
    });
  }, [socketRef]);

  const sketchDrawCanvasClear = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        resolve(false);
        return;
      }
      socket.emit('sketch-draw:canvas:clear', {}, (res: { error?: string }) => {
        resolve(!res?.error);
      });
    });
  }, [socketRef]);

  const sketchDrawCanvasFill = useCallback(
    (x: number, y: number, color: string) => {
      return new Promise<boolean>((resolve) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(false);
          return;
        }
        socket.emit(
          'sketch-draw:canvas:fill',
          { x, y, color },
          (res: { error?: string }) => {
            resolve(!res?.error);
          }
        );
      });
    },
    [socketRef]
  );

  const value = useMemo(
    () => ({
      sketchDrawRemoteBatch,
      sketchDrawCanvasSync,
      sketchDrawStrokeBatch,
      sketchDrawCanvasUndo,
      sketchDrawCanvasRedo,
      sketchDrawCanvasClear,
      sketchDrawCanvasFill,
      requestSketchCanvasRecovery,
    }),
    [
      sketchDrawRemoteBatch,
      sketchDrawCanvasSync,
      sketchDrawStrokeBatch,
      sketchDrawCanvasUndo,
      sketchDrawCanvasRedo,
      sketchDrawCanvasClear,
      sketchDrawCanvasFill,
      requestSketchCanvasRecovery,
    ]
  );

  return (
    <SketchCanvasContext.Provider value={value}>
      {children}
    </SketchCanvasContext.Provider>
  );
}

export function useSketchCanvas(): SketchCanvasContextValue {
  const ctx = useContext(SketchCanvasContext);
  if (!ctx) {
    throw new Error('useSketchCanvas must be used within SketchCanvasProvider');
  }
  return ctx;
}
