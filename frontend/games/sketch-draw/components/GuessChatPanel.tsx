'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { MessageSquare, Send } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import type { SketchDrawGameState } from '../types';
import { playSketchGuessSendSound } from '../lib/sketchDrawSound';

const MAX_MESSAGE_LENGTH = 200;

type FeedLine = {
  id: string;
  kind: 'wrong' | 'close' | 'correct' | 'system' | 'chat';
  text: string;
  at: number;
};

type GuessChatPanelProps = {
  className?: string;
  canGuess: boolean;
  guessFrozen: boolean;
  phase?: string;
};

function pickCloseMessage(
  hint: { messageAr: string; messageEn: string },
  lang: string
) {
  return lang.startsWith('ar') ? hint.messageAr : hint.messageEn;
}

export default function GuessChatPanel({
  className,
  canGuess,
  guessFrozen,
  phase,
}: GuessChatPanelProps) {
  const {
    connected,
    lobby,
    gameState,
    chatMessages,
    sendChat,
    sketchDrawSubmitGuess,
    sketchDrawLocalHints,
    sketchDrawRoomAlerts,
    sketchDrawGuessFeed,
  } = useSocket();
  const [draft, setDraft] = useState('');
  const [localLines, setLocalLines] = useState<FeedLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusGuessInput = useCallback(() => {
    requestAnimationFrame(() => {
      if (inputRef.current && !inputRef.current.disabled) {
        inputRef.current.focus({ preventScroll: true });
      }
    });
  }, []);
  const lang =
    typeof document !== 'undefined' ?
      document.documentElement.lang || 'en'
    : 'en';

  const channelRoomId = lobby?.roomId ?? null;
  const isSketchDraw = lobby?.gameType === 'sketch-draw';
  const drawPhase = phase === 'drawing' || (gameState as SketchDrawGameState | null)?.phase === 'drawing';
  const useGuessPipeline = isSketchDraw && drawPhase;
  const inputDisabled =
    !connected || submitting || guessFrozen || (useGuessPipeline && !canGuess);

  const roomChat = useMemo(
    () =>
      chatMessages
        .filter((msg) => (msg.roomId ?? null) === channelRoomId)
        .slice(-60)
        .map((msg) => ({
          id: `chat-${msg.timestamp}-${msg.playerId}`,
          kind: 'chat' as const,
          text: `${msg.displayName}: ${msg.message}`,
          at: msg.timestamp ?? 0,
        })),
    [chatMessages, channelRoomId]
  );

  const wrongLines = useMemo(
    () =>
      sketchDrawGuessFeed.map((g) => ({
        id: g.id,
        kind: 'wrong' as const,
        text: `${g.displayName}: ${g.text}`,
        at: g.at,
      })),
    [sketchDrawGuessFeed]
  );

  const hintLines = useMemo(
    () =>
      sketchDrawLocalHints.map((h) => ({
        id: h.id,
        kind: 'close' as const,
        text: pickCloseMessage(h, lang),
        at: h.at,
      })),
    [sketchDrawLocalHints, lang]
  );

  const correctLines = useMemo(
    () =>
      sketchDrawRoomAlerts.map((a) => ({
        id: a.id,
        kind: 'correct' as const,
        text: a.message,
        at: a.at,
      })),
    [sketchDrawRoomAlerts]
  );

  const feed = useMemo(() => {
    const merged: FeedLine[] = [
      ...roomChat,
      ...wrongLines,
      ...correctLines,
      ...hintLines,
      ...localLines,
    ];
    return merged.sort((a, b) => a.at - b.at);
  }, [roomChat, wrongLines, correctLines, hintLines, localLines]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [feed.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || inputDisabled) return;

    if (useGuessPipeline && canGuess) {
      setSubmitting(true);
      playSketchGuessSendSound();
      const result = await sketchDrawSubmitGuess(trimmed);
      setSubmitting(false);
      setDraft('');
      focusGuessInput();
      if (!result.ok) {
        const err = result.error;
        if (err) {
          setLocalLines((prev) => [
            ...prev.slice(-40),
            { id: `err-${Date.now()}`, kind: 'system', text: err, at: Date.now() },
          ]);
        }
        focusGuessInput();
        return;
      }
      focusGuessInput();
      return;
    }

    sendChat(trimmed);
    setDraft('');
    focusGuessInput();
  };

  const placeholder =
    guessFrozen ? 'Correct!'
    : useGuessPipeline && canGuess ? 'Type your guess…'
    : isSketchDraw ? 'Room chat…'
    : 'Message…';

  return (
    <aside
      className={clsx(
        'flex flex-col border border-hub-border rounded-xl bg-hub-surface/95 backdrop-blur-sm sketch-chat',
        'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        className
      )}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-hub-border shrink-0">
        <MessageSquare className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-semibold">
          {useGuessPipeline ? 'Guesses' : 'Chat'}
        </h3>
      </div>

      <div
        ref={listRef}
        className="flex-1 min-h-[140px] max-h-[min(40dvh,280px)] overflow-y-auto overscroll-contain px-3 py-2 space-y-2"
      >
        {feed.length === 0 && (
          <p className="text-xs text-hub-muted text-center py-6">
            {useGuessPipeline ? 'Guess the drawing!' : 'Say hello to the room.'}
          </p>
        )}

        {feed.map((line) => (
          <div
            key={line.id}
            className={clsx(
              'text-sm py-1.5 px-2 rounded-lg break-words',
              line.kind === 'close' &&
                'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 font-semibold text-center sketch-close-hint',
              line.kind === 'correct' &&
                'text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 font-semibold text-center',
              line.kind === 'wrong' && 'text-stone-300 border border-stone-700/50',
              line.kind === 'system' && 'text-emerald-400 text-center font-medium',
              line.kind === 'chat' && 'text-stone-400 text-xs border border-stone-800/50'
            )}
          >
            {line.text}
          </div>
        ))}

        {guessFrozen && (
          <p className="text-xs text-emerald-400 text-center py-2 font-medium">
            {lang.startsWith('ar') ? 'لقد خمّنت الكلمة!' : 'You guessed correctly!'}
          </p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-hub-border flex gap-2 shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          disabled={inputDisabled}
          placeholder={placeholder}
          className="flex-1 min-w-0 rounded-lg bg-hub-bg border border-hub-border px-3 py-2 text-sm disabled:opacity-50"
          maxLength={MAX_MESSAGE_LENGTH}
          autoComplete="off"
          enterKeyHint="send"
        />
        <button
          type="submit"
          disabled={inputDisabled || !draft.trim()}
          className="shrink-0 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 px-3 py-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={useGuessPipeline ? 'Submit guess' : 'Send message'}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </aside>
  );
}
