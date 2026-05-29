'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { MessageSquare } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { useRoomChatMessages } from '@/lib/hub/useRoomChatMessages';
import ChatFeed from '@/components/ui/ChatFeed';
import ChatComposer from '@/components/ui/ChatComposer';

type ChatPanelProps = {
  className?: string;
};

export default function ChatPanel({ className }: ChatPanelProps) {
  const { connected, playerId, lobby, chatMessages, sendChat } = useSocket();

  const channelRoomId = lobby?.roomId ?? null;
  const channelLabel = channelRoomId ? `Room ${channelRoomId}` : 'Hub';

  const visibleMessages = useRoomChatMessages(chatMessages, channelRoomId, 100);

  const feedItems = useMemo(
    () =>
      visibleMessages.map((msg) => {
        const isYou = msg.playerId === playerId;
        return {
          id: `${msg.timestamp}-${msg.playerId}-${msg.message.slice(0, 8)}`,
          className: clsx(
            'rounded-lg px-2.5 py-2 text-sm border',
            isYou ?
              'border-hub-accent/30 bg-hub-accent/10 ml-4'
            : 'border-hub-border/60 bg-hub-bg/50 mr-4',
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
              <p className="text-gray-100 break-words whitespace-pre-wrap">{msg.message}</p>
            </>
          ),
        };
      }),
    [visibleMessages, playerId],
  );

  const emptyMessage =
    !connected ? 'Connecting…'
    : channelRoomId ? 'Say hello to your room.'
    : 'Hub chat — say hi!';

  return (
    <aside
      className={clsx(
        'flex flex-col border-l border-hub-border bg-hub-surface/95 backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-hub-border shrink-0">
        <MessageSquare className="w-4 h-4 text-hub-accent" />
        <h3 className="text-sm font-semibold">Chat</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-hub-muted font-semibold truncate max-w-[120px]">
          {channelLabel}
        </span>
      </div>

      <ChatFeed items={feedItems} emptyMessage={emptyMessage} />

      <ChatComposer
        onSend={(message) => sendChat(message)}
        disabled={!connected}
        placeholder={connected ? 'Type a message…' : 'Offline'}
      />
    </aside>
  );
}
