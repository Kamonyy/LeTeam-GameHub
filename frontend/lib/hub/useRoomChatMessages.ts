'use client';

import { useMemo } from 'react';
import type { ChatMessage } from '@/lib/hub/types';

const DEFAULT_LIMIT = 100;

/**
 * Filter socket chat messages to a single room channel, newest retained up to `limit`.
 */
export function useRoomChatMessages(
  chatMessages: ChatMessage[],
  roomId: string | null | undefined,
  limit = DEFAULT_LIMIT,
): ChatMessage[] {
  return useMemo(
    () =>
      chatMessages
        .filter((msg) => (msg.roomId ?? null) === (roomId ?? null))
        .slice(-limit),
    [chatMessages, roomId, limit],
  );
}
