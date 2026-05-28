"use client";

import { memo, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { MafiaNarratorGameState, MafiaNarratorAction } from "../types";
import type { LobbyState } from "@/lib/hub/types";
import NarratorTeamRoster from "./NarratorTeamRoster";
import NarratorChronicle from "./NarratorChronicle";
import NarratorDecreeDeck from "./NarratorDecreeDeck";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { MafiaButton } from "@/components/mafia/mafia-button";
import {
  MafiaCard,
  MafiaCardContent,
} from "@/components/mafia/mafia-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mafiaPhaseDisplayLabel } from "../lib/phaseDisplayLabel";
import PhaseCeremony from "@/components/mafia/PhaseCeremony";

interface NarratorDashboardProps {
  state: MafiaNarratorGameState;
  lobby: LobbyState;
  onNarratorAction: (
    action: MafiaNarratorAction,
    targetPlayerId?: string | null,
  ) => Promise<boolean>;
  busy?: boolean;
}

type MobileTab = "actions" | "roster" | "log";

const MOBILE_MQ = "(max-width: 959px)";

const narratorTabTriggerClass = clsx(
  "h-full w-full rounded-md px-2 py-2",
  "font-cinzel text-[0.68rem] font-semibold uppercase tracking-[0.14em]",
  "text-[color:var(--p1-ink-dim)]",
  "data-[state=active]:border data-[state=active]:border-amber-600/55",
  "data-[state=active]:bg-gradient-to-b data-[state=active]:from-amber-950/95 data-[state=active]:to-stone-900/90",
  "data-[state=active]:text-amber-100 data-[state=active]:shadow-[0_0_14px_rgba(251,191,36,0.22),inset_0_1px_0_rgba(251,191,36,0.12)]",
  "data-[state=inactive]:hover:text-[color:var(--p1-ink-soft)]",
);

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

function currentPeriodKey(state: MafiaNarratorGameState): string | undefined {
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

function panelVisibilityClass(visible: boolean) {
  return clsx(!visible && "max-[959px]:hidden");
}

function NarratorDashboard({
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
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const showPanel = (tab: MobileTab) => !isMobile || mobileTab === tab;

  const phaseLabel = useMemo(
    () =>
      mafiaPhaseDisplayLabel(
        state.phase,
        state.dayNumber,
        state.nightNumber,
      ),
    [state.phase, state.dayNumber, state.nightNumber],
  );

  const seerReveal = panel?.lastSeerReveal;
  const periodKey = currentPeriodKey(state);

  const selectTarget = async (targetId: string | null) => {
    if (!step?.requiresTarget) return;
    await onNarratorAction("set_night_target", targetId);
  };

  return (
    <div
      data-mafia-narrator
      className="px-4 pb-12 pt-4 md:px-6 md:pb-12 md:pt-8"
    >
      <MafiaCard variant="codex" className="relative mb-5">
        <MafiaCardContent className="flex flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <div>
            <h1 className="font-cinzel mb-1.5 bg-gradient-to-b from-amber-50 via-amber-300 to-amber-700 bg-clip-text text-[clamp(1.15rem,2.8vw,1.65rem)] font-bold uppercase tracking-[0.2em] text-transparent">
              Loremaster&apos;s Codex
            </h1>
            <PhaseCeremony label={phaseLabel} />
          </div>
          <MafiaButton
            variant="ghost"
            className="text-sm"
            disabled={busy}
            onClick={() => setRestartConfirmOpen(true)}
          >
            Restart Game
          </MafiaButton>
        </MafiaCardContent>
      </MafiaCard>

      {panel?.setupWarnings && panel.setupWarnings.length > 0 && (
        <Card className="relative mb-4 overflow-hidden rounded border-rose-900/50 bg-gradient-to-b from-rose-950/85 to-stone-950/90 pl-10 shadow-[inset_0_1px_0_rgba(200,120,120,0.15)]">
          <span
            className="font-cinzel absolute left-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 via-rose-800 to-rose-950 text-sm font-bold text-amber-50 shadow-[inset_0_1px_0_rgba(255,200,200,0.5),0_0_8px_rgba(180,40,40,0.5)]"
            aria-hidden
          >
            !
          </span>
          <CardContent className="space-y-1 p-3 text-sm text-rose-100/90">
            {panel.setupWarnings.map((w) => (
              <p key={w} className="m-0">
                {w}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs
        value={mobileTab}
        onValueChange={(v) => setMobileTab(v as MobileTab)}
        className="mb-4 min-[960px]:mb-0"
      >
        <TabsList
          className={clsx(
            "min-[960px]:hidden",
            "grid h-11 w-full grid-cols-3 gap-1 rounded-lg p-1",
            "border border-amber-900/45 bg-stone-950/92",
            "shadow-[var(--mf-shadow-panel)]",
          )}
          aria-label="Narrator panels"
        >
          <TabsTrigger value="actions" className={narratorTabTriggerClass}>
            Actions
          </TabsTrigger>
          <TabsTrigger value="roster" className={narratorTabTriggerClass}>
            Roster
          </TabsTrigger>
          <TabsTrigger value="log" className={narratorTabTriggerClass}>
            Log
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-5 min-[960px]:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div
          data-narrator-panel
          {...(showPanel("actions") ? { "data-visible": true } : {})}
          className={clsx(
            "max-[959px]:animate-slide-up",
            panelVisibilityClass(showPanel("actions")),
          )}
        >
          <NarratorDecreeDeck
            state={state}
            panel={panel}
            phaseLabel={phaseLabel}
            step={step}
            seerReveal={seerReveal}
            playerName={playerName}
            roleName={roleName}
            busy={busy}
            onNarratorAction={onNarratorAction}
            onSelectNightTarget={selectTarget}
            onRequestElimination={(id, display) =>
              setPendingElimination({ id, name: display })
            }
          />
        </div>

        <aside className="flex flex-col gap-4">
          {panel && (
            <div
              data-narrator-panel
              {...(showPanel("roster") ? { "data-visible": true } : {})}
              className={clsx(
                "max-[959px]:animate-slide-up",
                panelVisibilityClass(showPanel("roster")),
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
              data-narrator-panel
              {...(showPanel("log") ? { "data-visible": true } : {})}
              className={clsx(
                "max-[959px]:animate-slide-up",
                panelVisibilityClass(showPanel("log")),
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
        open={restartConfirmOpen}
        title="Restart game?"
        message="Roles are shuffled and dealt again. Everyone returns to role reveal — night and day progress resets."
        confirmLabel="Restart game"
        cancelLabel="Keep playing"
        variant="danger"
        loading={busy}
        overlayVariant="warm"
        onConfirm={async () => {
          const ok = await onNarratorAction("reset_match");
          if (ok) setRestartConfirmOpen(false);
        }}
        onCancel={() => !busy && setRestartConfirmOpen(false)}
      />

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
        overlayVariant="warm"
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

export default memo(NarratorDashboard);
