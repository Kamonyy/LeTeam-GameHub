'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, User, Check, Volume2 } from 'lucide-react';
import { getDisplayName, setDisplayName } from '@/lib/player';
import { useSocket } from '@/hooks/useSocket';
import { useWordGameAudioOptional } from '../hooks/useWordGameAudio';
import WordGameVolumeControl from './WordGameVolumeControl';

type WordGamePlayerProfileProps = {
  /** When true, display name cannot be edited (e.g. during a match). */
  nameLocked?: boolean;
  nameLockedReason?: string;
  audioEnabled?: boolean;
};

export default function WordGamePlayerProfile({
  nameLocked = false,
  nameLockedReason = 'Name is locked during a match',
  audioEnabled = false,
}: WordGamePlayerProfileProps) {
  const { connected, refreshDisplayName } = useSocket();
  const audio = useWordGameAudioOptional();
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const saveName = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setDisplayName(trimmed);
    refreshDisplayName(trimmed);
    setSavedName(trimmed);
    setSaved(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      setSaved(false);
      setOpen(false);
    }, 600);
  }, [name, refreshDisplayName]);

  const showName = !!savedName.trim();
  const label = showName ? savedName : 'Set Name';
  const panelDisabled = !connected;
  const showAudio = audioEnabled && audio?.enabled;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => !panelDisabled && setOpen((v) => !v)}
        disabled={panelDisabled}
        title={
          panelDisabled ? 'Connect to open settings'
          : nameLocked && showAudio ? 'Sound & profile'
          : undefined
        }
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
          showName ?
            'border-[rgba(201,162,39,0.25)] bg-[rgba(6,8,22,0.85)] text-[#e8edf7] hover:border-[rgba(201,162,39,0.45)]'
          : 'border-[rgba(201,162,39,0.4)] bg-[rgba(201,162,39,0.12)] text-[#f0d78c] hover:bg-[rgba(201,162,39,0.2)]',
          panelDisabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        <User className="w-4 h-4 shrink-0" />
        <span className="max-w-[120px] truncate">{label}</span>
        {showAudio && (
          <Volume2 className="w-3.5 h-3.5 shrink-0 text-[#f0d78c] opacity-80" aria-hidden />
        )}
        <ChevronDown
          className={clsx(
            'w-3.5 h-3.5 sw-muted transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && !panelDisabled && (
        <div className="sw-player-profile absolute right-0 top-full mt-2 w-72 animate-overlay-pop z-50">
          {showAudio && audio && nameLocked && (
            <>
              <p className="text-[10px] sw-muted uppercase tracking-[0.2em] mb-3">Sound volume</p>
              <WordGameVolumeControl audio={audio} />
              <div className="sw-divider-gold my-4 opacity-70" />
            </>
          )}

          <p className="text-[10px] sw-muted uppercase tracking-[0.2em] mb-2">Display name</p>
          {nameLocked ?
            <div className="mb-1 rounded-lg border border-[rgba(201,162,39,0.2)] bg-[rgba(8,12,24,0.6)] px-3 py-2.5">
              <p className="text-sm font-medium text-[#e8edf7] truncate">{savedName || '—'}</p>
              <p className="text-[10px] sw-muted mt-1.5 leading-relaxed">{nameLockedReason}</p>
            </div>
          : <>
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
            </>
          }

          {showAudio && audio && !nameLocked && (
            <>
              <div className="sw-divider-gold my-4 opacity-70" />
              <p className="text-[10px] sw-muted uppercase tracking-[0.2em] mb-3">Sound volume</p>
              <WordGameVolumeControl audio={audio} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
