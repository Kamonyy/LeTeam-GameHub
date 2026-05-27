'use client';

import { useState } from 'react';
import { PenLine, Loader2, Flame, Shield } from 'lucide-react';
import type { WordCategory } from '../types';
import WordPanelFrame from './WordPanelFrame';
import ChampionPicker from './ChampionPicker';
import ChampionPortrait from './ChampionPortrait';
import type { LolChampion } from '@/lib/wordgame/lol-champions';

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

  const isLol = wordCategory === 'lol-champions';

  const handleWordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || iHaveSubmitted) return;
    setSubmitting(true);
    const ok = await onSubmitWord(word.trim());
    if (ok) setWord('');
    setSubmitting(false);
  };

  const handleChampionLock = async () => {
    if (!pendingChampion || iHaveSubmitted) return;
    setSubmitting(true);
    const ok = await onSubmitChampion(pendingChampion.id);
    if (!ok) setPendingChampion(null);
    setSubmitting(false);
  };

  if (iHaveSubmitted) {
    return (
      <WordPanelFrame className="p-8 sm:p-10 text-center sw-animate-reveal">
        <div className="sw-seal">
          <span className="sw-seal__ring sw-seal__ring--outer" aria-hidden />
          <span className="sw-seal__ring" aria-hidden />
          <span className="sw-seal__flame" aria-hidden />
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
        {isLol && myChosenChampionId && (
          <div className="flex justify-center mb-4">
            <ChampionPortrait championId={myChosenChampionId} size="md" />
          </div>
        )}
        {!isLol && myChosenWord && (
          <p className="sw-word-reveal mb-5">{myChosenWord}</p>
        )}
        {isLol && myChosenWord && (
          <p className="sw-word-reveal text-lg mb-5">{myChosenWord}</p>
        )}
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
      <WordPanelFrame className="p-8 sm:p-10">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-5 h-5 text-[#f0d78c]" />
          <h3 className="sw-heading text-base">Choose Champion</h3>
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
          onSelect={(champ) => setPendingChampion(champ)}
          onClear={() => setPendingChampion(null)}
        />

        {pendingChampion && (
          <button
            type="button"
            onClick={handleChampionLock}
            disabled={submitting}
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
    <WordPanelFrame className="p-8 sm:p-10">
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
