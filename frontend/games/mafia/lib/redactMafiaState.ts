import type {
  MafiaGameState,
  MafiaNarratorGameState,
  MafiaNarratorMorningSummary,
  MafiaNarratorPanel,
  MafiaPlayerGameState,
  MafiaPlayerMorningSummary,
} from "../types";

/** Player-safe morning summary (no seer / mafia night meta). */
function stripMorningSummaryForPlayer(
  summary: MafiaGameState["lastMorningSummary"],
): MafiaPlayerMorningSummary | null {
  if (!summary) return null;
  return {
    deaths: summary.deaths,
    saved: summary.saved,
    silenced: summary.silenced,
  };
}

/**
 * Remove narrator-only fields from a Mafia game state payload.
 * Server should already gate these; this is belt-and-suspenders for DevTools leaks.
 */
export function stripNarratorSecrets(state: MafiaGameState): MafiaGameState {
  if (state.isNarrator) {
    return state as MafiaNarratorGameState;
  }

  // Socket payloads may still carry narrator-only keys; strip defensively.
  const leaked = state as MafiaPlayerGameState & {
    narratorPanel?: MafiaNarratorPanel;
    lastMorningSummary?: MafiaNarratorMorningSummary | null;
  };
  const { narratorPanel: _panel, lastMorningSummary, ...rest } = leaked;

  return {
    ...rest,
    isNarrator: false,
    lastMorningSummary: stripMorningSummaryForPlayer(lastMorningSummary),
  } as MafiaPlayerGameState;
}
