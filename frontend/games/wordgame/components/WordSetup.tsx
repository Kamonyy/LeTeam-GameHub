'use client';

import { useState } from 'react';
import { PenLine, Loader2, Flame } from 'lucide-react';
import WordPanelFrame from './WordPanelFrame';

interface WordSetupProps {
  iHaveSubmitted: boolean;
  opponentHasSubmitted: boolean;
  opponentName: string;
  myChosenWord: string | null;
  onSubmit: (word: string) => Promise<boolean>;
}

export default function WordSetup({
  iHaveSubmitted,
  opponentHasSubmitted,
  opponentName,
  myChosenWord,
  onSubmit,
}: WordSetupProps) {
  const [word, setWord] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || iHaveSubmitted) return;
    setSubmitting(true);
    const ok = await onSubmit(word.trim());
    if (ok) setWord('');
    setSubmitting(false);
  };

  if (iHaveSubmitted) {
    return (
      <WordPanelFrame className="p-8 sm:p-10 text-center animate-fade-in">
        <div className="sw-seal">
          <span className="sw-seal__ring sw-seal__ring--outer" aria-hidden />
          <span className="sw-seal__ring" aria-hidden />
          <span className="sw-seal__flame" aria-hidden />
          <span className="sw-seal__icon">
            <Flame className="w-8 h-8" strokeWidth={1.5} />
          </span>
        </div>
        <h3 className="sw-heading-lg mb-2">Word Sealed</h3>
        <p className="sw-muted text-sm uppercase tracking-widest mb-4">
          Arcane lock engaged
        </p>
        {myChosenWord && <p className="sw-word-reveal mb-5">{myChosenWord}</p>}
        <div className="sw-divider-gold max-w-xs mx-auto" />
        <p className="sw-muted text-sm mt-4 leading-relaxed">
          {opponentHasSubmitted ?
            'Both words submitted — the round awakens…'
          :	`Awaiting ${opponentName} to inscribe their secret…`}
        </p>
        {opponentHasSubmitted && (
          <Loader2 className="w-6 h-6 text-[#c9a227] animate-spin mx-auto mt-5" />
        )}
      </WordPanelFrame>
    );
  }

  return (
    <WordPanelFrame className="p-8 sm:p-10 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <PenLine className="w-5 h-5 text-[#f0d78c]" />
        <h3 className="sw-heading text-base">Inscribe Secret Word</h3>
      </div>
      <div className="sw-divider-gold" />
      <p className="text-sm sw-muted mb-8 leading-relaxed">
        Choose a word for <span className="sw-text-accent font-medium">{opponentName}</span>{' '}
        to divine through voice. Once sealed, only you retain its memory until the round ends.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
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
