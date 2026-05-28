import type { MafiaPhase } from "../types";

/** Player/narrator phase banner label for the current phase. */
export function mafiaPhaseDisplayLabel(
  phase: MafiaPhase,
  _dayNumber: number,
  _nightNumber: number,
): string {
  switch (phase) {
    case "day":
      return "Day";
    case "morning":
      return "Morning";
    case "night":
      return "Night";
    case "role_reveal":
      return "Role reveal";
    case "match_over":
      return "Match over";
    default:
      return phase;
  }
}
