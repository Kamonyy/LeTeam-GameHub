'use client';

import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { MessageSquare } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { useRoomChatMessages } from '@/lib/hub/useRoomChatMessages';
import ChatFeed from '@/components/ui/ChatFeed';
import ChatComposer, { CHAT_MAX_MESSAGE_LENGTH } from '@/components/ui/ChatComposer';
import type { SketchDrawGameState } from '../types';
import { playSketchGuessSendSound } from '../lib/sketchDrawSound';

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
  lang: string,
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
  const inputRef = useRef<HTMLInputElement>(null);

  const focusGuessInput = () => {
    requestAnimationFrame(() => {
      if (inputRef.current && !inputRef.current.disabled) {
        inputRef.current.focus({ preventScroll: true });
      }
    });
  };

  const lang =
    typeof document !== 'undefined' ?
      document.documentElement.lang || 'en'
    : 'en';

  const channelRoomId = lobby?.roomId ?? null;
  const isSketchDraw = lobby?.gameType === 'sketch-draw';
  const drawPhase =
    phase === 'drawing' || (gameState as SketchDrawGameState | null)?.phase === 'drawing';
  const useGuessPipeline = isSketchDraw && drawPhase;
  const inputDisabled =
    !connected || submitting || guessFrozen || (useGuessPipeline && !canGuess);

  const roomChat = useRoomChatMessages(chatMessages, channelRoomId, 60);

  const wrongLines = useMemo(
    () =>
      sketchDrawGuessFeed.map((g) => ({
        id: g.id,
        kind: 'wrong' as const,
        text: `${g.displayName}: ${g.text}`,
        at: g.at,
      })),
    [sketchDrawGuessFeed],
  );

  const hintLines = useMemo(
    () =>
      sketchDrawLocalHints.map((h) => ({
        id: h.id,
        kind: 'close' as const,
        text: pickCloseMessage(h, lang),
        at: h.at,
      })),
    [sketchDrawLocalHints, lang],
  );

  const correctLines = useMemo(
    () =>
      sketchDrawRoomAlerts.map((a) => ({
        id: a.id,
        kind: 'correct' as const,
        text: a.message,
        at: a.at,
      })),
    [sketchDrawRoomAlerts],
  );

  const feed = useMemo(() => {
    const roomChatLines: FeedLine[] = roomChat.map((msg) => ({
      id: `chat-${msg.timestamp}-${msg.playerId}`,
      kind: 'chat',
      text: `${msg.displayName}: ${msg.message}`,
      at: msg.timestamp ?? 0,
    }));
    const merged: FeedLine[] = [
      ...roomChatLines,
      ...wrongLines,
      ...correctLines,
      ...hintLines,
      ...localLines,
    ];
    return merged.sort((a, b) => a.at - b.at);
  }, [roomChat, wrongLines, correctLines, hintLines, localLines]);

  const feedItems = useMemo(
    () =>
      feed.map((line) => ({
        id: line.id,
        className: clsx(
          'text-sm py-1.5 px-2 rounded-lg break-words',
          line.kind === 'close' &&
            'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 font-semibold text-center sketch-close-hint',
          line.kind === 'correct' &&
            'text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 font-semibold text-center',
          line.kind === 'wrong' && 'text-stone-300 border border-stone-700/50',
          line.kind === 'system' && 'text-emerald-400 text-center font-medium',
          line.kind === 'chat' && 'text-stone-400 text-xs border border-stone-800/50',
        ),
        content: line.text,
      })),
    [feed],
  );

  const handleSend = async (trimmed: string) => {
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
        className,
      )}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-hub-border shrink-0">
        <MessageSquare className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-semibold">
          {useGuessPipeline ? 'Guesses' : 'Chat'}
        </h3>
      </div>

      <ChatFeed
        items={feedItems}
        emptyMessage={
          useGuessPipeline ? 'Guess the drawing!' : 'Say hello to the room.'
        }
        className="min-h-[140px] max-h-[min(40dvh,280px)]"
      />

      {guessFrozen && (
        <p className="text-xs text-emerald-400 text-center py-2 font-medium px-3">
          {lang.startsWith('ar') ? 'لقد خمّنت الكلمة!' : 'You guessed correctly!'}
        </p>
      )}

      <ChatComposer
        onSend={handleSend}
        disabled={inputDisabled}
        placeholder={placeholder}
        maxLength={CHAT_MAX_MESSAGE_LENGTH}
        value={draft}
        onChange={setDraft}
        inputRef={inputRef}
        submitLabel={useGuessPipeline ? 'Submit guess' : 'Send message'}
        inputClassName="flex-1 min-w-0 rounded-lg bg-hub-bg border border-hub-border px-3 py-2 text-sm disabled:opacity-50"
        buttonClassName="shrink-0 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 px-3 py-2 min-h-[44px] min-w-[44px] flex items-center justify-center btn-primary border-0"
        className="p-3 border-t border-hub-border flex gap-2 shrink-0"
      />
    </aside>
  );
}
