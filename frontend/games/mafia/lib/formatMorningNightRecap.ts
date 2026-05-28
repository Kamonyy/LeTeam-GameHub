import type { MafiaNightRecapBeat } from "../types";

/** Narrator-facing detail line for one night action beat. */
export function formatMorningNightRecapDetail(
  beat: MafiaNightRecapBeat,
  playerName: (id: string) => string,
): string {
  const who = beat.targetPlayerId
    ? playerName(beat.targetPlayerId)
    : null;

  switch (beat.outcome) {
    case "skipped":
      return "No target recorded (step skipped).";
    case "protected":
      return who
        ? `Protected ${who} (Mafia kill was not blocked).`
        : "No protection recorded.";
    case "saved_kill":
      return who
        ? `Protected ${who} — blocked the Mafia kill.`
        : "Blocked the Mafia kill.";
    case "kill_landed":
      return who ? `Kill succeeded on ${who}.` : "Kill succeeded.";
    case "silenced":
      return who ? `Silenced ${who} for today.` : "Silence recorded.";
    case "inspected":
      return who && beat.alignment
        ? `Inspected ${who} — ${beat.alignment}.`
        : who
          ? `Inspected ${who}.`
          : "No inspection recorded.";
    case "sheriff_executed_evil":
      return who ? `Judged ${who} (evil) — executed.` : "Evil target executed.";
    case "sheriff_executed_innocent":
      return who ? `Judged ${who} (good) — executed.` : "Good target executed.";
    case "sheriff_misfire":
      return who
        ? `Judged ${who} (good) — ${who} and the Sheriff both died.`
        : "Good target — Sheriff also died.";
    default:
      return who ?? "Action recorded.";
  }
}
