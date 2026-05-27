import type { TavernChronicleEntry } from '../types';

export function formatPlayerChronicleEntry(
  entry: TavernChronicleEntry,
  playerName: (id: string) => string,
  roleName: (roleId: string) => string
): { icon: string; text: string; detail?: string } {
  switch (entry.kind) {
    case 'player_game_start':
      return { icon: '🎭', text: 'The game has started' };
    case 'player_role_seen':
      return { icon: '📜', text: 'You viewed your secret role' };
    case 'player_phase_day':
      return {
        icon: '☀️',
        text: `Day ${entry.dayNumber ?? '?'} — discuss and vote in person`,
      };
    case 'player_phase_night':
      return {
        icon: '🌙',
        text: `Night ${entry.nightNumber ?? '?'} — eyes closed, follow the narrator`,
      };
    case 'player_phase_morning':
      return {
        icon: '🌅',
        text: `Morning — the narrator announces what happened`,
      };
    case 'player_vote_out':
      return {
        icon: '⚖️',
        text: `${playerName(entry.targetId!)} was voted out`,
        detail:
          entry.roleId ? `Role revealed: ${roleName(entry.roleId)}` : undefined,
      };
    case 'player_you_voted_out':
      return {
        icon: '💀',
        text: 'You were voted out by the village',
      };
    case 'player_death':
      return {
        icon: '⚰️',
        text: `${playerName(entry.targetId!)} died overnight`,
      };
    case 'player_you_died':
      return {
        icon: '💀',
        text: 'You died overnight',
      };
    case 'player_peaceful_night':
      return { icon: '🕊️', text: 'No one died last night' };
    case 'player_silenced':
      return {
        icon: '🤐',
        text: 'You were silenced — you cannot speak today',
      };
    case 'player_doctor_action':
      return entry.skipped ?
          { icon: '⏭️', text: 'You chose not to heal anyone tonight' }
        : {
            icon: '⚕️',
            text: `You protected ${playerName(entry.targetId!)}`,
          };
    case 'player_mafia_action':
      return entry.skipped ?
          { icon: '⏭️', text: 'Your faction took no kill tonight' }
        : {
            icon: '🗡️',
            text: `Your faction targeted ${playerName(entry.targetId!)}`,
          };
    case 'player_seer_action':
      return entry.skipped ?
          { icon: '⏭️', text: 'You did not inspect anyone tonight' }
        : {
            icon: '🔮',
            text: `You inspected ${playerName(entry.targetId!)}`,
            detail: 'The narrator knows the alignment — not shown here',
          };
    case 'player_sniper_action':
      return entry.skipped ?
          { icon: '⏭️', text: 'You chose not to silence anyone tonight' }
        : {
            icon: '🎯',
            text: `You silenced ${playerName(entry.targetId!)} for tomorrow`,
          };
    case 'player_sheriff_action':
      return entry.skipped ?
          { icon: '⏭️', text: 'You chose not to judge anyone tonight' }
        : {
            icon: '⚖️',
            text: `You judged ${playerName(entry.targetId!)}`,
          };
    case 'player_win':
      return {
        icon: entry.winnerTeam === 'good' ? '✨' : '🗡️',
        text:
          entry.winnerTeam === 'good' ?
            'Good wins — the village prevails'
          : 'Evil wins — the shadows take the council',
      };
    default:
      return { icon: '•', text: entry.kind };
  }
}
