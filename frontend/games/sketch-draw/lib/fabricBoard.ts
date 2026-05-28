import { v4 as uuidv4 } from 'uuid';
import type { Path, Canvas as FabricCanvas, FabricObject, Polyline } from 'fabric';
import { Path as FabricPath, Polyline as FabricPolyline, Point, util } from 'fabric';
import type { SketchStrokeBatch, StrokeBatchPayload } from '../types';
import {
  applyFillToFabricCanvas,
  disposeFillLayer,
  isFillLayerObject,
  resetFillLayerCanvas,
} from './fillLayer';

export const PAPER_COLOR = '#faf8f2';

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function dedupePoints(points: number[][], epsilon = 0.0001): number[][] {
  const out: number[][] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (
      last &&
      Math.abs(last[0] - p[0]) < epsilon &&
      Math.abs(last[1] - p[1]) < epsilon
    ) {
      continue;
    }
    out.push(p);
  }
  return out;
}

/** Extract normalized [0,1] points from a Fabric free-drawn path. */
export function pathToBatch(
  path: Path,
  canvasWidth: number,
  canvasHeight: number,
  tool: string,
  color: string,
  size: number
): StrokeBatchPayload {
  const matrix = path.calcTransformMatrix();
  const offset = path.pathOffset ?? new Point(0, 0);
  const raw: number[][] = [];

  for (const seg of path.path ?? []) {
    const cmd = seg[0];
    const nums: number[] = [];
    if (cmd === 'M' || cmd === 'L') {
      nums.push(seg[1] as number, seg[2] as number);
    } else if (cmd === 'Q') {
      nums.push(
        seg[1] as number,
        seg[2] as number,
        seg[3] as number,
        seg[4] as number
      );
    } else if (cmd === 'C') {
      nums.push(
        seg[1] as number,
        seg[2] as number,
        seg[3] as number,
        seg[4] as number,
        seg[5] as number,
        seg[6] as number
      );
    }
    for (let i = 0; i < nums.length; i += 2) {
      const local = new Point(nums[i] - offset.x, nums[i + 1] - offset.y);
      const world = util.transformPoint(local, matrix);
      raw.push([
        clamp01(world.x / canvasWidth),
        clamp01(world.y / canvasHeight),
      ]);
    }
  }

  let points = dedupePoints(raw);
  if (points.length === 0) {
    points.push([0.5, 0.5]);
  }

  const maxPts = 400;
  if (points.length > maxPts) {
    const stride = points.length / maxPts;
    const sampled: number[][] = [];
    for (let i = 0; i < maxPts; i++) {
      sampled.push(points[Math.floor(i * stride)]!);
    }
    sampled.push(points[points.length - 1]!);
    points = dedupePoints(sampled);
  }

  return {
    batchId: uuidv4(),
    tool,
    color,
    size,
    points,
    strokeComplete: true,
  };
}

const CLIENT_MAX_POINTS = 480;

/** Split a stroke into network-sized chunks (server accepts up to 512 per batch). */
export function splitStrokePayload(
  batch: StrokeBatchPayload
): StrokeBatchPayload[] {
  const pts = batch.points;
  if (pts.length <= CLIENT_MAX_POINTS) return [batch];

  const chunks: StrokeBatchPayload[] = [];
  const baseId = batch.batchId;
  for (let i = 0; i < pts.length; i += CLIENT_MAX_POINTS) {
    const slice = pts.slice(i, i + CLIENT_MAX_POINTS);
    chunks.push({
      ...batch,
      batchId: i === 0 ? baseId : `${baseId}-${i}`,
      points: slice,
      strokeComplete: batch.strokeComplete && i + CLIENT_MAX_POINTS >= pts.length,
    });
  }
  return chunks;
}

