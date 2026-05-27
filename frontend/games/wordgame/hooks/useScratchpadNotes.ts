'use client';

import { useCallback, useEffect, useState } from 'react';

export interface ScratchpadNote {
  id: string;
  text: string;
  createdAt: number;
}

function parseNotes(raw: string): ScratchpadNote[] {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (n): n is ScratchpadNote =>
        n &&
        typeof n === 'object' &&
        typeof n.id === 'string' &&
        typeof n.text === 'string' &&
        typeof n.createdAt === 'number'
    )
    .slice(0, 100)
    .map((n) => ({
      id: n.id.slice(0, 64),
      text: n.text.slice(0, 500),
      createdAt: n.createdAt,
    }));
}

function storageKey(roomId: string, playerId: string, roundNumber: number) {
  return `wordgame_notes_${roomId}_${playerId}_r${roundNumber}`;
}

export function useScratchpadNotes(
  roomId: string,
  playerId: string,
  roundNumber: number
) {
  const [notes, setNotes] = useState<ScratchpadNote[]>([]);
  const [loaded, setLoaded] = useState(false);
  const round = Math.max(1, roundNumber || 1);

  useEffect(() => {
    if (!roomId || !playerId) return;
    setLoaded(false);
    try {
      const raw = localStorage.getItem(storageKey(roomId, playerId, round));
      setNotes(raw ? parseNotes(raw) : []);
    } catch {
      setNotes([]);
    }
    setLoaded(true);
  }, [roomId, playerId, round]);

  useEffect(() => {
    if (!loaded || !roomId || !playerId) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          storageKey(roomId, playerId, round),
          JSON.stringify(notes)
        );
      } catch {
        /* ignore quota / private mode */
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [notes, loaded, roomId, playerId, round]);

  const addNote = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setNotes((prev) => [
      {
        id: crypto.randomUUID?.() ?? String(Date.now()),
        text: trimmed,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
  }, []);

  const updateNote = useCallback((id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, text: trimmed } : n))
    );
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearNotes = useCallback(() => {
    setNotes([]);
  }, []);

  return { notes, addNote, updateNote, deleteNote, clearNotes };
}
