'use client';

import { useState } from 'react';
import { StickyNote, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import type { ScratchpadNote } from '../hooks/useScratchpadNotes';

interface ScratchpadProps {
  notes: ScratchpadNote[];
  onAdd: (text: string) => void;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}

export default function Scratchpad({
  notes,
  onAdd,
  onUpdate,
  onDelete,
}: ScratchpadProps) {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onAdd(draft);
    setDraft('');
  };

  const startEdit = (note: ScratchpadNote) => {
    setEditingId(note.id);
    setEditText(note.text);
  };

  const saveEdit = () => {
    if (editingId && editText.trim()) {
      onUpdate(editingId, editText);
    }
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  return (
    <aside className="word-scratchpad flex flex-col h-full min-h-[320px] lg:min-h-0">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-hub-border/80">
        <StickyNote className="w-4 h-4 text-hub-accent" />
        <h3 className="text-sm font-semibold">Clue Scratchpad</h3>
        <span className="ml-auto text-xs text-hub-muted">{notes.length} notes</span>
      </div>

      <form onSubmit={handleAdd} className="p-3 border-b border-hub-border/60">
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Starts with T — No"
            className="flex-1 px-3 py-2 text-sm bg-hub-bg/60 border border-hub-border rounded-lg
                       text-gray-100 placeholder-hub-muted focus:outline-none focus:border-hub-accent"
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="p-2 rounded-lg bg-hub-accent/20 text-hub-accent hover:bg-hub-accent/30
                       disabled:opacity-40 transition-colors"
            aria-label="Add note"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </form>

      <ul className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {notes.length === 0 && (
          <li className="text-center text-xs text-hub-muted py-8 px-4">
            Jot down clues and deductions here. Notes save locally if you refresh.
          </li>
        )}
        {notes.map((note) => (
          <li
            key={note.id}
            className="group rounded-lg border border-hub-border/60 bg-hub-bg/40 p-3 animate-fade-in"
          >
            {editingId === note.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-hub-surface border border-hub-border rounded
                             text-gray-100 focus:outline-none focus:border-hub-accent"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                />
                <div className="flex gap-1 justify-end">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="p-1.5 rounded text-hub-muted hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="p-1.5 rounded text-hub-success hover:bg-hub-success/10"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="flex-1 text-sm text-gray-200 leading-relaxed break-words">
                  {note.text}
                </p>
                <div className="flex gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => startEdit(note)}
                    className="p-1.5 rounded text-hub-muted hover:text-hub-accent hover:bg-hub-accent/10"
                    aria-label="Edit note"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(note.id)}
                    className="p-1.5 rounded text-hub-muted hover:text-hub-danger hover:bg-hub-danger/10"
                    aria-label="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
