import { MafiaEngine } from "@shared/games/mafia/MafiaEngine.js";
import { suggestBalancedSetup } from "@shared/games/mafia/balancing.js";
import { isEvilRole } from "@shared/games/mafia/roles.js";
import type { LobbyState } from "@/lib/hub/types";
import type {
  MafiaNarratorGameState,
  MafiaPlayerGameState,
} from "../types";

export const AUDIT_NARRATOR_ID = "audit-host";
export const AUDIT_PLAYER_IDS = ["audit-p1", "audit-p2", "audit-p3", "audit-p4", "audit-p5", "audit-p6"];

const NAMES: Record<string, string> = {
  [AUDIT_NARRATOR_ID]: "Host Narrator",
  "audit-p1": "Amina",
  "audit-p2": "Omar",
  "audit-p3": "Layla",
  "audit-p4": "Youssef",
  "audit-p5": "Sara",
  "audit-p6": "Karim",
};

function engineSettings() {
  const counts = suggestBalancedSetup(AUDIT_PLAYER_IDS.length).counts;
  return {
    narratorId: AUDIT_NARRATOR_ID,
    revealRoleOnDeath: true,
    roleCounts: counts,
  };
}

function lobbyBase(
  status: LobbyState["status"],
  overrides?: Partial<LobbyState>,
): LobbyState {
  const players = [
    {
      id: AUDIT_NARRATOR_ID,
      displayName: NAMES[AUDIT_NARRATOR_ID],
      connected: true,
    },
    ...AUDIT_PLAYER_IDS.map((id) => ({
      id,
      displayName: NAMES[id],
      connected: true,
    })),
  ];
  const counts = suggestBalancedSetup(AUDIT_PLAYER_IDS.length).counts;
  return {
    roomId: "AUDIT01",
    hostId: AUDIT_NARRATOR_ID,
    status,
    gameType: "mafia",
    players,
    minPlayers: 5,
    maxPlayers: 11,
    devBotsEnabled: true,
    settings: {
      narratorId: AUDIT_NARRATOR_ID,
      revealRoleOnDeath: true,
      roleCounts: counts,
    },
    ...overrides,
  };
}

function freshEngine(): MafiaEngine {
  return new MafiaEngine(AUDIT_PLAYER_IDS, engineSettings());
}

function ackAllRoles(engine: MafiaEngine) {
  for (const id of AUDIT_PLAYER_IDS) {
    engine.acknowledgeRole(id);
  }
}

function firstAlive(engine: MafiaEngine): string {
  return (
    AUDIT_PLAYER_IDS.find((id) => engine.players[id]?.alive) ?? AUDIT_PLAYER_IDS[0]
  );
}

function aliveNonMafia(engine: MafiaEngine): string[] {
  return AUDIT_PLAYER_IDS.filter(
    (id) => engine.players[id]?.alive && engine.roleByPlayer[id] !== "mafia",
  );
}

function advanceNightSteps(engine: MafiaEngine) {
  while (engine.phase === "night") {
    const panel = engine.serializeForPlayer(AUDIT_NARRATOR_ID) as MafiaNarratorGameState;
    const step = panel.narratorPanel?.nightStep;
    if (!step) break;
    if (step.requiresTarget) {
      if (step.key === "mafia" && step.maxTargetCount > 1) {
        const victim = aliveNonMafia(engine)[0];
        if (victim) engine.narratorSetNightTarget(AUDIT_NARRATOR_ID, victim);
      } else {
        const victim =
          step.key === "mafia" ? aliveNonMafia(engine)[0] : firstAlive(engine);
        if (victim) {
          engine.narratorSetNightTarget(AUDIT_NARRATOR_ID, victim);
        }
      }
    }
    const res = engine.narratorConfirmNightStep(AUDIT_NARRATOR_ID);
    if (!res.success) break;
  }
}

export type AuditScenario = {
  id: string;
  label: string;
  kind: "shell" | "lobby-host" | "lobby-guest" | "narrator" | "player";
  lobby?: LobbyState;
  state?: MafiaNarratorGameState | MafiaPlayerGameState;
  playerId?: string;
};

