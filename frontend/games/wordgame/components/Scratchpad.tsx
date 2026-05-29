'use client';

import { memo, useCallback, useRef, useState } from 'react';
import clsx from 'clsx';
import { StickyNote, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import type { ScratchpadNote } from '../hooks/useScratchpadNotes';
import ScratchpadLolScrollbar from './ScratchpadLolScrollbar';

interface ScratchpadProps {
  notes: ScratchpadNote[];
  onAdd?: (text: string) => void;
  onUpdate?: (id: string, text: string) => void;
  onDelete?: (id: string) => void;
  /** League of Legends mode — hextech scrollbar + panel accents */
  isLol?: boolean;
  /** Spectator / replay — list only, no edits */
  readOnly?: boolean;
  title?: string;
  emptyHint?: string;
}

type NoteRowProps = {
  note: ScratchpadNote;
  isEditing: boolean;
  editText: string;
  onEditTextChange: (value: string) => void;
  onStartEdit: (note: ScratchpadNote) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
};

const NoteRow = memo(function NoteRow({
  note,
  isEditing,
  editText,
  onEditTextChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  readOnly = false,
}: NoteRowProps & { readOnly?: boolean }) {
  const handleStartEdit = useCallback(() => onStartEdit(note), [note, onStartEdit]);
  const handleDelete = useCallback(() => onDelete(note.id), [note.id, onDelete]);

  return (
    <li className="group rounded-lg border border-[rgba(201,162,39,0.12)] bg-[rgba(6,8,22,0.5)] p-3 animate-fade-in">
      {isEditing ?
        <div className="space-y-2">
          <input
            type="text"
            value={editText}
            onChange={(e) => onEditTextChange(e.target.value)}
            className="sw-input py-1.5 text-sm normal-case tracking-normal"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
          />
          <div className="flex gap-1 justify-end">
            <button
              type="button"
              onClick={onCancelEdit}
              className="p-1.5 rounded sw-muted hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onSaveEdit}
              className="p-1.5 rounded text-[#86efac] hover:bg-[rgba(34,197,94,0.1)]"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      : <div className="flex items-start gap-2">
          <p className="flex-1 text-sm sw-text-accent leading-relaxed break-words">
            {note.text}
          </p>
          {!readOnly && (
            <div className="flex shrink-0 gap-0.5 opacity-100 transition-opacity lg:opacity-60 lg:group-hover:opacity-100">
              <button
                type="button"
                onClick={handleStartEdit}
                className="p-1.5 rounded sw-muted hover:text-[#f0d78c] hover:bg-[rgba(201,162,39,0.1)]"
                aria-label="Edit note"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="p-1.5 rounded sw-muted hover:text-[#fca5a5] hover:bg-[rgba(239,68,68,0.1)]"
                aria-label="Delete note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      }
    </li>
  );
});

export default function Scratchpad({
  notes,
  onAdd,
  onUpdate,
  onDelete,
  isLol = false,
  readOnly = false,
  title = 'Clue Scratchpad',
  emptyHint = 'Record clues here — saved locally on this device.',
}: ScratchpadProps) {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const listRef = useRef<HTMLUListElement>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !onAdd) return;
    onAdd(draft);
    setDraft('');
  };

  const startEdit = useCallback((note: ScratchpadNote) => {
    setEditingId(note.id);
    setEditText(note.text);
  }, []);

  const saveEdit = useCallback(() => {
    if (editingId && editText.trim() && onUpdate) {
      onUpdate(editingId, editText);
    }
    setEditingId(null);
    setEditText('');
  }, [editingId, editText, onUpdate]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  return (
    <aside
      className={clsx(
        'sw-scratchpad flex flex-col w-full max-w-full overflow-hidden rounded-xl backdrop-blur-md',
        isLol && 'sw-scratchpad--lol'
      )}
    >
      <div className="sw-scratchpad__head flex shrink-0 items-center gap-1.5 px-3 py-2 border-b border-[rgba(201,162,39,0.15)]">
        <StickyNote className="w-3.5 h-3.5 text-[#f0d78c]" aria-hidden />
        <h3 className="sw-scratchpad__title">{title}</h3>
        <span className="ml-auto text-[10px] sw-muted tabular-nums">{notes.length}</span>
      </div>

      {!readOnly && (
        <form
          onSubmit={handleAdd}
          className="sw-scratchpad__form shrink-0 px-3 py-2 border-b border-[rgba(201,162,39,0.1)]"
        >
          <div className="flex gap-1.5">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Starts with T — No"
              className="sw-input flex-1 py-1.5 text-xs normal-case tracking-normal"
              maxLength={200}
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="p-1.5 rounded-md border border-[rgba(201,162,39,0.3)] bg-[rgba(201,162,39,0.12)] text-[#f0d78c] hover:bg-[rgba(201,162,39,0.2)] disabled:opacity-40 transition-colors"
              aria-label="Add note"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      <div
        className={clsx(
          'sw-scratchpad__scroll-wrap flex-1 min-h-0',
          isLol && 'sw-scratchpad__scroll-wrap--lol'
        )}
      >
        <div
          className={clsx(
            'sw-scratchpad__scroll-row flex min-h-0 flex-1',
            isLol && 'sw-scratchpad__scroll-row--lol'
          )}
        >
          <ul
            ref={listRef}
            className={clsx(
              'sw-scratchpad__scroll flex-1 min-w-0 min-h-0 overflow-y-auto overscroll-contain p-2 space-y-1.5',
              isLol && 'sw-scratchpad__scroll--lol'
            )}
          >
        {notes.length === 0 && (
          <li className="text-center text-[10px] sw-muted py-4 px-2 leading-snug">
            {emptyHint}
          </li>
        )}
        {notes.map((note) => (
          <NoteRow
            key={note.id}
            note={note}
            isEditing={!readOnly && editingId === note.id}
            editText={editText}
            onEditTextChange={setEditText}
            onStartEdit={startEdit}
            onSaveEdit={saveEdit}
            onCancelEdit={cancelEdit}
            onDelete={onDelete ?? (() => {})}
            readOnly={readOnly}
          />
        ))}
          </ul>
          <ScratchpadLolScrollbar
            scrollRef={listRef}
            isLol={isLol}
            contentKey={`${notes.length}-${editingId ?? ''}`}
          />
        </div>
      </div>
    </aside>
  );
}
