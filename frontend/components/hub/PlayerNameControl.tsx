'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, User, Check } from 'lucide-react';
import { getDisplayName, setDisplayName } from '@/lib/player';
import { useSocket } from '@/hooks/useSocket';

export default function PlayerNameControl() {
  const { connected, refreshDisplayName } = useSocket();
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const current = getDisplayName();
    setName(current);
    setSavedName(current);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const saveName = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setDisplayName(trimmed);
    refreshDisplayName(trimmed);
    setSavedName(trimmed);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setOpen(false);
    }, 600);
  }, [name, refreshDisplayName]);

  const showName = !!savedName.trim();
  const label = showName ? savedName : 'Set Name';

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!connected}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
          showName
            ? 'border-hub-border bg-hub-surface/80 text-gray-100 hover:border-hub-accent/40'
            : 'border-hub-accent/40 bg-hub-accent/10 text-hub-accent hover:bg-hub-accent/20',
          !connected && 'opacity-50 cursor-not-allowed'
        )}
      >
        <User className="w-4 h-4 shrink-0" />
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown
          className={clsx('w-3.5 h-3.5 text-hub-muted transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 animate-overlay-pop rounded-xl border border-hub-border
                     bg-hub-surface/95 backdrop-blur-md shadow-xl shadow-black/40 p-4 z-50"
        >
          <p className="text-xs text-hub-muted uppercase tracking-wider mb-2">Display name</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            className="input-field w-full normal-case tracking-normal text-left mb-3"
            placeholder="Enter your name"
            maxLength={32}
            autoFocus
          />
          <button
            type="button"
            onClick={saveName}
            disabled={!name.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 py-2"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                Saved
              </>
            ) : (
              'Save Name'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
