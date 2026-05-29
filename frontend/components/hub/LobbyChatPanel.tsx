'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { useRoomChatMessages } from '@/lib/hub/useRoomChatMessages';
import ChatFeed from '@/components/ui/ChatFeed';
import ChatComposer from '@/components/ui/ChatComposer';
import type { LobbyState } from '@/lib/hub/types';

type LobbyChatPanelProps = {
  lobby: LobbyState;
  className?: string;
  defaultOpen?: boolean;
  scrollbar?: 'default' | 'hextech';
};

export default function LobbyChatPanel({
  lobby,
  className,
  defaultOpen = true,
  scrollbar = 'default',
}: LobbyChatPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { connected, playerId, chatMessages, sendChat } = useSocket();

  const roomMessages = useRoomChatMessages(chatMessages, lobby.roomId, 80);
  const lobbyMessages = useMemo(
    () => roomMessages.filter((m) => m.channel !== 'match'),
    [roomMessages],
  );

  const feedItems = useMemo(
    () =>
      lobbyMessages.map((msg) => {
        const isYou = msg.playerId === playerId;
        return {
          id: `${msg.timestamp}-${msg.playerId}-${msg.message.slice(0, 8)}`,
          className: clsx(
            'rounded-lg px-2.5 py-2 text-sm border',
            isYou ?
              'border-hub-accent/30 bg-hub-accent/10 ml-3'
            : 'border-hub-border/60 bg-hub-bg/50 mr-3',
          ),
          content: (
            <>
              <div className="flex items-baseline gap-2 mb-0.5">
                <span
                  className={clsx(
                    'font-semibold text-xs truncate',
                    isYou ? 'text-hub-accent' : 'text-gray-200',
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
              <p className="text-gray-100 break-words whitespace-pre-wrap">
                {msg.message}
              </p>
            </>
          ),
        };
      }),
    [lobbyMessages, playerId],
  );

  if (lobby.status !== 'lobby') return null;

  return (
    <div
      className={clsx(
        'rounded-xl border border-hub-border bg-hub-surface/60 overflow-hidden',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-200 hover:bg-hub-bg/40 transition-colors"
        aria-expanded={open}
      >
        <MessageSquare className="w-4 h-4 text-hub-accent shrink-0" />
        <span>Lobby chat</span>
        <span className="text-hub-muted text-xs ml-1">({lobbyMessages.length})</span>
        <span className="ml-auto text-hub-muted">
          {open ?
            <ChevronUp className="w-4 h-4" />
          : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <div className="flex flex-col border-t border-hub-border max-h-56">
          <ChatFeed
            items={feedItems}
            emptyMessage={
              connected ? 'Say hello while you wait…' : 'Connecting…'
            }
            scrollbar={scrollbar}
            className="flex-1 min-h-[100px] max-h-40"
          />
          <ChatComposer
            onSend={sendChat}
            disabled={!connected}
            placeholder="Message the lobby…"
            className="border-t border-hub-border"
          />
        </div>
      )}
    </div>
  );
}
