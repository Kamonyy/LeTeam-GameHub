"use client";

import clsx from "clsx";
import type { TavernCouncilGameState } from "../types";
import type { LobbyState } from "@/lib/hub/types";
import RoleRevealCard from "./RoleRevealCard";
import PlayerActivityLog from "./PlayerActivityLog";
import { roleThemeStyleFromRole } from "../lib/roleTheme";

interface PlayerCompanionProps {
  state: TavernCouncilGameState;
  lobby: LobbyState;
  playerId: string;
  onAcknowledgeRole?: () => void;
  acknowledging?: boolean;
}

function displayName(lobby: LobbyState, id: string) {
  return lobby.players.find((p) => p.id === id)?.displayName ?? "Player";
}

function roleName(roleId: string) {
  const labels: Record<string, string> = {
    mafia: "Mafia",
    seer: "Seer",
    doctor: "Doctor",
    villager: "Villager",
    sniper: "Sniper",
    sheriff: "Sheriff",
  };
  return labels[roleId] ?? roleId;
}

function PhaseCeremony({ label }: { label: string }) {
  return (
    <div className="tc-phase-ceremony">
      <span className="tc-phase-ceremony__blade" aria-hidden />
      <span className="tc-phase-sigil">{label}</span>
      <span
        className="tc-phase-ceremony__blade tc-phase-ceremony__blade--right"
        aria-hidden
      />
    </div>
  );
}

function CompactRoleBadge({
  role,
}: {
  role: NonNullable<TavernCouncilGameState["myRole"]>;
}) {
  return (
    <div
      className={clsx("tc-role-badge", `tc-team--${role.team}`)}
      style={roleThemeStyleFromRole(role.id, role.accentColor)}
      aria-label={`Your role: ${role.nameEn}`}
    >
      <span className="tc-role-badge__icon" aria-hidden>
        {role.icon}
      </span>
      <span className="tc-role-badge__text">
        <span className="tc-role-badge__ar tc-font-display">{role.nameAr}</span>
        <span className="tc-role-badge__en tc-font-display">{role.nameEn}</span>
      </span>
    </div>
  );
}

export default function PlayerCompanion({
  state,
  lobby,
  playerId,
  onAcknowledgeRole,
  acknowledging,
}: PlayerCompanionProps) {
  const phaseLabel =
    state.phase === "day"
      ? `Day ${state.dayNumber}`
      : state.phase === "night"
        ? `Night ${state.nightNumber}`
        : state.phase === "morning"
          ? "Morning"
          : state.phase === "role_reveal"
            ? "Role reveal"
            : state.phase === "match_over"
              ? "Game over"
              : state.phase;

  const roleReveal = state.phase === "role_reveal";
  const hasChronicle =
    state.playerChronicle != null && state.playerChronicle.length > 0;

  return (
    <div
      className={clsx(
        "tc-p4-companion tc-companion flex flex-col",
        roleReveal ? "tc-companion--role-reveal" : "tc-companion--play",
      )}
    >
      <PhaseCeremony label={phaseLabel} />

      {roleReveal && state.myRole && (
        <RoleRevealCard
          role={state.myRole}
          onAcknowledge={
            state.canAcknowledgeRole ? onAcknowledgeRole : undefined
          }
          acknowledging={acknowledging}
        />
      )}

      {!roleReveal && (
        <div className="tc-companion__stack">
          {state.myRole && <CompactRoleBadge role={state.myRole} />}

          {state.phase === "night" && state.nightCallout?.isYourTurn && (
            <div
              className="tc-player-night-call tc-player-night-call--yours"
              role="status"
            >
              <span className="tc-player-night-call__icon" aria-hidden>
                {state.nightCallout.roleIcon ?? state.myRole?.icon}
              </span>
              <p className="tc-player-night-call__title tc-font-display">
                Narrator may call on you
              </p>
              <p className="tc-player-night-call__step">
                {state.nightCallout.stepTitleEn}
              </p>
              <p className="tc-player-night-call__hint">
                Stay ready — answer only when the narrator wakes you.
              </p>
            </div>
          )}

          {state.phase === "night" &&
            state.nightCallout &&
            !state.nightCallout.isYourTurn && (
              <div className="tc-player-night-call" role="status">
                <p className="tc-player-night-call__title tc-font-display">
                  Night {state.nightNumber}
                </p>
                <p className="tc-player-night-call__hint">
                  Eyes closed. Wait for the narrator — do not speak.
                </p>
              </div>
            )}

          {!state.iAmAlive && state.phase !== "match_over" && (
            <p className="tc-body-sm text-center">
              You have been eliminated. Follow the narrator.
            </p>
          )}

          {state.iAmSilenced && state.phase === "day" && (
            <p className="tc-body-sm text-center tc-display">
              You are silenced today.
            </p>
          )}

          <div className="tc-stone-panel p-4 w-full tc-companion__council">
            <p className="text-xs tc-display tc-font-display mb-3 uppercase tracking-widest">
              Council
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {state.playerCards.map((card) => (
                <li
                  key={card.id}
                  className={clsx(
                    "tc-council-seat list-none",
                    !card.alive && "tc-council-seat--dead",
                    card.id === playerId && "tc-council-seat--self",
                  )}
                >
                  <span
                    className="tc-dot"
                    style={{ background: card.color }}
                    aria-hidden
                  />
                  <span className="tc-council-seat__name truncate">
                    {displayName(lobby, card.id)}
                    {card.id === playerId ? " (you)" : ""}
                  </span>
                  <span className="tc-council-seat__meta">
                    {card.alive ? "alive" : "dead"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {hasChronicle && (
            <PlayerActivityLog
              sections={state.playerChronicle!}
              playerName={(id) => displayName(lobby, id)}
              roleName={roleName}
            />
          )}
        </div>
      )}

      {state.phase === "match_over" && state.winnerTeam && (
        <p className="tc-companion__outcome text-lg tc-font-display tc-display text-center">
          {state.winnerTeam === "good"
            ? "The village prevails!"
            : "The shadows claim victory."}
        </p>
      )}

      {!roleReveal && state.phase !== "match_over" && (
        <p className="tc-companion__hint">Listen to your narrator.</p>
      )}
    </div>
  );
}
