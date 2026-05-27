'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, User, Check, Volume2, VolumeX } from 'lucide-react';
import { getDisplayName, setDisplayName } from '@/lib/player';
import { useSocket } from '@/hooks/useSocket';
import { useWordGameAudioOptional } from '../hooks/useWordGameAudio';

type WordGamePlayerProfileProps = {
  disabled?: boolean;
  disabledReason?: string;
  audioEnabled?: boolean;
};

export default function WordGamePlayerProfile({
  disabled = false,
  disabledReason = 'Name is locked during a match',
  audioEnabled = false,
}: WordGamePlayerProfileProps) {
  const { connected, refreshDisplayName } = useSocket();
  const audio = useWordGameAudioOptional();
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
  const locked = disabled || !connected;
  const showAudio = audioEnabled && audio?.enabled;
  const volumePercent = Math.round((audio?.volume ?? 0.5) * 100);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => !locked && setOpen((v) => !v)}
        disabled={locked}
        title={disabled ? disabledReason : undefined}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
          showName ?
            'border-[rgba(201,162,39,0.25)] bg-[rgba(6,8,22,0.85)] text-[#e8edf7] hover:border-[rgba(201,162,39,0.45)]'
          : 'border-[rgba(201,162,39,0.4)] bg-[rgba(201,162,39,0.12)] text-[#f0d78c] hover:bg-[rgba(201,162,39,0.2)]',
          locked && 'opacity-60 cursor-not-allowed'
        )}
      >
        <User className="w-4 h-4 shrink-0" />
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown
          className={clsx(
            'w-3.5 h-3.5 sw-muted transition-transform',
            open && 'rotate-180',
            disabled && 'opacity-40'
          )}
        />
      </button>

      {open && !disabled && (
        <div className="sw-player-profile absolute right-0 top-full mt-2 w-72 animate-overlay-pop z-50">
          <p className="text-[10px] sw-muted uppercase tracking-[0.2em] mb-2">Display name</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            className="sw-input w-full py-2 text-sm normal-case tracking-normal mb-3"
            placeholder="Champion name"
            maxLength={32}
            autoFocus
          />
          <button
            type="button"
            onClick={saveName}
            disabled={!name.trim()}
            className="sw-btn-primary w-full flex items-center justify-center gap-2 py-2 text-sm"
          >
            {saved ?
              <>
                <Check className="w-4 h-4" />
                Saved
              </>
            : 'Save Name'}
          </button>

          {showAudio && (
            <>
              <div className="sw-divider-gold my-4 opacity-70" />
              <p className="text-[10px] sw-muted uppercase tracking-[0.2em] mb-3">Sound volume</p>
              <div className="sw-audio-volume">
                <button
                  type="button"
                  onClick={audio.toggleMuted}
                  className="sw-audio-volume__mute"
                  aria-label={audio.muted ? 'Unmute game sounds' : 'Mute game sounds'}
                  title={audio.muted ? 'Unmute' : 'Mute'}
                >
                  {audio.muted ?
                    <VolumeX className="w-4 h-4" />
                  : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={volumePercent}
                  disabled={audio.muted}
                  onChange={(e) => audio.setVolume(Number(e.target.value) / 100)}
                  className="sw-audio-volume__slider"
                  aria-label="Game sound volume"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={volumePercent}
                  aria-valuetext={`${volumePercent} percent`}
                />
                <span className="sw-audio-volume__label tabular-nums" aria-hidden>
                  {volumePercent}%
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
