"use client";

import { memo, useMemo, useState } from "react";
import clsx from "clsx";
import { RotateCcw } from "lucide-react";
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
import { mfTitleGold } from "../lib/mafiaTypography";
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

function panelVisibilityClass(tab: MobileTab, activeTab: MobileTab) {
  return clsx(tab !== activeTab && "max-md:hidden");
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
  const [pendingElimination, setPendingElimination] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false);

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
  const actionsPending = Boolean(
    state.phase === "night" &&
      step?.requiresTarget &&
      !step.playAlongOnly &&
      !step.choiceRecorded,
  );

  const selectTarget = async (targetId: string | null) => {
    if (!step?.requiresTarget) return;
    await onNarratorAction("set_night_target", targetId);
  };

  return (
    <div
      data-mafia-narrator
      className="px-4 pb-12 pt-4 md:px-6 md:pb-12 md:pt-8"
    >
      <MafiaCard
        variant="codex"
        className={clsx(
          'mf-codex-header relative mb-5',
          'max-md:shadow-[inset_0_1px_0_rgba(212,166,74,0.12),inset_0_-2px_0_rgba(0,0,0,0.55)]',
          'max-md:before:shadow-none',
        )}
      >
        <MafiaCardContent className="flex flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <div>
            <h1
              className={clsx(
                mfTitleGold,
                'mb-1.5 text-xl tracking-[0.2em] max-md:text-lg max-md:tracking-[0.16em]',
              )}
            >
              Loremaster&apos;s Codex
            </h1>
            <PhaseCeremony label={phaseLabel} />
          </div>
          <MafiaButton
            variant="ritual"
            className="min-h-11 shrink-0 gap-1.5 px-3.5"
            disabled={busy}
            onClick={() => setRestartConfirmOpen(true)}
          >
            <RotateCcw className="h-3.5 w-3.5 opacity-85" aria-hidden />
            Restart game
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
            <span className="relative inline-flex items-center">
              Actions
              {actionsPending && (
                <span
                  className="absolute -right-2.5 top-0 h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.75)]"
                  aria-hidden
                />
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger value="roster" className={narratorTabTriggerClass}>
            Roster
          </TabsTrigger>
          <TabsTrigger value="log" className={narratorTabTriggerClass}>
            Log
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid min-w-0 gap-5 min-[960px]:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div
          data-narrator-panel
          {...(mobileTab === "actions" ? { "data-visible": true } : {})}
          className={clsx(panelVisibilityClass("actions", mobileTab), "min-w-0 max-w-full")}
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

        <aside className="flex min-w-0 max-w-full flex-col gap-4">
          {panel && (
            <div
              data-narrator-panel
              {...(mobileTab === "roster" ? { "data-visible": true } : {})}
              className={clsx(panelVisibilityClass("roster", mobileTab), "min-w-0 max-w-full")}
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
              {...(mobileTab === "log" ? { "data-visible": true } : {})}
              className={clsx(panelVisibilityClass("log", mobileTab), "min-w-0 max-w-full")}
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
