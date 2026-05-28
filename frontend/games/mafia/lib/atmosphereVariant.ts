import type { MafiaAtmosphereVariant } from '../components/MafiaAtmosphere';
import type { MafiaPhase } from '../types';

export function mafiaAtmosphereVariant(
  phase: MafiaPhase | undefined,
  inLobby: boolean
): MafiaAtmosphereVariant {
  if (inLobby) return 'day';
  if (phase === 'night') return 'night';
  if (phase === 'morning') return 'morning';
  if (phase === 'day' || phase === 'role_reveal') return 'day';
  return 'night';
}
