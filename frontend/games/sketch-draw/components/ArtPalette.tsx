'use client';

import clsx from 'clsx';
import {
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  PaintBucket,
  Paintbrush,
  Minus,
  Plus,
} from 'lucide-react';
import ColorPickerPopover from './ColorPickerPopover';

const BRUSH_PRESETS = [4, 8, 16, 24];

type ArtPaletteProps = {
  tool: string;
  color: string;
  brushSize: number;
  onToolChange: (tool: string) => void;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canRedo?: boolean;
};

export default function ArtPalette({
  tool,
  color,
  brushSize,
  onToolChange,
  onColorChange,
  onBrushSizeChange,
  onUndo,
  onRedo,
  onClear,
  canRedo = false,
}: ArtPaletteProps) {
  const setSize = (n: number) => {
    onToolChange('brush');
    onBrushSizeChange(Math.min(50, Math.max(1, n)));
  };

  return (
    <div className="sketch-palette-bar">
      <div className="sketch-palette-group" role="group" aria-label="Drawing tools">
        {(
          [
            { id: 'brush', icon: Paintbrush, label: 'Brush' },
            { id: 'eraser', icon: Eraser, label: 'Eraser' },
            { id: 'fill', icon: PaintBucket, label: 'Fill' },
          ] as const
        ).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            className={clsx(
              'sketch-tool-btn sketch-tool-btn--sm',
              tool === id && 'sketch-tool-btn--active'
            )}
            onClick={() => onToolChange(id)}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      <div className="sketch-palette-divider" />

      <ColorPickerPopover color={color} onChange={onColorChange} compact />

      <div className="sketch-palette-divider" />

      <div className="sketch-palette-size">
        <button
          type="button"
          className="sketch-tool-btn sketch-tool-btn--xs"
          onClick={() => setSize(brushSize - 2)}
          aria-label="Smaller brush"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <input
          type="range"
          min={1}
          max={50}
          value={brushSize}
          onChange={(e) => setSize(Number(e.target.value))}
          className="sketch-palette-slider"
          aria-label="Brush size"
        />
        <button
          type="button"
          className="sketch-tool-btn sketch-tool-btn--xs"
          onClick={() => setSize(brushSize + 2)}
          aria-label="Larger brush"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <span className="sketch-palette-size-label">{brushSize}</span>
      </div>

      <div className="sketch-palette-presets">
        {BRUSH_PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            className={clsx(
              'sketch-palette-preset',
              brushSize === n && 'sketch-palette-preset--active'
            )}
            onClick={() => setSize(n)}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="sketch-palette-divider" />

      <div className="sketch-palette-group" role="group" aria-label="Edit">
        <button
          type="button"
          className="sketch-tool-btn sketch-tool-btn--sm"
          onClick={onUndo}
          title="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="sketch-tool-btn sketch-tool-btn--sm"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="sketch-tool-btn sketch-tool-btn--sm"
          onClick={onClear}
          title="Clear canvas"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div
        className="sketch-palette-preview"
        style={{
          backgroundColor: tool === 'eraser' ? '#faf8f2' : color,
          width: Math.max(12, Math.min(28, brushSize)),
          height: Math.max(12, Math.min(28, brushSize)),
          opacity: tool === 'eraser' ? 0.45 : 1,
        }}
        aria-hidden
      />
    </div>
  );
}
