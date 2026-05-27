'use client';

import { useState } from 'react';
import { Lock, Check, Loader2 } from 'lucide-react';

interface WordSetupProps {
  iHaveSubmitted: boolean;
  opponentHasSubmitted: boolean;
  opponentName: string;
  onSubmit: (word: string) => Promise<boolean>;
}

export default function WordSetup({
  iHaveSubmitted,
  opponentHasSubmitted,
  opponentName,
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
      <div className="word-panel p-8 text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-hub-success/15 mb-4">
          <Check className="w-7 h-7 text-hub-success" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Word locked in</h3>
        <p className="text-hub-muted text-sm">
          {opponentHasSubmitted
            ? 'Both words submitted — starting round…'
            : `Waiting for ${opponentName} to choose their word…`}
        </p>
        {opponentHasSubmitted && (
          <Loader2 className="w-5 h-5 text-hub-accent animate-spin mx-auto mt-4" />
        )}
      </div>
    );
  }

  return (
    <div className="word-panel p-8 animate-fade-in">
      <div className="flex items-center gap-2 text-hub-accent mb-4">
        <Lock className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Choose a Secret Word</h3>
      </div>
      <p className="text-sm text-hub-muted mb-6">
        Pick a word for <span className="text-gray-200">{opponentName}</span> to
        guess over voice chat. They won&apos;t see what you type.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          autoComplete="off"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          className="input-field normal-case tracking-normal text-left w-full"
          placeholder="Enter secret word…"
          maxLength={30}
          autoFocus
        />
        <button
          type="submit"
          disabled={submitting || !word.trim()}
          className="btn-primary w-full"
        >
          {submitting ? 'Submitting…' : 'Lock In Word'}
        </button>
      </form>

      <p className="text-xs text-hub-muted mt-4 text-center">
        {opponentHasSubmitted
          ? `${opponentName} is ready — submit yours to begin`
          : `${opponentName} is still choosing their word`}
      </p>
    </div>
  );
}
