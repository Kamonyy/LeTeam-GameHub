'use client';

import { useCallback, useEffect, useRef } from 'react';
import type {
  Canvas as FabricCanvas,
  Path,
  PencilBrush,
  TPointerEventInfo,
} from 'fabric';
import type { SketchStrokeBatch, StrokeBatchPayload } from '../types';
import {
  PAPER_COLOR,
  appendBatchToCanvas,
  clearFabricCanvas,
  fabricObjectToBatch,
  loadBufferOnCanvas,
  pathToBatch,
  styleFabricPath,
  applyFillToFabricCanvas,
  splitStrokePayload,
} from '../lib/fabricBoard';
import { disposeFillLayer } from '../lib/fillLayer';

type UseFabricBoardOptions = {
  isDrawer: boolean;
  canDraw: boolean;
  tool: string;
  color: string;
  size: number;
  canvasBuffer: SketchStrokeBatch[];
  canvasBufferVersion: number;
  onStrokeBatch: (batch: StrokeBatchPayload) => void;
  onFill?: (seedX: number, seedY: number, color: string) => void;
  remoteBatch?: SketchStrokeBatch | null;
  syncBuffer?: SketchStrokeBatch[] | null;
  syncVersion?: number;
};

export function useFabricBoard({
  isDrawer,
  canDraw,
  tool,
  color,
  size,
  canvasBuffer,
  canvasBufferVersion,
  onStrokeBatch,
  onFill,
  remoteBatch,
  syncBuffer,
  syncVersion,
}: UseFabricBoardOptions) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const sizeRef = useRef(size);
  const lastBufferVersionRef = useRef(-1);
  const isReplayingRef = useRef(false);
  const onStrokeBatchRef = useRef(onStrokeBatch);
  const onFillRef = useRef(onFill);
  const isDrawerRef = useRef(isDrawer);

  toolRef.current = tool;
  colorRef.current = color;
  sizeRef.current = size;
  onStrokeBatchRef.current = onStrokeBatch;
  onFillRef.current = onFill;
  isDrawerRef.current = isDrawer;

  const applyBufferIfNewer = useCallback(
    (buffer: SketchStrokeBatch[], version: number) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      if (version < lastBufferVersionRef.current) return;
      if (version === lastBufferVersionRef.current && version !== -1) return;

      lastBufferVersionRef.current = version;
      isReplayingRef.current = true;
      void loadBufferOnCanvas(canvas, buffer).finally(() => {
        isReplayingRef.current = false;
      });
    },
    []
  );

  const resizeCanvas = useCallback((canvas: FabricCanvas) => {
    const el = containerRef.current;
    if (!el) return;
    const w = Math.max(1, el.clientWidth);
    const h = Math.max(1, el.clientHeight);
    canvas.setDimensions({ width: w, height: h });
    canvas.renderAll();
  }, []);

  const updateBrush = useCallback((canvas: FabricCanvas) => {
    const drawing =
      canDraw && isDrawer && (tool === 'brush' || tool === 'eraser');
    canvas.isDrawingMode = drawing;

    if (!drawing) return;

    const brush = canvas.freeDrawingBrush as PencilBrush;
    if (brush) {
      brush.color = tool === 'eraser' ? 'rgba(0,0,0,1)' : color;
      brush.width = size;
    }
  }, [canDraw, isDrawer, tool, color, size]);

  useEffect(() => {
    const canvasEl = canvasElRef.current;
    const container = containerRef.current;
    if (!canvasEl || !container) return;

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    void import('fabric').then(({ Canvas, PencilBrush, Path }) => {
      if (disposed || !canvasElRef.current) return;

      const canvas = new Canvas(canvasElRef.current!, {
        backgroundColor: PAPER_COLOR,
        selection: false,
        isDrawingMode: false,
      });

      const brush = new PencilBrush(canvas);
      brush.color = colorRef.current;
      brush.width = sizeRef.current;
      canvas.freeDrawingBrush = brush;

      fabricRef.current = canvas;
      resizeCanvas(canvas);

      canvas.on('object:added', (e: { target?: unknown }) => {
        if (isReplayingRef.current || !isDrawerRef.current) return;
        const target = e.target;
        if (!(target instanceof Path)) return;

        const path = target;
        styleFabricPath(
          path,
          toolRef.current,
          colorRef.current,
          sizeRef.current
        );

        const w = canvas.getWidth();
        const h = canvas.getHeight();
        const batch = pathToBatch(
          path,
          w,
          h,
          toolRef.current,
          colorRef.current,
          sizeRef.current
        );

        if (batch.points.length > 0) {
          for (const chunk of splitStrokePayload(batch)) {
            onStrokeBatchRef.current(chunk);
          }
        }
        canvas.renderAll();
      });

      resizeObserver = new ResizeObserver(() => {
        if (fabricRef.current) resizeCanvas(fabricRef.current);
      });
      resizeObserver.observe(container);
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      if (fabricRef.current) {
        disposeFillLayer(fabricRef.current);
        fabricRef.current.dispose();
      }
      fabricRef.current = null;
    };
  }, [resizeCanvas]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    updateBrush(canvas);
  }, [updateBrush]);

  useEffect(() => {
    applyBufferIfNewer(canvasBuffer, canvasBufferVersion);
  }, [canvasBuffer, canvasBufferVersion, applyBufferIfNewer]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !remoteBatch || isDrawer) return;
    isReplayingRef.current = true;
    void appendBatchToCanvas(canvas, remoteBatch).finally(() => {
      isReplayingRef.current = false;
    });
  }, [remoteBatch, isDrawer]);

  useEffect(() => {
    if (!syncBuffer || syncVersion == null) return;
    applyBufferIfNewer(syncBuffer, syncVersion);
  }, [syncBuffer, syncVersion, applyBufferIfNewer]);

  const handleFillDown = useCallback(
    (opt: TPointerEventInfo) => {
      if (!canDraw || !isDrawer || tool !== 'fill') return;
      const canvas = fabricRef.current;
      if (!canvas) return;

      const pointer = opt.scenePoint;
      const w = canvas.getWidth();
      const h = canvas.getHeight();
      const nx = pointer.x / w;
      const ny = pointer.y / h;

      void applyFillToFabricCanvas(canvas, nx, ny, color).then(() => {
        onFillRef.current?.(nx, ny, color);
      });
    },
    [canDraw, isDrawer, tool, color]
  );

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    if (tool === 'fill' && canDraw && isDrawer) {
      canvas.isDrawingMode = false;
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';
      canvas.on('mouse:down', handleFillDown);
      return () => {
        canvas.off('mouse:down', handleFillDown);
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
      };
    }
    canvas.off('mouse:down', handleFillDown);
    canvas.defaultCursor = 'default';
    canvas.hoverCursor = 'move';
  }, [tool, canDraw, isDrawer, handleFillDown]);

  const localClear = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    clearFabricCanvas(canvas);
  }, []);

  return {
    containerRef,
    canvasElRef,
    localClear,
  };
}
