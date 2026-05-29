'use client';

import clsx from 'clsx';
import { Check, CircleDashed, UserRound } from 'lucide-react';
import type { BaraMicroStatus } from '@/games/bara-alsalafa/types';

const MICRO_LABELS: Record<BaraMicroStatus, string> = {
  waiting_reveal: 'لم يكشف',
  role_revealed: 'كشف الدور',
  ready: 'جاهز',
  thinking: 'يُفكر',
  vote_requested: 'طلب تصويت',
  voted: 'صوّت',
};

const VOTE_STATUS_LABELS: Partial<Record<BaraMicroStatus, string>> = {
  thinking: 'لم يصوّت بعد',
  voted: 'صوّت',
  vote_requested: 'طلب التصويت',
};

const ROLE_LABELS = {
  asker: 'يسأل',
  answerer: 'يجيب',
} as const;

export interface BaraPlayerSeatProps {
  displayName: string;
  isMe: boolean;
  microStatus: BaraMicroStatus;
  variant: 'grid' | 'hero' | 'vote';
  role?: 'asker' | 'answerer' | null;
  eliminated?: boolean;
  gridSize?: 'sm' | 'md' | 'lg';
  /** Horizontal chip layout for reveal/ready sidebar */
  compact?: boolean;
  className?: string;
  /** Grid seats only — used for fly-to-hero targeting */
  dataSeatId?: string;
  landAnimating?: boolean;
  /** Vote cards — show pick affordance */
  votePickable?: boolean;
}

function avatarSize(
  variant: 'grid' | 'hero' | 'vote',
  gridSize: 'sm' | 'md' | 'lg'
) {
  if (variant === 'hero') return 'bara-avatar--hero-fit';
  if (variant === 'vote') return 'bara-avatar--vote w-14 h-14 text-base shrink-0';
  if (gridSize === 'lg') return 'w-20 h-20 text-lg';
  if (gridSize === 'md') return 'w-16 h-16 text-base';
  return 'w-12 h-12 text-sm';
}

export default function BaraPlayerSeat({
  displayName,
  isMe,
  microStatus,
  variant,
  role = null,
  eliminated = false,
  gridSize = 'lg',
  compact = false,
  className,
  dataSeatId,
  landAnimating = false,
  votePickable = false,
}: BaraPlayerSeatProps) {
  const initial = displayName.charAt(0).toUpperCase();
  const isHero = variant === 'hero';
  const isVote = variant === 'vote';
  const voteLabel =
    isVote ?
      isMe ?
        microStatus === 'voted' ?
          'تم تسجيل صوتك'
        :	'أنت — لا يمكن التصويت لنفسك'
      :	VOTE_STATUS_LABELS[microStatus] ?? MICRO_LABELS[microStatus]
    :	MICRO_LABELS[microStatus];

  return (
    <div
      className={clsx(
        'bara-seat',
        isHero && 'bara-seat--hero',
        isVote && 'bara-seat--vote-card',
        votePickable && 'bara-seat--vote-pickable',
        isHero && role === 'asker' && 'bara-seat--hero-asker',
        isHero && role === 'answerer' && 'bara-seat--hero-answerer',
        isMe && 'bara-seat--me',
        eliminated && 'bara-seat--eliminated',
        landAnimating && 'bara-seat--duel-blend',
        !isHero && !isVote && 'glass-card',
        className
      )}
      data-bara-seat-id={dataSeatId}
      data-bara-seat-variant={variant}
    >
      {isHero && role && (
        <span
          className={clsx(
            'bara-seat__role-badge',
            role === 'asker' && 'bara-seat__role-badge--asker',
            role === 'answerer' && 'bara-seat__role-badge--answerer'
          )}
        >
          {ROLE_LABELS[role]}
        </span>
      )}

      <div
        className={clsx(
          'bara-avatar rounded-full flex items-center justify-center font-bold border-2',
          avatarSize(variant, gridSize),
          isMe ?
            'border-rose-400/60 bg-rose-500/15'
          :	'border-white/15 bg-white/5',
          isHero && role === 'asker' && 'bara-avatar--asker-glow',
          isHero && role === 'answerer' && 'bara-avatar--answerer-glow'
        )}
      >
        {initial}
      </div>

      <div
        className={clsx(
          isVote && 'bara-seat__vote-body',
          compact && 'bara-seat__compact-body min-w-0 flex-1',
        )}
      >
        <p
          className={clsx(
            'bara-seat__name font-semibold truncate',
            isHero ? 'text-base max-w-[9rem]'
            : isVote ? 'text-sm max-w-full'
            : compact ? 'text-xs max-w-[6.5rem]'
            : 'text-sm max-w-[7rem]'
          )}
        >
          {displayName}
          {compact && isMe && (
            <span className="text-hub-muted font-normal text-[10px]"> (أنت)</span>
          )}
        </p>

        {!isHero && (
          <span
            className={clsx(
              isVote ? 'bara-vote-status' : 'bara-pill text-[10px] px-2 py-0.5 rounded-full',
              compact && !isVote && 'bara-pill--compact',
              !isVote && microStatus === 'role_revealed' && 'bara-pill--revealed',
              !isVote && microStatus === 'ready' && 'bara-pill--ready',
              !isVote && microStatus === 'waiting_reveal' && 'bara-pill--waiting',
              !isVote && microStatus === 'vote_requested' && 'bara-pill--vote-req',
              microStatus === 'voted' && (isVote ? 'bara-vote-status--voted' : 'bara-pill--voted'),
              microStatus === 'thinking' &&
                (isVote ? 'bara-vote-status--pending' : 'bara-pill--thinking'),
              isVote && isMe && 'bara-vote-status--self'
            )}
          >
            {isVote && (
              <span className="bara-vote-status__icon" aria-hidden>
                {microStatus === 'voted' ?
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                : isMe ?
                  <UserRound className="w-3.5 h-3.5" strokeWidth={2} />
                : microStatus === 'thinking' ?
                  <CircleDashed className="w-3.5 h-3.5 bara-vote-status__spin" strokeWidth={2} />
                :	<Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                }
              </span>
            )}
            {voteLabel}
          </span>
        )}

        {isVote && votePickable && (
          <span className="bara-seat__vote-cta">اضغط للتصويت</span>
        )}
      </div>

      {isMe && !isVote && !compact && (
        <span className="text-[10px] text-hub-muted bara-seat__you-tag">
          {isHero ? 'أنت' : '(أنت)'}
        </span>
      )}

      {isVote && isMe && (
        <span className="bara-seat__vote-you-badge">أنت</span>
      )}
    </div>
  );
}