export function batchToFabricObject(
  batch: SketchStrokeBatch,
  width: number,
  height: number
): FabricObject | null {
  if (batch.tool === 'fill') {
    return null;
  }

  const pts = batch.points.map(([x, y]) => ({
    x: x * width,
    y: y * height,
  }));

  if (pts.length === 0) return null;

  const isEraser = batch.tool === 'eraser';

  if (pts.length === 1) {
    const p = pts[0];
    const r = Math.max(batch.size / 2, 1);
    const d = `M ${p.x - r} ${p.y} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
    return new FabricPath(d, {
      fill: isEraser ? 'rgba(0,0,0,1)' : batch.color,
      stroke: null,
      selectable: false,
      evented: false,
      objectCaching: false,
      globalCompositeOperation: isEraser ? 'destination-out' : 'source-over',
    });
  }

  return new FabricPolyline(pts, {
    stroke: isEraser ? 'rgba(0,0,0,1)' : batch.color,
    strokeWidth: batch.size,
    fill: null,
    strokeLineCap: 'round',
    strokeLineJoin: 'round',
    selectable: false,
    evented: false,
    objectCaching: false,
    globalCompositeOperation: isEraser ? 'destination-out' : 'source-over',
  });
}

export { applyFillToFabricCanvas } from './fillLayer';

export function clearFabricCanvas(canvas: FabricCanvas) {
  canvas.getObjects().forEach((obj) => {
    if (!isFillLayerObject(obj)) canvas.remove(obj);
  });
  const fillImg = canvas.getObjects().find(isFillLayerObject);
  if (fillImg) canvas.remove(fillImg);
  const w = canvas.getWidth();
  const h = canvas.getHeight();
  if (w > 0 && h > 0) resetFillLayerCanvas(canvas, w, h);
  canvas.backgroundColor = PAPER_COLOR;
  canvas.renderAll();
}

export async function loadBufferOnCanvas(
  canvas: FabricCanvas,
  buffer: SketchStrokeBatch[]
) {
  clearFabricCanvas(canvas);
  const w = canvas.getWidth();
  const h = canvas.getHeight();
  for (const batch of buffer) {
    if (batch.tool === 'fill' && batch.points.length > 0) {
      const [x, y] = batch.points[0];
      await applyFillToFabricCanvas(canvas, x, y, batch.color);
      continue;
    }
    const obj = batchToFabricObject(batch, w, h);
    if (obj) canvas.add(obj);
  }
  canvas.renderAll();
}

export async function appendBatchToCanvas(
  canvas: FabricCanvas,
  batch: SketchStrokeBatch
) {
  const w = canvas.getWidth();
  const h = canvas.getHeight();
  if (batch.tool === 'fill' && batch.points.length > 0) {
    const [x, y] = batch.points[0];
    await applyFillToFabricCanvas(canvas, x, y, batch.color);
    return;
  }
  const obj = batchToFabricObject(batch, w, h);
  if (obj) {
    canvas.add(obj);
    canvas.renderAll();
  }
}

export function fabricObjectToBatch(
  obj: FabricObject,
  canvasWidth: number,
  canvasHeight: number,
  tool: string,
  color: string,
  size: number
): StrokeBatchPayload | null {
  if (obj.type === 'path') {
    return pathToBatch(obj as Path, canvasWidth, canvasHeight, tool, color, size);
  }
  if (obj.type === 'polyline') {
    const poly = obj as Polyline;
    const pts = (poly.points ?? []).map((p) => [
      clamp01(p.x / canvasWidth),
      clamp01(p.y / canvasHeight),
    ]);
    if (pts.length === 0) return null;
    return {
      batchId: uuidv4(),
      tool,
      color,
      size,
      points: dedupePoints(pts),
      strokeComplete: true,
    };
  }
  return null;
}

export function styleFabricPath(
  path: Path,
  tool: string,
  color: string,
  size: number
) {
  path.set({
    selectable: false,
    evented: false,
    objectCaching: false,
  });

  if (tool === 'eraser') {
    path.set({
      stroke: 'rgba(0,0,0,1)',
      fill: null,
      strokeWidth: size,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      globalCompositeOperation: 'destination-out',
    });
  } else {
    path.set({
      stroke: color,
      fill: null,
      strokeWidth: size,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      globalCompositeOperation: 'source-over',
    });
  }
}
