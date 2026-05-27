'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { MessageSquare, Send } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';

const MAX_MESSAGE_LENGTH = 200;
const MAX_VISIBLE_MESSAGES = 100;

type ChatPanelProps = {
  className?: string;
};

export default function ChatPanel({ className }: ChatPanelProps) {
  const { connected, playerId, lobby, chatMessages, sendChat } = useSocket();
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const channelRoomId = lobby?.roomId ?? null;
  const channelLabel = channelRoomId ? `Room ${channelRoomId}` : 'Hub';

  const visibleMessages = useMemo(
    () =>
      chatMessages
        .filter((msg) => (msg.roomId ?? null) === channelRoomId)
        .slice(-MAX_VISIBLE_MESSAGES),
    [chatMessages, channelRoomId]
  );

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [visibleMessages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || !connected) return;
    sendChat(trimmed);
    setDraft('');
  };

  return (
    <aside
      className={clsx(
        'flex flex-col border-l border-hub-border bg-hub-surface/95 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-hub-border shrink-0">
        <MessageSquare className="w-4 h-4 text-hub-accent" />
        <h3 className="text-sm font-semibold">Chat</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-hub-muted font-semibold truncate max-w-[120px]">
          {channelLabel}
        </span>
      </div>

      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-2 space-y-2 scrollbar-thin"
      >
        {!connected && (
          <p className="text-xs text-hub-muted text-center py-8">Connecting…</p>
        )}

        {connected && visibleMessages.length === 0 && (
          <p className="text-xs text-hub-muted text-center py-8">
            {channelRoomId ? 'Say hello to your room.' : 'Hub chat — say hi!'}
          </p>
        )}

        {visibleMessages.map((msg) => {
          const isYou = msg.playerId === playerId;
          return (
            <div
              key={`${msg.timestamp}-${msg.playerId}-${msg.message.slice(0, 8)}`}
              className={clsx(
                'rounded-lg px-2.5 py-2 text-sm border',
                isYou
                  ? 'border-hub-accent/30 bg-hub-accent/10 ml-4'
                  : 'border-hub-border/60 bg-hub-bg/50 mr-4'
              )}
            >
              <div className="flex items-baseline gap-2 mb-0.5">
                <span
                  className={clsx(
                    'font-semibold text-xs truncate',
                    isYou ? 'text-hub-accent' : 'text-gray-200'
                  )}
                >
                  {msg.displayName}
                </span>
                <time className="text-[10px] text-hub-muted ml-auto shrink-0 tabular-nums">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
              <p className="text-gray-100 break-words whitespace-pre-wrap">{msg.message}</p>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 p-3 border-t border-hub-border flex gap-2"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          disabled={!connected}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={connected ? 'Type a message…' : 'Offline'}
          className="flex-1 min-w-0 px-3 py-2 text-sm bg-hub-bg border border-hub-border rounded-lg
            text-gray-100 placeholder-hub-muted focus:outline-none focus:border-hub-accent
            normal-case tracking-normal text-left disabled:opacity-40"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!connected || !draft.trim()}
          className="btn-primary px-3 py-2 shrink-0 disabled:opacity-40"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </aside>
  );
}
