import type { MafiaPhase } from "../types";

/** Player/narrator phase banner — Day and Night only (no separate “morning”). */
export function mafiaPhaseDisplayLabel(
  phase: MafiaPhase,
  _dayNumber: number,
  _nightNumber: number,
): string {
  switch (phase) {
    case "day":
    case "morning":
      return "Day";
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
