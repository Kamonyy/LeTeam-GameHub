import type { TavernChronicleEntry } from '../types';

const STEP_LABELS: Record<string, string> = {
  healer: 'Doctor protected',
  mafia: 'Mafia targeted',
  sniper: 'Sniper silenced',
  seer: 'Seer inspected',
  sheriff: 'Sheriff judged',
};

export function formatChronicleEntry(
  entry: TavernChronicleEntry,
  playerName: (id: string) => string,
  roleName: (roleId: string) => string
): { icon: string; text: string; detail?: string } {
  switch (entry.kind) {
    case 'game_start':
      return { icon: '🎭', text: 'Match started — roles dealt to all players' };
    case 'oath':
      return {
        icon: '📜',
        text: `${playerName(entry.playerId!)} viewed their secret role`,
      };
    case 'phase_day':
      return {
        icon: '☀️',
        text: `Day ${entry.dayNumber ?? '?'} opened — discussion & vote in person`,
      };
    case 'phase_night':
      return {
        icon: '🌙',
        text: `Night ${entry.nightNumber ?? '?'} began — run the ritual steps`,
      };
    case 'phase_morning':
      return {
        icon: '🌅',
        text: `Morning after Night ${entry.nightNumber ?? '?'} — announce outcomes`,
      };
    case 'day_elimination': {
      const role = entry.roleId ? roleName(entry.roleId) : null;
      return {
        icon: '⚖️',
        text: `${playerName(entry.targetId!)} was eliminated by village vote`,
        detail: role ? `Role revealed: ${role}` : undefined,
      };
    }
    case 'night_step': {
      if (entry.skipped) {
        return {
          icon: '⏭️',
          text: `${entry.stepTitleEn ?? entry.stepKey}: no action taken`,
        };
      }
      const label = STEP_LABELS[entry.stepKey ?? ''] ?? entry.stepTitleEn ?? 'Night action';
      return {
        icon: '🌑',
        text: `${label}: ${playerName(entry.targetId!)}`,
      };
    }
    case 'seer_result':
      return {
        icon: '🔮',
        text: `Seer checked ${playerName(entry.targetId!)}`,
        detail: `Alignment: ${entry.alignment}`,
      };
    case 'night_resolved': {
      const deaths = entry.deaths ?? [];
      const saved = entry.saved ?? [];
      const silenced = entry.silenced ?? [];
      const parts: string[] = [];
      if (deaths.length === 0) parts.push('No one died');
      else parts.push(`${deaths.map((id) => playerName(id)).join(', ')} died`);
      if (saved.length) parts.push(`${saved.map((id) => playerName(id)).join(', ')} saved`);
      if (silenced.length) {
        parts.push(`${silenced.map((id) => playerName(id)).join(', ')} silenced tomorrow`);
      }
      return { icon: '⚰️', text: 'Night resolved', detail: parts.join(' · ') };
    }
    case 'win':
      return {
        icon: entry.winnerTeam === 'good' ? '✨' : '🗡️',
        text:
          entry.winnerTeam === 'good' ?
            'Good wins — all evil eliminated'
          : 'Evil wins — Mafia reached parity',
      };
    default:
      return { icon: '•', text: entry.kind };
  }
}