export function buildAuditScenarios(): AuditScenario[] {
  const scenarios: AuditScenario[] = [
    { id: "shell-create", label: "Create / join gate", kind: "shell" },
    { id: "shell-invite", label: "Invite join gate", kind: "shell" },
    {
      id: "lobby-host",
      label: "Lobby (host)",
      kind: "lobby-host",
      lobby: lobbyBase("lobby"),
      playerId: AUDIT_NARRATOR_ID,
    },
    {
      id: "lobby-guest",
      label: "Lobby (guest)",
      kind: "lobby-guest",
      lobby: lobbyBase("lobby"),
      playerId: "audit-p2",
    },
  ];

  const roleReveal = freshEngine();
  scenarios.push({
    id: "narrator-role-reveal",
    label: "Narrator — role reveal",
    kind: "narrator",
    lobby: lobbyBase("playing"),
    state: roleReveal.serializeForPlayer(AUDIT_NARRATOR_ID) as MafiaNarratorGameState,
  });
  scenarios.push({
    id: "player-role-reveal",
    label: "Player — role reveal",
    kind: "player",
    lobby: lobbyBase("playing"),
    playerId: "audit-p1",
    state: roleReveal.serializeForPlayer("audit-p1") as MafiaPlayerGameState,
  });

  const night = freshEngine();
  ackAllRoles(night);
  night.narratorBeginNight(AUDIT_NARRATOR_ID);
  scenarios.push({
    id: "narrator-night",
    label: "Narrator — night",
    kind: "narrator",
    lobby: lobbyBase("playing"),
    state: night.serializeForPlayer(AUDIT_NARRATOR_ID) as MafiaNarratorGameState,
  });
  const nightWaitId =
    AUDIT_PLAYER_IDS.find((id) => {
      const s = night.serializeForPlayer(id) as MafiaPlayerGameState;
      return s.nightCallout && !s.nightCallout.isYourTurn;
    }) ?? "audit-p2";
  scenarios.push({
    id: "player-night-wait",
    label: "Player — night (waiting)",
    kind: "player",
    lobby: lobbyBase("playing"),
    playerId: nightWaitId,
    state: night.serializeForPlayer(nightWaitId) as MafiaPlayerGameState,
  });

  const nightYourId = AUDIT_PLAYER_IDS.find((id) => {
    const s = night.serializeForPlayer(id) as MafiaPlayerGameState;
    return s.nightCallout?.isYourTurn;
  });
  if (nightYourId) {
    scenarios.push({
      id: "player-night-yours",
      label: "Player — night (your turn)",
      kind: "player",
      lobby: lobbyBase("playing"),
      playerId: nightYourId,
      state: night.serializeForPlayer(nightYourId) as MafiaPlayerGameState,
    });
  }

  const morning = freshEngine();
  ackAllRoles(morning);
  morning.narratorBeginNight(AUDIT_NARRATOR_ID);
  advanceNightSteps(morning);
  scenarios.push({
    id: "narrator-morning",
    label: "Narrator — morning",
    kind: "narrator",
    lobby: lobbyBase("playing"),
    state: morning.serializeForPlayer(AUDIT_NARRATOR_ID) as MafiaNarratorGameState,
  });
  scenarios.push({
    id: "player-morning",
    label: "Player — morning aftermath",
    kind: "player",
    lobby: lobbyBase("playing"),
    playerId: "audit-p1",
    state: morning.serializeForPlayer("audit-p1") as MafiaPlayerGameState,
  });

  const day = freshEngine();
  ackAllRoles(day);
  day.narratorBeginNight(AUDIT_NARRATOR_ID);
  advanceNightSteps(day);
  day.narratorEndMorning(AUDIT_NARRATOR_ID);
  scenarios.push({
    id: "narrator-day",
    label: "Narrator — day",
    kind: "narrator",
    lobby: lobbyBase("playing"),
    state: day.serializeForPlayer(AUDIT_NARRATOR_ID) as MafiaNarratorGameState,
  });

  const dayDead = freshEngine();
  ackAllRoles(dayDead);
  dayDead.narratorBeginNight(AUDIT_NARRATOR_ID);
  advanceNightSteps(dayDead);
  dayDead.narratorEndMorning(AUDIT_NARRATOR_ID);
  dayDead.narratorDayEliminate(AUDIT_NARRATOR_ID, "audit-p1");
  scenarios.push({
    id: "player-day-dead",
    label: "Player — eliminated (day)",
    kind: "player",
    lobby: lobbyBase("playing"),
    playerId: "audit-p1",
    state: dayDead.serializeForPlayer("audit-p1") as MafiaPlayerGameState,
  });

  const matchOver = freshEngine();
  ackAllRoles(matchOver);
  for (const id of AUDIT_PLAYER_IDS) {
    const roleId = matchOver.roleByPlayer[id];
    if (roleId && isEvilRole(roleId) && matchOver.players[id]) {
      matchOver.players[id].alive = false;
    }
  }
  matchOver.phase = "match_over";
  matchOver.winnerTeam = "good";
  matchOver.dayNumber = 2;
  matchOver.stateVersion += 1;
  scenarios.push({
    id: "player-match-over",
    label: "Player — match over",
    kind: "player",
    lobby: lobbyBase("finished"),
    playerId: "audit-p2",
    state: matchOver.serializeForPlayer("audit-p2") as MafiaPlayerGameState,
  });

  return scenarios;
}
