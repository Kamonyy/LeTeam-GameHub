const PAPER = { r: 250, g: 248, b: 242 };

function colorsMatch(
  data: Uint8ClampedArray,
  i: number,
  tr: number,
  tg: number,
  tb: number,
  tolerance: number
) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const a = data[i + 3];
  if (a < 16) {
    return (
      Math.abs(PAPER.r - tr) <= tolerance &&
      Math.abs(PAPER.g - tg) <= tolerance &&
      Math.abs(PAPER.b - tb) <= tolerance
    );
  }
  return (
    Math.abs(r - tr) <= tolerance &&
    Math.abs(g - tg) <= tolerance &&
    Math.abs(b - tb) <= tolerance
  );
}

function parseHex(hex: string) {
  const h = hex.replace('#', '');
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function isStrokePixel(strokeData: Uint8ClampedArray, i: number) {
  return strokeData[i + 3] > 32;
}

/**
 * Flood fill on composited view; writes fill color only to fill-layer pixels (not strokes).
 */
export function floodFillComposite(
  composite: ImageData,
  fillLayer: ImageData,
  strokeMask: ImageData,
  seedX: number,
  seedY: number,
  fillColor: string,
  width: number,
  height: number
) {
  const w = width;
  const h = height;
  const data = composite.data;
  const fillData = fillLayer.data;
  const strokeData = strokeMask.data;

  if (seedX < 0 || seedY < 0 || seedX >= w || seedY >= h) return;

  const start = (seedY * w + seedX) * 4;
  if (isStrokePixel(strokeData, start)) return;

  const tr = data[start];
  const tg = data[start + 1];
  const tb = data[start + 2];
  const { r: fr, g: fg, b: fb } = parseHex(fillColor);

  if (
    Math.abs(tr - fr) <= 2 &&
    Math.abs(tg - fg) <= 2 &&
    Math.abs(tb - fb) <= 2
  ) {
    return;
  }

  const tolerance = 32;
  const stack: number[] = [seedX, seedY];
  const visited = new Uint8Array(w * h);

  while (stack.length > 0) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    const idx = y * w + x;
    if (visited[idx]) continue;
    visited[idx] = 1;

    const i = idx * 4;
    if (isStrokePixel(strokeData, i)) continue;
    if (!colorsMatch(data, i, tr, tg, tb, tolerance)) continue;

    data[i] = fr;
    data[i + 1] = fg;
    data[i + 2] = fb;
    data[i + 3] = 255;

    fillData[i] = fr;
    fillData[i + 1] = fg;
    fillData[i + 2] = fb;
    fillData[i + 3] = 255;

    if (x > 0) stack.push(x - 1, y);
    if (x < w - 1) stack.push(x + 1, y);
    if (y > 0) stack.push(x, y - 1);
    if (y < h - 1) stack.push(x, y + 1);
  }
}

/**
 * @deprecated Use floodFillComposite via applyFillToFabricCanvas
 */
export function floodFillCanvas(
  ctx: CanvasRenderingContext2D,
  seedX: number,
  seedY: number,
  fillColor: string,
  width: number,
  height: number
) {
  const w = Math.floor(width);
  const h = Math.floor(height);
  if (w <= 0 || h <= 0) return;

  const imageData = ctx.getImageData(0, 0, w, h);
  const strokeMask = ctx.createImageData(w, h);
  floodFillComposite(imageData, imageData, strokeMask, seedX, seedY, fillColor, w, h);
  ctx.putImageData(imageData, 0, 0);
}
