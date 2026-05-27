"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { TavernCouncilGameState, TavernNarratorAction } from "../types";
import type { LobbyState } from "@/lib/hub/types";
import NarratorTeamRoster from "./NarratorTeamRoster";
import NarratorChronicle from "./NarratorChronicle";
import NarratorTargetPicker from "./NarratorTargetPicker";
import NarratorAskPrompt from "./NarratorAskPrompt";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

interface NarratorDashboardProps {
  state: TavernCouncilGameState;
  lobby: LobbyState;
  onNarratorAction: (
    action: TavernNarratorAction,
    targetPlayerId?: string | null,
  ) => Promise<boolean>;
  busy?: boolean;
}

type MobileTab = "actions" | "roster" | "log";

const MOBILE_MQ = "(max-width: 959px)";

function name(lobby: LobbyState, id: string) {
  return lobby.players.find((p) => p.id === id)?.displayName ?? id.slice(0, 8);
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

function currentPeriodKey(state: TavernCouncilGameState): string | undefined {
  if (state.phase === "role_reveal") return "setup:0:0";
  if (state.phase === "day") return `day:${state.dayNumber}:0`;
  if (state.phase === "night") {
    return `night:${state.dayNumber}:${state.nightNumber}`;
  }
  if (state.phase === "morning") {
    return `morning:${state.dayNumber}:${state.nightNumber}`;
  }
  if (state.phase === "match_over") {
    return `match_over:${state.dayNumber}:${state.nightNumber}`;
  }
  return undefined;
}

function PhaseCeremony({ label }: { label: string }) {
  return (
    <div className="tc-phase-ceremony tc-phase-ceremony--compact">
      <span className="tc-phase-ceremony__blade" aria-hidden />
      <span className="tc-phase-sigil">{label}</span>
      <span
        className="tc-phase-ceremony__blade tc-phase-ceremony__blade--right"
        aria-hidden
      />
    </div>
  );
}

function NightProgressPills({
  currentIndex,
  total,
}: {
  currentIndex: number;
  total: number;
}) {
  return (
    <div
      className="tc-night-progress"
      role="progressbar"
      aria-valuenow={currentIndex + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Night step ${currentIndex + 1} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={clsx(
            "tc-night-progress__dot",
            i < currentIndex && "tc-night-progress__dot--done",
            i === currentIndex && "tc-night-progress__dot--current",
          )}
          title={`Step ${i + 1}`}
        />
      ))}
    </div>
  );
}

