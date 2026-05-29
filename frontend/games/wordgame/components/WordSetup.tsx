'use client';

import { useRef, useState } from 'react';
import { PenLine, Loader2, Flame, Shield, Dices } from 'lucide-react';
import type { WordCategory } from '../types';
import WordPanelFrame from './WordPanelFrame';
import ChampionPicker from './ChampionPicker';
import ChampionPortrait from './ChampionPortrait';
import { pickRandomLolChampion, type LolChampion } from '@/lib/wordgame/lol-champions';
import { useWordGameAudioOptional } from '../hooks/useWordGameAudio';

interface WordSetupProps {
  wordCategory: WordCategory;
  iHaveSubmitted: boolean;
  opponentHasSubmitted: boolean;
  opponentName: string;
  myChosenWord: string | null;
  myChosenChampionId: string | null;
  onSubmitWord: (word: string) => Promise<boolean>;
  onSubmitChampion: (championId: string) => Promise<boolean>;
}

export default function WordSetup({
  wordCategory,
  iHaveSubmitted,
  opponentHasSubmitted,
  opponentName,
  myChosenWord,
  myChosenChampionId,
  onSubmitWord,
  onSubmitChampion,
}: WordSetupProps) {
  const [word, setWord] = useState('');
  const [pendingChampion, setPendingChampion] = useState<LolChampion | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const audio = useWordGameAudioOptional();

  const isLol = wordCategory === 'lol-champions';

  const handleWordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || iHaveSubmitted || submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    const ok = await onSubmitWord(word.trim());
    if (ok) setWord('');
    submitLockRef.current = false;
    setSubmitting(false);
  };

  const playChampionLockFeedback = (champ: LolChampion) => {
    if (iHaveSubmitted) return;
    audio?.unlock();
    audio?.playSfx('lockIn', 0.75);
    audio?.playChampionStinger(champ.id);
  };

  const sealChampion = async (champ: LolChampion) => {
    if (iHaveSubmitted || submitting || submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    setPendingChampion(champ);
    const ok = await onSubmitChampion(champ.id);
    if (!ok && !iHaveSubmitted) setPendingChampion(null);
    submitLockRef.current = false;
    setSubmitting(false);
  };

  const handleChampionLock = async () => {
    if (!pendingChampion) return;
    await sealChampion(pendingChampion);
  };

  const handleChampionPick = (champ: LolChampion) => {
    audio?.unlock();
    audio?.playSfx('click', 0.5);
    audio?.preloadChampion(champ.id);
    setPendingChampion(champ);
  };

  const handleRandomChampionPick = () => {
    if (iHaveSubmitted || submitting) return;
    handleChampionPick(pickRandomLolChampion());
  };

  if (iHaveSubmitted) {
    return (
      <WordPanelFrame
        panelEnter={false}
        className="p-8 sm:p-10 text-center sw-animate-reveal"
      >
        <div className="sw-seal">
          <span className="sw-seal__ring sw-seal__ring--outer" aria-hidden />
          <span className="sw-seal__aura" aria-hidden />
          <span className="sw-seal__ring sw-seal__ring--inner" aria-hidden />
          <span className="sw-seal__icon">
            <Flame className="w-8 h-8" strokeWidth={1.5} />
          </span>
        </div>
        <h3 className="sw-heading-lg mb-2">
          {isLol ? 'Champion Sealed' : 'Word Sealed'}
        </h3>
        <p className="sw-muted text-sm uppercase tracking-widest mb-4">
          Arcane lock engaged
        </p>
        {isLol && myChosenChampionId ?
          <div className="flex justify-center mb-5">
            <ChampionPortrait championId={myChosenChampionId} size="md" />
          </div>
        : myChosenWord ?
          <p className="sw-word-reveal mb-5">{myChosenWord}</p>
        : null}
        <div className="sw-divider-gold sw-divider-gold--draw max-w-xs mx-auto" />
        <p className="sw-muted text-sm mt-4 leading-relaxed">
          {opponentHasSubmitted ?
            isLol ?
              'Both champions chosen — the round awakens…'
            :	'Both words submitted — the round awakens…'
          :	isLol ?
              `Awaiting ${opponentName} to choose their champion…`
            :	`Awaiting ${opponentName} to inscribe their secret…`}
        </p>
        {opponentHasSubmitted && (
          <Loader2 className="w-6 h-6 text-[#c9a227] animate-spin mx-auto mt-5" />
        )}
      </WordPanelFrame>
    );
  }

  if (isLol) {
    return (
      <WordPanelFrame panelEnter={false} className="p-8 sm:p-10">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3 min-w-0">
            <Shield className="w-5 h-5 text-[#f0d78c] shrink-0" />
            <h3 className="sw-heading text-base">Choose Champion</h3>
          </div>
          <button
            type="button"
            onClick={handleRandomChampionPick}
            disabled={submitting || iHaveSubmitted}
            className="sw-champ-random-roll"
            title="Fair random pick from the full roster — review before you lock in"
          >
            <span className="sw-champ-random-roll__icon-wrap" aria-hidden>
              <Dices className="sw-champ-random-roll__icon" strokeWidth={2.25} />
            </span>
            <span className="sw-champ-random-roll__label sw-font-display">Random</span>
          </button>
        </div>
        <div className="sw-divider-gold sw-divider-gold--draw" />
        <p className="text-sm sw-muted mb-6 leading-relaxed">
          Pick a League champion for{' '}
          <span className="sw-text-accent font-medium">{opponentName}</span> to
          divine through voice. They will not see your choice until the round ends.
        </p>

        <ChampionPicker
          disabled={submitting}
          selectedId={pendingChampion?.id ?? null}
          onSelect={handleChampionPick}
          onClear={() => setPendingChampion(null)}
        />

        {pendingChampion && (
          <button
            type="button"
            onPointerDown={(e) => {
              if (e.button !== 0 || submitting || !pendingChampion) return;
              playChampionLockFeedback(pendingChampion);
            }}
            onClick={(e) => {
              e.preventDefault();
              void handleChampionLock();
            }}
            disabled={submitting || iHaveSubmitted}
            className="sw-btn-primary w-full mt-4"
          >
            {submitting ? 'Sealing…' : `Lock In ${pendingChampion.name}`}
          </button>
        )}

        <p className="text-xs sw-muted mt-6 text-center tracking-wide">
          {opponentHasSubmitted ?
            `${opponentName} is ready — seal yours to begin`
          :	`${opponentName} is still choosing their champion`}
        </p>
      </WordPanelFrame>
    );
  }

  return (
    <WordPanelFrame panelEnter={false} className="p-8 sm:p-10">
      <div className="flex items-center gap-3 mb-2">
        <PenLine className="w-5 h-5 text-[#f0d78c]" />
        <h3 className="sw-heading text-base">Inscribe Secret Word</h3>
      </div>
      <div className="sw-divider-gold sw-divider-gold--draw" />
      <p className="text-sm sw-muted mb-8 leading-relaxed">
        Choose a word for <span className="sw-text-accent font-medium">{opponentName}</span>{' '}
        to divine through voice. Once sealed, only you retain its memory until the round ends.
      </p>

      <form onSubmit={handleWordSubmit} className="space-y-4">
        <input
          type="text"
          autoComplete="off"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          className="sw-input"
          placeholder="Enter secret word…"
          maxLength={30}
          autoFocus
        />
        <button type="submit" disabled={submitting || !word.trim()} className="sw-btn-primary">
          {submitting ? 'Sealing…' : 'Lock In Word'}
        </button>
      </form>

      <p className="text-xs sw-muted mt-6 text-center tracking-wide">
        {opponentHasSubmitted ?
          `${opponentName} is ready — seal yours to begin`
        :	`${opponentName} is still choosing their word`}
      </p>
    </WordPanelFrame>
  );
}
