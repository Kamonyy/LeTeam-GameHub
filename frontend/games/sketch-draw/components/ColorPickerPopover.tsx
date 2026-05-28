'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Pipette } from 'lucide-react';

const NEON_PRESETS = [
  '#ff2d95',
  '#00f5ff',
  '#ffe600',
  '#7cff00',
  '#ff6b00',
  '#b388ff',
  '#ff3b3b',
  '#3b82f6',
];

type ColorPickerPopoverProps = {
  color: string;
  onChange: (hex: string) => void;
  compact?: boolean;
};

export default function ColorPickerPopover({
  color,
  onChange,
  compact = false,
}: ColorPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [hue, setHue] = useState(220);
  const [sat, setSat] = useState(80);
  const [light, setLight] = useState(45);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const spectrumColor = `hsl(${hue}, ${sat}%, ${light}%)`;

  const applySpectrum = (h: number, s: number, l: number) => {
    onChange(`hsl(${h}, ${s}%, ${l}%)`);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={clsx(
          'sketch-color-trigger flex items-center border border-white/15',
          compact ?
            'sketch-color-trigger--compact rounded-lg'
          : 'gap-2 px-3 py-2 rounded-xl'
        )}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Pick color"
      >
        <span
          className={clsx(
            'sketch-color-swatch border-2 border-white/30 shadow-inner',
            compact ? 'rounded-md' : 'w-8 h-8 rounded-lg'
          )}
          style={{ backgroundColor: color }}
        />
        {!compact && <Pipette className="w-4 h-4 text-violet-200" />}
      </button>

      {open && (
        <div className="sketch-color-popover absolute bottom-full left-0 mb-2 z-50 w-56 p-3 rounded-xl">
          <p className="text-[10px] uppercase tracking-wider text-hub-muted mb-2">Spectrum</p>
          <div
            className="w-full h-24 rounded-lg mb-3 border border-white/10"
            style={{
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue} 100% 50%))`,
            }}
          />
          <label className="text-[10px] text-hub-muted block mb-1">Hue</label>
          <input
            type="range"
            min={0}
            max={360}
            value={hue}
            onChange={(e) => {
              const h = Number(e.target.value);
              setHue(h);
              applySpectrum(h, sat, light);
            }}
            className="w-full mb-2"
          />
          <label className="text-[10px] text-hub-muted block mb-1">Saturation</label>
          <input
            type="range"
            min={0}
            max={100}
            value={sat}
            onChange={(e) => {
              const s = Number(e.target.value);
              setSat(s);
              applySpectrum(hue, s, light);
            }}
            className="w-full mb-2"
          />
          <label className="text-[10px] text-hub-muted block mb-1">Lightness</label>
          <input
            type="range"
            min={10}
            max={90}
            value={light}
            onChange={(e) => {
              const l = Number(e.target.value);
              setLight(l);
              applySpectrum(hue, sat, l);
            }}
            className="w-full mb-3"
          />
          <p className="text-[10px] uppercase tracking-wider text-hub-muted mb-2">Neon presets</p>
          <div className="grid grid-cols-4 gap-1.5">
            {NEON_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                className={clsx(
                  'w-full aspect-square rounded-md border-2',
                  color === c ? 'border-white scale-105' : 'border-transparent'
                )}
                style={{ backgroundColor: c }}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
              />
            ))}
          </div>
          <input
            type="color"
            value={color.startsWith('#') ? color : '#1a1a2e'}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
            id="sketch-native-color"
          />
        </div>
      )}
    </div>
  );
}
