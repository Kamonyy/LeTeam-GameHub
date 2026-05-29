/** Stable key for comparing word/champion assignments (dedupe reveal cards). */
export function assignmentKey(
  word: string | null,
  championId: string | null
): string | null {
  if (championId) return `c:${championId}`;
  if (word) return `w:${word.toLowerCase()}`;
  return null;
}

export interface AssignmentOwnerContext {
  viewerPlayerId: string;
  playerIds: string[];
  myChosenWord: string | null;
  myChosenChampionId: string | null;
  opponentChosenWord: string | null;
  opponentChosenChampionId: string | null;
  /** Who earned the point — used only when content cannot be matched. */
  guesserPlayerId?: string | null;
  /** Who confirmed the guess (assigner) — server lastAction.creatorId. */
  assignerPlayerId?: string | null;
}

/**
 * Player who chose this word/champion (ember/frost border owner).
 * The guesser earns the point; the assigner owns the assignment styling.
 */
export function assignmentOwnerPlayerId(
  word: string | null,
  championId: string | null,
  ctx: AssignmentOwnerContext
): string {
  const {
    viewerPlayerId,
    playerIds,
    myChosenWord,
    myChosenChampionId,
    opponentChosenWord,
    opponentChosenChampionId,
    guesserPlayerId,
    assignerPlayerId,
  } = ctx;

  const opponentId =
    playerIds.find((id) => id !== viewerPlayerId) ?? playerIds[0];

  const key = assignmentKey(word, championId);
  if (key) {
    const myKey = assignmentKey(myChosenWord, myChosenChampionId);
    const oppKey = assignmentKey(
      opponentChosenWord,
      opponentChosenChampionId
    );
    if (key === myKey) return viewerPlayerId;
    if (key === oppKey) return opponentId;
  }

  if (assignerPlayerId && playerIds.includes(assignerPlayerId)) {
    return assignerPlayerId;
  }

  if (guesserPlayerId) {
    return playerIds.find((id) => id !== guesserPlayerId) ?? playerIds[0];
  }

  return playerIds[0];
}
