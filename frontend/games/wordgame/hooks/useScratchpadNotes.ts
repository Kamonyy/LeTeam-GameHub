'use client';

import { useCallback, useEffect, useState } from 'react';

export interface ScratchpadNote {
  id: string;
  text: string;
  createdAt: number;
}

function storageKey(roomId: string, playerId: string) {
  return `wordgame_notes_${roomId}_${playerId}`;
}

export function useScratchpadNotes(roomId: string, playerId: string) {
  const [notes, setNotes] = useState<ScratchpadNote[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!roomId || !playerId) return;
    try {
      const raw = localStorage.getItem(storageKey(roomId, playerId));
      setNotes(raw ? JSON.parse(raw) : []);
    } catch {
      setNotes([]);
    }
    setLoaded(true);
  }, [roomId, playerId]);

  useEffect(() => {
    if (!loaded || !roomId || !playerId) return;
    localStorage.setItem(storageKey(roomId, playerId), JSON.stringify(notes));
  }, [notes, loaded, roomId, playerId]);

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
