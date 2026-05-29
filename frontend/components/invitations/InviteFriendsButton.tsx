'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import clsx from 'clsx';
import InviteFriendsModal from './InviteFriendsModal';

interface InviteFriendsButtonProps {
  roomId: string;
  gameType: string;
  disabled?: boolean;
  className?: string;
}

export default function InviteFriendsButton({
  roomId,
  gameType,
  disabled = false,
  className,
}: InviteFriendsButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={clsx(
          'inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl',
          'border border-hub-border/80 bg-hub-surface/70 hover:bg-hub-accent/10 hover:border-hub-accent/40',
          'shadow-sm hover:shadow-md hover:shadow-hub-accent/5',
          'text-hub-text-secondary transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none',
          className
        )}
      >
        <UserPlus className="h-4 w-4" />
        Invite Friends
      </button>
      <InviteFriendsModal
        open={open}
        onOpenChange={setOpen}
        roomId={roomId}
        gameType={gameType}
      />
    </>
  );
}
