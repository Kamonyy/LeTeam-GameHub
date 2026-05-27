'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { StickyNote, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import type { ScratchpadNote } from '../hooks/useScratchpadNotes';

interface ScratchpadProps {
  notes: ScratchpadNote[];
  onAdd: (text: string) => void;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  /** League of Legends mode — hextech scrollbar + panel accents */
  isLol?: boolean;
}

export default function Scratchpad({
  notes,
  onAdd,
  onUpdate,
  onDelete,
  isLol = false,
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
    <aside
      className={clsx(
        'sw-scratchpad flex flex-col w-full max-w-full overflow-hidden rounded-xl backdrop-blur-md',
        'h-[26rem] sm:h-[min(26rem,55vh)]',
        'lg:h-full lg:max-h-full lg:min-h-0',
        isLol && 'sw-scratchpad--lol'
      )}
    >
      <div className="flex shrink-0 items-center gap-2 px-4 py-3 border-b border-[rgba(201,162,39,0.15)]">
        <StickyNote className="w-4 h-4 text-[#f0d78c]" />
        <h3 className="sw-heading text-[11px]">Clue Scratchpad</h3>
        <span className="ml-auto text-xs sw-muted tabular-nums">{notes.length}</span>
      </div>

      <form onSubmit={handleAdd} className="shrink-0 p-3 border-b border-[rgba(201,162,39,0.1)]">
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Starts with T — No"
            className="sw-input flex-1 py-2 text-sm normal-case tracking-normal"
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="p-2 rounded-lg border border-[rgba(201,162,39,0.3)] bg-[rgba(201,162,39,0.12)] text-[#f0d78c] hover:bg-[rgba(201,162,39,0.2)] disabled:opacity-40 transition-colors"
            aria-label="Add note"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </form>

      <div className="sw-scratchpad__scroll-wrap sw-scratchpad__scroll-wrap--lol flex-1 min-h-0">
        <ul className="sw-scratchpad__scroll sw-scratchpad__scroll--lol h-full overflow-y-auto overscroll-contain p-3 pr-1.5 space-y-2">
        {notes.length === 0 && (
          <li className="text-center text-xs sw-muted py-8 px-4 leading-relaxed">
            Record clues and deductions. Notes persist locally if you refresh.
          </li>
        )}
        {notes.map((note) => (
          <li
            key={note.id}
            className="group rounded-lg border border-[rgba(201,162,39,0.12)] bg-[rgba(6,8,22,0.5)] p-3 animate-fade-in"
          >
            {editingId === note.id ?
              <div className="space-y-2">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="sw-input py-1.5 text-sm normal-case tracking-normal"
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
                    className="p-1.5 rounded sw-muted hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="p-1.5 rounded text-[#86efac] hover:bg-[rgba(34,197,94,0.1)]"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            :	<div className="flex items-start gap-2">
                <p className="flex-1 text-sm sw-text-accent leading-relaxed break-words">
                  {note.text}
                </p>
                <div className="flex gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(note)}
                    className="p-1.5 rounded sw-muted hover:text-[#f0d78c] hover:bg-[rgba(201,162,39,0.1)]"
                    aria-label="Edit note"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(note.id)}
                    className="p-1.5 rounded sw-muted hover:text-[#fca5a5] hover:bg-[rgba(239,68,68,0.1)]"
                    aria-label="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            }
          </li>
        ))}
        </ul>
      </div>
    </aside>
  );
}
