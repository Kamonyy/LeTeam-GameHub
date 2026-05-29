'use client';

import { ArrowLeft, ArrowRight, OctagonX } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AppShell, AppShellHeader } from '@/components/layout/AppShell';
import ConnectionStatus from '@/components/hub/ConnectionStatus';
import HubBackLink from '@/components/hub/HubBackLink';
import RoomEngagementLayer from '@/components/engagement/RoomEngagementLayer';

export type GameClientFrameProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onLeave?: () => void;
  onCancelMatch?: () => void;
  cancelMatchLabel?: string;
  cancelMatchDisabled?: boolean;
  connected: boolean;
  showConnection?: boolean;
  connectionVariant?: 'hub' | 'hidden';
  headerExtra?: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  maxWidthClass?: string;
  dir?: 'ltr' | 'rtl';
  lang?: string;
  /** When set, mounts room reaction overlay + picker for this room. */
  engagementRoomId?: string | null;
};

export default function GameClientFrame({
  title,
  subtitle,
  children,
  onLeave,
  onCancelMatch,
  cancelMatchLabel = 'Cancel Match',
  cancelMatchDisabled = false,
  connected,
  showConnection = true,
  connectionVariant = 'hub',
  headerExtra,
  className,
  headerClassName,
  contentClassName,
  maxWidthClass = 'max-w-6xl',
  dir,
  lang,
  engagementRoomId,
}: GameClientFrameProps) {
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;
  const backControl =
    onLeave ?
      <button
        type="button"
        onClick={onLeave}
        className="text-hub-muted hover:text-white transition-colors"
        aria-label="Leave game"
      >
        <BackIcon className="w-5 h-5" />
      </button>
    : <HubBackLink
        className="text-hub-muted hover:text-white transition-colors"
        aria-label="Back to hub"
      >
        <BackIcon className="w-5 h-5" />
      </HubBackLink>;

  return (
    <AppShell className={className} safeHeader dir={dir} lang={lang}>
      <RoomEngagementLayer roomId={engagementRoomId} />
      <AppShellHeader className={headerClassName}>
        <div
          className={cn(
            'mx-auto px-6 py-4 flex items-center justify-between w-full',
            maxWidthClass,
          )}
        >
          <div className="flex items-center gap-4 min-w-0">
            {backControl}
            <div className="min-w-0">
              <h1 className="text-lg font-semibold truncate">{title}</h1>
              {subtitle && (
                <p className="text-xs text-hub-muted truncate max-w-[200px] sm:max-w-none">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {onCancelMatch && (
              <button
                type="button"
                onClick={onCancelMatch}
                disabled={cancelMatchDisabled}
                className="btn-secondary flex items-center gap-2 text-sm py-2 text-hub-danger border-hub-danger/30 hover:bg-hub-danger/10"
              >
                <OctagonX className="w-4 h-4" />
                {cancelMatchLabel}
              </button>
            )}
            {showConnection && connectionVariant === 'hub' && (
              <ConnectionStatus connected={connected} />
            )}
            {headerExtra}
          </div>
        </div>
      </AppShellHeader>

      <div
        className={cn(
          'mx-auto px-6 py-10 w-full',
          engagementRoomId && 'pb-14 sm:pb-16',
          maxWidthClass,
          contentClassName,
        )}
      >
        {children}
      </div>
    </AppShell>
  );
}
