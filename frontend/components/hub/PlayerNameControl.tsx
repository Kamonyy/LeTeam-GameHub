'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, User, Check } from 'lucide-react';
import { getDisplayName, setDisplayName } from '@/lib/player';
import { useHubLive } from '@/lib/hub/HubLiveContext';
import { MafiaButton } from '@/components/mafia/mafia-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PlayerNameControlProps = {
  disabled?: boolean;
  disabledReason?: string;
  theme?: 'hub' | 'mafia' | 'bara';
};

export default function PlayerNameControl({
  disabled = false,
  disabledReason,
  theme = 'hub',
}: PlayerNameControlProps) {
  const { connected, refreshDisplayName } = useHubLive();
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMafia = theme === 'mafia';
  const isBara = theme === 'bara';
  const lockedReason =
    disabledReason ??
    (isBara ?
      'لا يمكن تغيير الاسم أثناء المباراة'
    : isMafia ?
      'Name is locked during a match'
    :	'Name is locked during a match');

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
  const label =
    showName ? savedName
    : isBara ? 'اسم العرض'
    : 'Set Name';
  const locked = disabled || !connected;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => !locked && setOpen((v) => !v)}
        disabled={locked}
        title={disabled ? lockedReason : undefined}
        className={clsx(
          'flex items-center gap-2 rounded-lg border text-sm font-medium transition-all',
          isMafia ?
            [
              'min-h-11 px-2.5 py-2.5 font-cinzel text-[0.72rem] uppercase tracking-[0.08em]',
              showName ?
                'border-amber-800/55 bg-gradient-to-b from-stone-900/90 to-stone-950/95 text-amber-100 shadow-[inset_0_1px_0_rgba(212,166,74,0.12)] hover:border-amber-600/55'
              : 'border-amber-700/45 bg-amber-950/40 text-amber-200 hover:border-amber-600/50 hover:bg-amber-950/60',
            ]
          : isBara ?
            [
              'px-3 py-1.5',
              showName ?
                'border-[rgba(244,63,94,0.35)] bg-[rgba(244,63,94,0.1)] text-rose-100'
              : 'border-[rgba(244,63,94,0.4)] bg-[rgba(244,63,94,0.12)] text-rose-200 hover:bg-[rgba(244,63,94,0.18)]',
            ]
          : [
              'min-h-11 px-3 py-2.5',
              showName ?
                'border-hub-border bg-hub-surface/80 text-gray-100 hover:border-hub-accent/40'
              : 'border-hub-accent/40 bg-hub-accent/10 text-hub-accent hover:bg-hub-accent/20',
            ],
          locked && 'cursor-not-allowed opacity-60',
          locked && !isMafia && !isBara && 'hover:border-hub-border',
        )}
      >
        <User className="h-4 w-4 shrink-0" />
        <span
          className={clsx(
            'max-w-[9rem] break-words leading-snug',
            isMafia || isBara ? 'normal-case tracking-normal text-right' : 'text-left',
          )}
        >
          {label}
        </span>
        <ChevronDown
          className={clsx(
            'h-3.5 w-3.5 transition-transform',
            isMafia ? 'text-amber-400/85' : 'text-hub-muted',
            open && 'rotate-180',
            disabled && 'opacity-40',
          )}
        />
      </button>

      {open && !disabled && (
        <div
          className={clsx(
            'absolute right-0 top-full z-50 mt-2 w-72 animate-overlay-pop p-4 backdrop-blur-md',
            isMafia ?
              [
                'relative overflow-hidden rounded-lg border border-amber-800/55',
                'bg-gradient-to-b from-stone-950/98 to-stone-900/95',
                'shadow-[var(--mf-shadow-panel),0_14px_40px_-10px_rgba(0,0,0,0.8)]',
                'before:pointer-events-none before:absolute before:inset-x-[10%] before:top-0 before:z-[1] before:h-px',
                'before:bg-gradient-to-r before:from-transparent before:via-amber-400/70 before:to-transparent',
              ]
            : isBara ?
              'rounded-xl border border-[rgba(244,63,94,0.28)] bg-[rgba(14,11,18,0.98)] shadow-xl shadow-black/40'
            : 'rounded-xl border border-hub-border bg-hub-surface/95 shadow-xl shadow-black/40',
          )}
        >
          {isMafia ? (
            <>
              <Label
                htmlFor="mafia-display-name"
                className="mb-2 block font-cinzel text-[0.65rem] font-semibold uppercase tracking-widest text-amber-100 before:mr-1 before:text-[0.55rem] before:text-amber-500 before:content-['◆_']"
              >
                Display name
              </Label>
              <Input
                id="mafia-display-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                placeholder="Enter your name"
                maxLength={32}
                autoFocus
                className="mb-3 border-amber-900/50 bg-stone-950/90 text-[color:var(--p1-ink)] shadow-[inset_0_1px_0_rgba(212,166,74,0.06)] placeholder:text-[color:var(--p1-ink-dim)] focus-visible:border-amber-600/60 focus-visible:ring-amber-600/40"
              />
              <MafiaButton
                type="button"
                variant="primary"
                className="w-full min-h-[2.35rem] text-[0.72rem]"
                disabled={!name.trim()}
                onClick={saveName}
              >
                {saved ? (
                  <>
                    <Check className="h-4 w-4" />
                    Saved
                  </>
                ) : (
                  'Save name'
                )}
              </MafiaButton>
            </>
          ) : isBara ?
            <div dir="rtl">
              <p className="mb-2 text-xs font-semibold text-[#9b929f]">اسم العرض</p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                className="bara-input mb-3 w-full normal-case tracking-normal text-right"
                placeholder="اكتب اسمك"
                maxLength={32}
                autoFocus
              />
              <button
                type="button"
                onClick={saveName}
                disabled={!name.trim()}
                className="bara-btn-primary flex w-full items-center justify-center gap-2 py-2"
              >
                {saved ?
                  <>
                    <Check className="h-4 w-4" />
                    تم الحفظ
                  </>
                :	'حفظ الاسم'}
              </button>
            </div>
          : (
            <>
              <p className="mb-2 text-xs uppercase tracking-wider text-hub-muted">
                Display name
              </p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                className="input-field mb-3 w-full normal-case tracking-normal text-left"
                placeholder="Enter your name"
                maxLength={32}
                autoFocus
              />
              <button
                type="button"
                onClick={saveName}
                disabled={!name.trim()}
                className="btn-primary flex w-full items-center justify-center gap-2 py-2"
              >
                {saved ? (
                  <>
                    <Check className="h-4 w-4" />
                    Saved
                  </>
                ) : (
                  'Save Name'
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
