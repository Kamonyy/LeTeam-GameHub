import type { Canvas as FabricCanvas, FabricObject } from 'fabric';
import { FabricImage, StaticCanvas } from 'fabric';
import { PAPER_COLOR } from './fabricBoard';
import { floodFillComposite } from './floodFill';

const fillLayerCanvasByFabric = new WeakMap<FabricCanvas, HTMLCanvasElement>();

export function isFillLayerObject(obj: FabricObject): boolean {
  return obj.get('sketchFillLayer') === true;
}

export function getFillLayerCanvas(
  canvas: FabricCanvas,
  width: number,
  height: number
): HTMLCanvasElement {
  let el = fillLayerCanvasByFabric.get(canvas);
  if (!el || el.width !== width || el.height !== height) {
    el = document.createElement('canvas');
    el.width = width;
    el.height = height;
    const ctx = el.getContext('2d');
    if (ctx) {
      ctx.fillStyle = PAPER_COLOR;
      ctx.fillRect(0, 0, width, height);
    }
    fillLayerCanvasByFabric.set(canvas, el);
  }
  return el;
}

export function resetFillLayerCanvas(
  canvas: FabricCanvas,
  width: number,
  height: number
) {
  const el = getFillLayerCanvas(canvas, width, height);
  const ctx = el.getContext('2d');
  if (ctx) {
    ctx.fillStyle = PAPER_COLOR;
    ctx.fillRect(0, 0, width, height);
  }
  fillLayerCanvasByFabric.delete(canvas);
  fillLayerCanvasByFabric.set(canvas, el);
}

async function renderStrokesToCanvas(
  objects: FabricObject[],
  width: number,
  height: number
): Promise<HTMLCanvasElement> {
  const el = document.createElement('canvas');
  el.width = width;
  el.height = height;
  const staticCanvas = new StaticCanvas(el, {
    width,
    height,
    backgroundColor: 'transparent',
  });

  for (const obj of objects) {
    if (isFillLayerObject(obj)) continue;
    const cloned = await obj.clone();
    staticCanvas.add(cloned);
  }
  staticCanvas.renderAll();
  staticCanvas.dispose();
  return el;
}

export async function syncFillLayerImage(
  canvas: FabricCanvas,
  fillEl: HTMLCanvasElement
) {
  const existing = canvas.getObjects().find(isFillLayerObject);
  if (existing) canvas.remove(existing);

  const img = new FabricImage(fillEl, {
    left: 0,
    top: 0,
    selectable: false,
    evented: false,
    objectCaching: false,
  });
  img.set('sketchFillLayer', true);
  canvas.insertAt(0, img);
}

export async function applyFillToFabricCanvas(
  canvas: FabricCanvas,
  normX: number,
  normY: number,
  color: string
) {
  const w = canvas.getWidth();
  const h = canvas.getHeight();
  if (w <= 0 || h <= 0) return;

  const fillEl = getFillLayerCanvas(canvas, w, h);
  const fillCtx = fillEl.getContext('2d', { willReadFrequently: true });
  if (!fillCtx) return;

  const composite = document.createElement('canvas');
  composite.width = w;
  composite.height = h;
  const cctx = composite.getContext('2d', { willReadFrequently: true });
  if (!cctx) return;

  cctx.fillStyle = PAPER_COLOR;
  cctx.fillRect(0, 0, w, h);
  cctx.drawImage(fillEl, 0, 0);

  const strokeObjects = canvas.getObjects().filter((o) => !isFillLayerObject(o));
  const strokeEl = await renderStrokesToCanvas(strokeObjects, w, h);
  cctx.drawImage(strokeEl, 0, 0);

  const strokeCtx = strokeEl.getContext('2d', { willReadFrequently: true });
  if (!strokeCtx) return;

  const compositeData = cctx.getImageData(0, 0, w, h);
  const fillData = fillCtx.getImageData(0, 0, w, h);
  const strokeData = strokeCtx.getImageData(0, 0, w, h);

  floodFillComposite(
    compositeData,
    fillData,
    strokeData,
    Math.floor(normX * w),
    Math.floor(normY * h),
    color,
    w,
    h
  );

  fillCtx.putImageData(fillData, 0, 0);
  await syncFillLayerImage(canvas, fillEl);
  canvas.renderAll();
}

export async function replayFillBatches(
  canvas: FabricCanvas,
  batches: { tool: string; color: string; points: number[][] }[]
) {
  const w = canvas.getWidth();
  const h = canvas.getHeight();
  resetFillLayerCanvas(canvas, w, h);

  for (const batch of batches) {
    if (batch.tool !== 'fill' || batch.points.length === 0) continue;
    const [x, y] = batch.points[0];
    await applyFillToFabricCanvas(canvas, x, y, batch.color);
  }
}

export function disposeFillLayer(canvas: FabricCanvas) {
  fillLayerCanvasByFabric.delete(canvas);
}
