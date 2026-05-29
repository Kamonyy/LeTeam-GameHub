import clsx from 'clsx';

export type PlayerBannerVariant = 'ember' | 'frost';

/** Same slot order as ScoreCard — playerIds[0] ember, playerIds[1] frost. */
export function bannerVariantForPlayer(
  playerId: string,
  playerIds: string[]
): PlayerBannerVariant {
  const index = playerIds.indexOf(playerId);
  return index === 0 ? 'ember' : 'frost';
}

export function playerBannerRevealClasses(
  ownerPlayerId: string,
  viewerPlayerId: string,
  playerIds: string[],
  extra?: string
): string {
  const variant = bannerVariantForPlayer(ownerPlayerId, playerIds);
  const isMe = ownerPlayerId === viewerPlayerId;
  return clsx(
    'sw-reveal-box',
    variant === 'ember' ? 'sw-reveal-box--ember' : 'sw-reveal-box--frost',
    isMe ? 'sw-reveal-box--me sw-reveal-box--yours' : 'sw-reveal-box--theirs',
    extra
  );
}
