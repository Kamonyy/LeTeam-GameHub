import type { MafiaChronicleEntry } from '../types';

const NIGHT_ACTION_VERBS: Record<string, string> = {
  healer: 'protected',
  mafia: 'targeted',
  sniper: 'silenced',
  seer: 'inspected',
  sheriff: 'judged',
};

export function formatChronicleEntry(
  entry: MafiaChronicleEntry,
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
    case 'phase_morning': {
      const dayNum = Math.max(1, (entry.dayNumber ?? 0) + 1);
      return {
        icon: '☀️',
        text: `Day ${dayNum} — announce night outcomes`,
      };
    }
    case 'day_elimination': {
      const role = entry.roleId ? roleName(entry.roleId) : null;
      return {
        icon: '⚖️',
        text: `${playerName(entry.targetId!)} was eliminated by village vote`,
        detail: role ? `Role revealed: ${role}` : undefined,
      };
    }
    case 'night_step': {
      const actor =
        entry.actorPlayerId ? playerName(entry.actorPlayerId) : 'Unknown player';
      if (entry.playAlong) {
        const role = entry.roleId ? roleName(entry.roleId) : 'role';
        return {
          icon: '🎭',
          text: `${actor} (${role}): play-along ritual — no effect`,
        };
      }
      if (entry.skipped) {
        return {
          icon: '⏭️',
          text: `${actor}: no action taken`,
        };
      }
      const verb =
        NIGHT_ACTION_VERBS[entry.stepKey ?? ''] ??
        (entry.stepTitleEn ? entry.stepTitleEn.toLowerCase() : 'acted on');
      return {
        icon: '🌑',
        text: `${actor} ${verb}: ${playerName(entry.targetId!)}`,
      };
    }
    case 'seer_result': {
      const seer = entry.actorPlayerId ?
        playerName(entry.actorPlayerId)
      : 'Seer';
      return {
        icon: '🔮',
        text: `${seer} inspected ${playerName(entry.targetId!)}`,
        detail: `Alignment: ${entry.alignment}`,
      };
    }
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
