export type RevealRole = 'guessed' | 'my-assignment' | 'opponent-assignment';

export interface RevealCopy {
  caption: string;
}

export function getRevealCaption(
  role: RevealRole,
  opts: {
    isLol: boolean;
    opponentName: string;
    guesserName: string;
    viewerPlayerId: string;
    guesserPlayerId: string | null;
    ownerPlayerId: string;
  }
): string {
  const {
    isLol,
    opponentName,
    guesserName,
    viewerPlayerId,
    guesserPlayerId,
    ownerPlayerId,
  } = opts;

  const youGuessed = guesserPlayerId === viewerPlayerId;
  const youOwn = ownerPlayerId === viewerPlayerId;
  const noun = isLol ? 'champion' : 'word';

  if (role === 'guessed') {
    if (youOwn) {
      return `Your ${noun} · guessed by ${guesserName}`;
    }
    return `${opponentName}'s ${noun} · ${youGuessed ? 'you guessed it' : `guessed by ${guesserName}`}`;
  }

  if (role === 'my-assignment') {
    return `You chose this for ${opponentName}`;
  }

  return `${opponentName} chose this for you`;
}

export function revealSideHeading(
  role: 'my-assignment' | 'opponent-assignment',
  opponentName: string,
  isLol: boolean
): string {
  if (role === 'my-assignment') {
    return isLol ? 'Your champion' : 'Your word';
  }
  return isLol ? `${opponentName}'s champion` : `${opponentName}'s word`;
}