export default function NarratorDashboard({
  state,
  lobby,
  onNarratorAction,
  busy = false,
}: NarratorDashboardProps) {
  const panel = state.narratorPanel;
  const step = panel?.nightStep;
  const playerName = (id: string) => name(lobby, id);
  const [mobileTab, setMobileTab] = useState<MobileTab>("actions");
  const [isMobile, setIsMobile] = useState(false);
  const [pendingElimination, setPendingElimination] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const showPanel = (tab: MobileTab) => !isMobile || mobileTab === tab;

  const phaseLabel = useMemo(() => {
    if (state.phase === "day") return `Day ${state.dayNumber}`;
    if (state.phase === "night") return `Night ${state.nightNumber}`;
    if (state.phase === "morning") return "Morning";
    if (state.phase === "role_reveal") return "Role reveal";
    if (state.phase === "match_over") return "Match over";
    return state.phase;
  }, [state]);

  const seerReveal = panel?.lastSeerReveal;
  const periodKey = currentPeriodKey(state);

  const selectTarget = async (targetId: string | null) => {
    if (!step?.requiresTarget) return;
    await onNarratorAction("set_night_target", targetId);
  };

  return (
    <div className="tc-p3-narrator tc-narrator-layout tc-narrator-layout--compact">
      <header className="tc-narrator-layout__header tc-narrator-layout__header--compact">
        <div>
          <h1 className="tc-narrator-console-title tc-font-display tc-display">
            Loremaster's Codex
          </h1>
          <PhaseCeremony label={phaseLabel} />
        </div>
        <button
          type="button"
          className="tc-btn-ghost text-sm"
          disabled={busy}
          onClick={() => onNarratorAction("reset_match")}
        >
          Adjourn Council
        </button>
      </header>

      {panel?.setupWarnings && panel.setupWarnings.length > 0 && (
        <div className="tc-stone-panel tc-stone-panel--warning p-2 mb-3 text-sm tc-muted">
          {panel.setupWarnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}

      <nav className="tc-narrator-tabs" aria-label="Narrator panels">
        {(
          [
            ["actions", "Actions"],
            ["roster", "Roster"],
            ["log", "Log"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={clsx(
              "tc-narrator-tabs__btn",
              mobileTab === id && "tc-narrator-tabs__btn--active",
            )}
            aria-current={mobileTab === id ? "page" : undefined}
            onClick={() => setMobileTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="tc-narrator-layout__grid">
        <div
          className={clsx(
            "tc-narrator-layout__actions",
            !showPanel("actions") && "tc-narrator-layout__panel--hidden",
          )}
        >
          <section className="tc-action-deck tc-action-deck--compact">
            <div className="tc-action-deck__head">
              <h2 className="tc-action-deck__title tc-font-display">
                Decree of the Hour
              </h2>
              <span className="tc-action-deck__phase">{phaseLabel}</span>
            </div>

            {state.phase === "role_reveal" && panel?.canStartDay && (
              <div className="tc-action-card tc-action-card--compact">
                <p className="tc-action-card__lead">
                  Wait until every player has opened their role on their phone,
                  then start the first day.
                </p>
                <button
                  type="button"
                  className="tc-btn-royal tc-btn-royal--wide"
                  disabled={busy}
                  onClick={() => onNarratorAction("start_day")}
                >
                  ☀️ Begin day 1
                </button>
              </div>
            )}

            {state.phase === "night" && step && (
              <div className="tc-action-card tc-action-card--night tc-action-card--compact">
                <div className="tc-action-card__night-head">
                  <p className="tc-ritual__lock-label">Night ritual</p>
                  <NightProgressPills
                    currentIndex={step.index}
                    total={step.total}
                  />
                </div>

                <details
                  className="tc-action-details tc-action-details--first"
                  open
                >
                  <summary className="tc-action-details__summary">
                    Instructions
                    {step.instructionAr ? " · تعليمات" : ""}
                  </summary>
                  <p className="tc-action-card__instruction">
                    {step.instructionEn}
                  </p>
                  {step.instructionAr && (
                    <p className="tc-action-card__instruction" dir="rtl">
                      {step.instructionAr}
                    </p>
                  )}
                </details>

                <h3 className="tc-action-card__step tc-font-display">
                  {step.titleEn}
                </h3>
                <p className="tc-action-card__step-ar" dir="rtl">
                  {step.titleAr}
                </p>

                {step.roleIcon && (
                  <div className="tc-ritual__role-header tc-ritual__role-header--compact">
                    <span className="tc-ritual__role-icon" aria-hidden>
                      {step.roleIcon}
                    </span>
                    <div>
                      <p className="tc-ritual__role-name tc-font-display">
                        {step.roleNameEn}
                      </p>
                      <p className="tc-ritual__role-name-ar" dir="rtl">
                        {step.roleNameAr}
                      </p>
                    </div>
                  </div>
                )}

                {step.roleId && (
                  <NarratorAskPrompt
                    step={step}
                    holders={step.roleHolders}
                    playerName={playerName}
                  />
                )}

                {seerReveal && (
                  <div
                    className="tc-seer-result tc-seer-result--compact"
                    role="status"
                  >
                    <p className="tc-seer-result__label">🔮 RESULT</p>
                    <p className="tc-seer-result__line">
                      {playerName(seerReveal.playerId)} · {seerReveal.alignment}
                    </p>
                  </div>
                )}

                {step.requiresTarget && panel && (
                  <NarratorTargetPicker
                    players={panel.allPlayers}
                    playerIds={state.playerIds}
                    playerName={playerName}
                    selectedId={step.selectedTargetId}
                    blockedIds={step.blockedTargetIds}
                    allowSkip={step.allowSkip}
                    aliveOnly={step.key !== "resolution"}
                    disabled={busy}
                    actionLabel="Record their choice"
                    onSelect={selectTarget}
                  />
                )}

                {!step.requiresTarget && (
                  <p className="tc-action-card__instruction tc-muted text-sm">
                    No target — confirm when ready.
                  </p>
                )}

                {panel?.canConfirmNightStep && (
                  <button
                    type="button"
                    className="tc-btn-royal tc-btn-royal--wide tc-action-card__confirm"
                    disabled={busy}
                    onClick={() => onNarratorAction("confirm_night_step")}
                  >
                    ✓ Confirm step &amp; continue
                  </button>
                )}
              </div>
            )}

            {state.phase === "morning" && state.lastMorningSummary && (
              <div className="tc-action-card tc-action-card--compact">
                <h3 className="tc-action-card__step tc-font-display">
                  Announce the night
                </h3>
                {state.lastMorningSummary.deaths.length === 0 ? (
                  <p className="tc-action-card__lead">No deaths to announce.</p>
                ) : (
                  <ul className="tc-action-card__list">
                    {state.lastMorningSummary.deaths.map((d) => (
                      <li key={d.playerId}>
                        ⚰️ {playerName(d.playerId)}
                        {d.roleId ? ` · ${roleName(d.roleId)}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
                {state.lastMorningSummary.saved.length > 0 && (
                  <p className="tc-muted text-sm mt-1">
                    Saved:{" "}
                    {state.lastMorningSummary.saved
                      .map((s) => playerName(s.playerId))
                      .join(", ")}
                  </p>
                )}
                {panel?.canEndMorning && (
                  <button
                    type="button"
                    className="tc-btn-royal tc-btn-royal--wide mt-3"
                    disabled={busy}
                    onClick={() => onNarratorAction("end_morning")}
                  >
                    ☀️ Start day {state.dayNumber + 1}
                  </button>
                )}
              </div>
            )}

            {state.phase === "day" && panel?.canDayEliminate && (
              <div className="tc-action-card tc-action-card--compact">
                <h3 className="tc-action-card__step tc-font-display">
                  Day vote
                </h3>
                <p className="tc-action-card__lead">
                  After discussion and the physical vote, tap who was
                  eliminated.
                </p>
                <NarratorTargetPicker
                  players={panel.allPlayers}
                  playerIds={state.playerIds.filter(
                    (id) => panel.allPlayers.find((p) => p.id === id)?.alive,
                  )}
                  playerName={playerName}
                  selectedId={null}
                  disabled={busy}
                  actionLabel="Eliminate player"
                  onSelect={(id) => {
                    if (id) {
                      setPendingElimination({
                        id,
                        name: playerName(id),
                      });
                    }
                  }}
                />
                {panel.canBeginNight && (
                  <button
                    type="button"
                    className="tc-btn-royal tc-btn-royal--wide mt-3"
                    disabled={busy}
                    onClick={() => onNarratorAction("begin_night")}
                  >
                    🌙 Begin night {state.nightNumber + 1}
                  </button>
                )}
              </div>
            )}

            {state.phase === "match_over" && (
              <div className="tc-action-card tc-action-card--compact">
                <p className="tc-action-card__lead">
                  Match over — {state.winnerTeam === "good" ? "Good" : "Evil"}{" "}
                  wins.
                </p>
              </div>
            )}
          </section>
        </div>

        <aside className="tc-narrator-layout__sidebar">
          {panel && (
            <div
              className={clsx(
                !showPanel("roster") && "tc-narrator-layout__panel--hidden",
              )}
            >
              <NarratorTeamRoster
                players={panel.allPlayers}
                playerName={playerName}
              />
            </div>
          )}

          {panel?.chronicle && (
            <div
              className={clsx(
                !showPanel("log") && "tc-narrator-layout__panel--hidden",
              )}
            >
              <NarratorChronicle
                sections={panel.chronicle}
                playerName={playerName}
                roleName={roleName}
                currentPeriodKey={periodKey}
              />
            </div>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={pendingElimination !== null}
        title="Eliminate this player?"
        message={
          pendingElimination
            ? `${pendingElimination.name} will be removed from the day vote and marked dead. This cannot be undone.`
            : ""
        }
        confirmLabel="Eliminate"
        variant="danger"
        loading={busy}
        onConfirm={async () => {
          if (!pendingElimination) return;
          const ok = await onNarratorAction(
            "day_eliminate",
            pendingElimination.id,
          );
          if (ok) setPendingElimination(null);
        }}
        onCancel={() => setPendingElimination(null)}
      />
    </div>
  );
}
