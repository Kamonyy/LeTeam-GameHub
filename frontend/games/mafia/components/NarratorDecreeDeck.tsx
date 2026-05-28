"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { Badge } from "@/components/ui/badge";
import {
  MafiaCard,
  MafiaCardFooter,
} from "@/components/mafia/mafia-panel";
import { getRoleAccent } from "@shared/games/mafia/roles.js";
import type {
  MafiaNarratorGameState,
  MafiaNarratorPanel,
  MafiaNarratorAction,
  MafiaNightStepView,
} from "../types";
import {
  seerAlignmentPanelClass,
  seerAlignmentTextClass,
  seerAlignmentInlineClass,
} from "../lib/alignmentDisplay";
import NarratorTargetPicker from "./NarratorTargetPicker";
import NarratorAskPrompt from "./NarratorAskPrompt";
import { MafiaButton } from "@/components/mafia/mafia-button";
import { formatMorningNightRecapDetail } from "../lib/formatMorningNightRecap";

const scriptClass =
  "font-[family-name:var(--p1-font-script)] text-[color:var(--p1-ink)]";

const instructionClass = clsx(
  scriptClass,
  "text-lg leading-relaxed [&_p]:my-1.5",
);

const decreeZoneShellClass = {
  default: "rounded-md border border-amber-900/40 bg-stone-950/30 mb-3 last:mb-0",
  night: "rounded-md border border-violet-900/40 bg-violet-950/20 mb-3 last:mb-0",
  danger: "rounded-md border border-red-900/40 bg-red-950/25 mb-3 last:mb-0",
  result: "rounded-md border border-sky-900/40 bg-sky-950/30 mb-3 last:mb-0",
} as const;

const decreeZoneKickerPillClass = {
  default:
    "border-amber-700/50 bg-amber-950/80 text-amber-200",
  night:
    "border-violet-700/50 bg-violet-950/80 text-violet-100",
  danger:
    "border-red-700/50 bg-red-950/80 text-red-100",
  result:
    "border-sky-700/50 bg-sky-950/80 text-sky-100",
} as const;

function DecreeZoneKicker({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: keyof typeof decreeZoneKickerPillClass;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-cinzel text-[0.62rem] font-semibold uppercase tracking-[0.18em]",
        decreeZoneKickerPillClass[tone],
      )}
    >
      {children}
    </span>
  );
}

function DecreeZone({
  kicker,
  children,
  tone = "default",
}: {
  kicker: string;
  children: ReactNode;
  tone?: keyof typeof decreeZoneShellClass;
}) {
  return (
    <section className={decreeZoneShellClass[tone]}>
      <div className="p-3.5 sm:p-4">
        <div className="mb-2.5">
          <DecreeZoneKicker tone={tone}>{kicker}</DecreeZoneKicker>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

function NightStepTrack({
  currentIndex,
  total,
  titleEn,
}: {
  currentIndex: number;
  total: number;
  titleEn: string;
}) {
  const progressPct =
    total <= 1 ? 100 : (currentIndex / (total - 1)) * 100;

  const trackTop = "top-[0.65rem]";

  return (
    <nav
      className="border-b border-violet-700/45 bg-gradient-to-b from-violet-950/50 via-violet-950/30 to-stone-950/30 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(167,139,250,0.08),inset_0_-12px_24px_-12px_rgba(109,40,217,0.15)]"
      aria-label={`Night step ${currentIndex + 1} of ${total}: ${titleEn}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-cinzel text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-violet-100 drop-shadow-[0_0_8px_rgba(167,139,250,0.45)]">
          Night path
        </span>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-500/45 bg-violet-900/50 px-2 py-0.5 font-cinzel text-[0.58rem] tabular-nums leading-none shadow-[0_0_12px_rgba(139,92,246,0.35),inset_0_1px_0_rgba(196,181,253,0.12)]"
          role="status"
        >
          <span className="font-bold text-amber-200 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]">
            {currentIndex + 1}
          </span>
          <span className="text-violet-300/80">/</span>
          <span className="text-violet-100/90">{total}</span>
        </span>
      </div>

      <div
        className="relative px-1"
        role="progressbar"
        aria-valuenow={currentIndex + 1}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        {total > 1 && (
          <>
            <span
              className={clsx(
                "pointer-events-none absolute left-2.5 right-2.5 h-[3px] rounded-full bg-violet-800/70",
                trackTop,
                "shadow-[0_0_8px_rgba(109,40,217,0.45)]",
              )}
              aria-hidden
            />
            <span
              className={clsx(
                "pointer-events-none absolute left-2.5 h-[3px] rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-200 transition-[width] duration-300 motion-reduce:transition-none",
                trackTop,
                "shadow-[0_0_14px_rgba(251,191,36,0.75),0_0_4px_rgba(255,237,160,0.5)]",
              )}
              style={{ width: `calc((100% - 1.25rem) * ${progressPct / 100})` }}
              aria-hidden
            />
          </>
        )}

        <ol className="relative m-0 flex list-none justify-between p-0">
          {Array.from({ length: total }, (_, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            const upcoming = !done && !active;
            return (
              <li key={i} className="flex shrink-0 flex-col items-center">
                <span
                  className={clsx(
                    "relative flex h-5 w-5 items-center justify-center rounded-full border font-cinzel text-[0.52rem] font-bold leading-none transition-all duration-200 motion-reduce:transition-none",
                    done &&
                      "border-amber-400/75 bg-gradient-to-b from-amber-500/95 to-amber-800 text-amber-50 shadow-[0_0_12px_rgba(251,191,36,0.55),inset_0_1px_0_rgba(255,235,180,0.35)]",
                    active &&
                      "mf-night-step-active z-[1] scale-[1.12] border-amber-50 bg-gradient-to-b from-amber-100 to-amber-300 text-stone-950 ring-2 ring-amber-200/55",
                    upcoming &&
                      "border-violet-500/55 bg-gradient-to-b from-violet-900/90 to-violet-950 text-violet-200 shadow-[0_0_10px_rgba(139,92,246,0.4),inset_0_0_8px_rgba(167,139,250,0.12)]",
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? (
                    <span className="text-[0.48rem] leading-none" aria-hidden>
                      ✓
                    </span>
                  ) : (
                    i + 1
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <p
        className="m-0 mt-2 line-clamp-2 font-cinzel text-[0.7rem] font-semibold leading-snug tracking-wide text-amber-50 drop-shadow-[0_0_10px_rgba(251,191,36,0.25)]"
        title={titleEn}
      >
        {titleEn}
      </p>
    </nav>
  );
}

function nightConfirmLabel(step: MafiaNightStepView): string {
  if (step.playAlongOnly) return "Continue";
  switch (step.key) {
    case "mafia":
      return "Lock kill target";
    case "healer":
      return "Confirm protection";
    case "seer":
      return "Confirm inspection";
    case "sniper":
      return "Confirm silence";
    case "sheriff":
      return "Confirm judgment";
    default:
      return "Confirm & continue";
  }
}

function DecreeCardShell({
  children,
  footer,
  night = false,
  cardKey,
}: {
  children: ReactNode;
  footer?: ReactNode;
  night?: boolean;
  cardKey: string;
}) {
  return (
    <MafiaCard
      key={cardKey}
      variant="decree"
      interactive={false}
      data-decree-night={night ? "" : undefined}
      className="overflow-hidden p-0 animate-mf-fade-rise motion-reduce:animate-none"
    >
      {children}
      {footer}
    </MafiaCard>
  );
}

function DecreeFooter({
  night = false,
  className,
  children,
}: {
  night?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <MafiaCardFooter
      data-decree-night={night ? "" : undefined}
      className={clsx(
        "sticky bottom-0 z-[2] rounded-b-md border-t border-amber-900/45 bg-gradient-to-t from-stone-950 via-stone-950/98 to-stone-950/90 p-3 pb-3.5 shadow-[inset_0_1px_0_rgba(212,166,74,0.1)] backdrop-blur-sm max-md:pb-[max(0.85rem,env(safe-area-inset-bottom,0px))]",
        night && "border-violet-900/40 shadow-[inset_0_1px_0_rgba(167,139,250,0.12)]",
        className,
      )}
    >
      {children}
    </MafiaCardFooter>
  );
}

function DecreeHeaderStrip({
  decreeContext,
  nightStep,
}: {
  decreeContext: string;
  nightStep?: MafiaNightStepView | null;
}) {
  const showNightProgress = Boolean(nightStep);
  const progressPct = nightStep
    ? Math.round(((nightStep.index + 1) / nightStep.total) * 100)
    : 0;

  return (
    <header className="sticky top-0 z-[3] rounded-lg border border-amber-900/45 bg-gradient-to-b from-stone-950/98 via-stone-950/95 to-stone-900/90 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(212,166,74,0.14),0_4px_16px_-8px_rgba(0,0,0,0.55)] backdrop-blur-sm">
      <h2
        id="mf-decree-title"
        className="m-0 font-cinzel bg-gradient-to-b from-amber-50 via-amber-200 to-amber-700 bg-clip-text text-[clamp(1.15rem,2.8vw,1.55rem)] font-bold uppercase tracking-[0.16em] text-transparent"
      >
        Decree of the Hour
      </h2>
      <Badge
        variant="phase"
        className="mt-2.5 w-fit rounded-md font-[family-name:var(--p1-font-script)] text-[0.95rem] font-normal italic tracking-normal normal-case"
      >
        {decreeContext}
      </Badge>
      {showNightProgress && nightStep && (
        <div className="mt-2.5 space-y-1">
          <div
            className="h-1 overflow-hidden rounded-full bg-stone-800/90"
            role="progressbar"
            aria-valuenow={nightStep.index + 1}
            aria-valuemin={1}
            aria-valuemax={nightStep.total}
            aria-label={`Night step ${nightStep.index + 1} of ${nightStep.total}`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600/90 via-violet-400/80 to-amber-400/90 transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="m-0 font-cinzel text-[0.62rem] uppercase tracking-widest text-violet-300/90">
            Night step {nightStep.index + 1} of {nightStep.total}
          </p>
        </div>
      )}
    </header>
  );
}

export interface NarratorDecreeDeckProps {
  state: MafiaNarratorGameState;
  panel: MafiaNarratorPanel | undefined;
  phaseLabel: string;
  step: MafiaNightStepView | null | undefined;
  seerReveal: { playerId: string; alignment: string } | null | undefined;
  playerName: (id: string) => string;
  roleName: (roleId: string) => string;
  busy: boolean;
  onNarratorAction: (
    action: MafiaNarratorAction,
    targetPlayerId?: string | null,
  ) => Promise<boolean>;
  onSelectNightTarget: (targetId: string | null) => Promise<void>;
  onRequestElimination: (id: string, name: string) => void;
}

export default function NarratorDecreeDeck({
  state,
  panel,
  phaseLabel,
  step,
  seerReveal,
  playerName,
  roleName,
  busy,
  onNarratorAction,
  onSelectNightTarget,
  onRequestElimination,
}: NarratorDecreeDeckProps) {
  const decreeContext =
    state.phase === "night" && step ? `Night · ${step.titleEn}` : phaseLabel;

  const awaitingNightChoice = Boolean(
    step?.requiresTarget && !step.playAlongOnly && !step.choiceRecorded,
  );
  const nightConfirmEnabled =
    Boolean(panel?.canConfirmNightStep && step && !awaitingNightChoice);

  const hasBody =
    (state.phase === "role_reveal" && panel?.canBeginNight) ||
    (state.phase === "night" && step) ||
    (state.phase === "morning" && state.lastMorningSummary) ||
    (state.phase === "day" && panel?.canDayEliminate) ||
    state.phase === "match_over";

  return (
    <MafiaCard
      variant="elevated"
      interactive={false}
      className="relative flex flex-col gap-4 rounded-md p-4 sm:p-5 before:pointer-events-none before:absolute before:inset-1 before:rounded before:border before:border-white/[0.06]"
      aria-labelledby="mf-decree-title"
    >
      <DecreeHeaderStrip
        decreeContext={decreeContext}
        nightStep={state.phase === "night" ? step : null}
      />

      {!hasBody && (
        <p
          className={clsx(
            scriptClass,
            "m-0 py-2 text-center text-lg italic text-[color:var(--p1-ink-soft)]",
          )}
        >
          Waiting for the next narrator action…
        </p>
      )}

      {state.phase === "role_reveal" && panel?.canBeginNight && (
        <DecreeCardShell cardKey="role-reveal">
          <DecreeZone kicker="Before night falls">
            <p className={clsx(instructionClass, "m-0 italic")}>
              Wait until every player has opened their role on their phone, then
              start the first night.
            </p>
          </DecreeZone>
          <DecreeFooter>
            <MafiaButton
              variant="primary"
              className="w-full min-h-[2.75rem]"
              disabled={busy}
              onClick={() => onNarratorAction("begin_night")}
            >
              Begin night 1
            </MafiaButton>
          </DecreeFooter>
        </DecreeCardShell>
      )}

      {state.phase === "night" && step && (
        <DecreeCardShell
          cardKey={`night-${step.index}-${step.key}`}
          night
          footer={
            panel?.canConfirmNightStep && step ?
              <DecreeFooter night>
                <MafiaButton
                  variant="primary"
                  className="w-full min-h-[2.85rem] text-[0.8rem] disabled:opacity-50"
                  disabled={busy || !nightConfirmEnabled}
                  title={
                    awaitingNightChoice
                      ? "Choose a player or tap Skip first"
                      : undefined
                  }
                  onClick={() => onNarratorAction("confirm_night_step")}
                >
                  {nightConfirmLabel(step)}
                </MafiaButton>
              </DecreeFooter>
            : undefined
          }
        >
          <div className="flex min-w-0 flex-col">
            <NightStepTrack
              currentIndex={step.index}
              total={step.total}
              titleEn={step.titleEn}
            />

            <div className="flex min-w-0 flex-col p-3 sm:p-4">
              <DecreeZone kicker="1 · Read aloud" tone="night">
                <p className="mb-1 font-cinzel text-lg font-bold uppercase tracking-widest text-amber-200">
                  {step.titleEn}
                </p>
                {step.titleAr && (
                  <p
                    className={clsx(scriptClass, "mb-2.5 text-base")}
                    dir="rtl"
                  >
                    {step.titleAr}
                  </p>
                )}
                <div className={instructionClass}>
                  {step.playAlongOnly ? (
                    <p>
                      Run the {step.roleNameEn ?? "role"} ritual for theater only
                      — the holder is dead.
                    </p>
                  ) : (
                    <>
                      <p>{step.instructionEn}</p>
                      {step.instructionAr && (
                        <p dir="rtl" lang="ar">
                          {step.instructionAr}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </DecreeZone>

              {step.playAlongOnly ? (
                <DecreeZone kicker="2 · Play along" tone="night">
                  <p
                    className={clsx(
                      instructionClass,
                      "m-0 rounded-md border border-violet-800/45 bg-violet-950/35 px-3.5 py-3.5 text-base leading-relaxed",
                    )}
                  >
                    {step.playAlongMessageEn}
                  </p>
                  {step.playAlongMessageAr && (
                    <p
                      className={clsx(
                        scriptClass,
                        "m-0 mt-3 rounded-md border border-violet-900/35 bg-stone-950/50 px-3 py-2.5 text-base leading-relaxed text-[color:var(--p1-ink-soft)]",
                      )}
                      dir="rtl"
                      lang="ar"
                    >
                      {step.playAlongMessageAr}
                    </p>
                  )}
                </DecreeZone>
              ) : (
                step.roleId && (
                  <DecreeZone kicker="2 · Wake player" tone="night">
                    <NarratorAskPrompt
                      step={step}
                      holders={step.roleHolders}
                      playerName={playerName}
                    />
                  </DecreeZone>
                )
              )}

              {seerReveal && !step.playAlongOnly && (
                <DecreeZone kicker="Oracle speaks" tone="result">
                  <div
                    className={clsx(
                      "animate-mf-scale-in motion-reduce:animate-none rounded-md border px-4 py-4 text-center",
                      seerAlignmentPanelClass(seerReveal.alignment),
                    )}
                    role="status"
                  >
                    <p className="m-0 font-cinzel text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-stone-300/90">
                      Inspected
                    </p>
                    <p className="m-0 mt-1 font-cinzel text-lg font-bold tracking-wide text-amber-50">
                      {playerName(seerReveal.playerId)}
                    </p>
                    <p
                      className={clsx(
                        "m-0 mt-2 font-cinzel text-2xl font-bold uppercase tracking-[0.2em]",
                        seerAlignmentTextClass(seerReveal.alignment),
                      )}
                    >
                      {seerReveal.alignment}
                    </p>
                  </div>
                </DecreeZone>
              )}

              {step.playAlongOnly ? (
                <DecreeZone kicker="3 · Continue" tone="night">
                  <p className={clsx(instructionClass, "m-0 text-base italic")}>
                    No target is recorded — the night action has no effect.
                  </p>
                </DecreeZone>
              ) : step.requiresTarget && panel ? (
                <DecreeZone kicker="3 · Record choice" tone="night">
                  <NarratorTargetPicker
                    players={panel.allPlayers}
                    playerIds={state.playerIds}
                    playerName={playerName}
                    selectedId={step.selectedTargetId}
                    skipSelected={step.skipped}
                    blockedIds={step.blockedTargetIds}
                    allowSkip={step.allowSkip}
                    aliveOnly
                    disabled={busy}
                    actionLabel="Tap a player to record"
                    onSelect={onSelectNightTarget}
                  />
                </DecreeZone>
              ) : (
                !step.requiresTarget && (
                  <DecreeZone kicker="3 · Continue" tone="night">
                    <p className={clsx(instructionClass, "m-0 text-base")}>
                      No target for this step — confirm when ready.
                    </p>
                  </DecreeZone>
                )
              )}
            </div>
          </div>
        </DecreeCardShell>
      )}

      {state.phase === "morning" && state.lastMorningSummary && (
        <DecreeCardShell
          cardKey={`morning-${state.nightNumber}`}
          footer={
            panel?.canEndMorning ?
              <DecreeFooter>
                <MafiaButton
                  variant="primary"
                  className="w-full min-h-[2.75rem]"
                  disabled={busy}
                  onClick={() => onNarratorAction("end_morning")}
                >
                  Start day {state.dayNumber + 1}
                </MafiaButton>
              </DecreeFooter>
            : undefined
          }
        >
          {state.lastMorningSummary.nightRecap?.length > 0 && (
            <DecreeZone kicker="What happened tonight" tone="result">
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {state.lastMorningSummary.nightRecap.map((beat, i) => (
                  <li
                    key={`${beat.roleId}-${beat.targetPlayerId ?? "skip"}-${i}`}
                    className="flex items-start gap-2.5 rounded border bg-stone-950/35 px-2.5 py-2"
                    style={{
                      borderColor: `color-mix(in srgb, ${getRoleAccent(beat.roleId)} 42%, transparent)`,
                      boxShadow: `inset 3px 0 0 color-mix(in srgb, ${getRoleAccent(beat.roleId)} 75%, transparent)`,
                    }}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-700/50 bg-stone-900/80 text-[1.05rem] leading-none"
                      style={{
                        boxShadow: `0 0 10px color-mix(in srgb, ${getRoleAccent(beat.roleId)} 40%, transparent)`,
                      }}
                      aria-hidden
                    >
                      {beat.icon}
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span
                        className="font-cinzel text-[0.72rem] font-bold uppercase tracking-widest"
                        style={{ color: getRoleAccent(beat.roleId) }}
                      >
                        {beat.titleEn}
                      </span>
                      <span className={clsx(scriptClass, "text-base leading-snug")}>
                        {beat.outcome === "inspected" && beat.alignment ? (
                          <>
                            Inspected{" "}
                            {beat.targetPlayerId
                              ? playerName(beat.targetPlayerId)
                              : "target"}{" "}
                            —{" "}
                            <span className={seerAlignmentInlineClass(beat.alignment)}>
                              {beat.alignment}
                            </span>
                            .
                          </>
                        ) : (
                          formatMorningNightRecapDetail(beat, playerName)
                        )}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </DecreeZone>
          )}
          <DecreeZone kicker="Announce to the table">
            <p className={clsx(instructionClass, "m-0 italic")}>
              Tell the table who died (reveal roles only if your house rules
              allow it).
            </p>
            {state.lastMorningSummary.deaths.length === 0 ? (
              <p className={clsx(instructionClass, "m-0 mt-2 italic")}>
                No deaths to announce.
              </p>
            ) : (
              <ul className="m-0 mt-2 list-none p-0">
                {state.lastMorningSummary.deaths.map((d) => (
                  <li
                    key={d.playerId}
                    className={clsx(
                      scriptClass,
                      "border-b border-amber-900/25 py-1.5 text-lg last:border-b-0 before:content-['⚰_']",
                    )}
                  >
                    {playerName(d.playerId)}
                    {d.roleId ? ` · ${roleName(d.roleId)}` : ""}
                  </li>
                ))}
              </ul>
            )}
            {state.lastMorningSummary.silenced.length > 0 && (
              <p className={clsx(scriptClass, "m-0 mt-2 text-base")}>
                Silenced today:{" "}
                {state.lastMorningSummary.silenced
                  .map((id) => playerName(id))
                  .join(", ")}
              </p>
            )}
          </DecreeZone>
        </DecreeCardShell>
      )}

      {state.phase === "day" && panel?.canDayEliminate && (
        <DecreeCardShell
          cardKey={`day-${state.dayNumber}`}
          footer={
            panel.canBeginNight ?
              <DecreeFooter>
                <MafiaButton
                  variant="primary"
                  className="w-full min-h-[3.1rem]"
                  disabled={busy}
                  onClick={() => onNarratorAction("begin_night")}
                >
                  Begin night {state.nightNumber + 1}
                </MafiaButton>
              </DecreeFooter>
            : undefined
          }
        >
          <DecreeZone kicker="After the village vote">
            <p className={clsx(instructionClass, "m-0 italic")}>
              After discussion and the physical vote, tap who was eliminated.
            </p>
          </DecreeZone>
          <DecreeZone kicker="Record elimination" tone="danger">
            <NarratorTargetPicker
              players={panel.allPlayers}
              playerIds={state.playerIds.filter(
                (id) => panel.allPlayers.find((p) => p.id === id)?.alive,
              )}
              playerName={playerName}
              selectedId={null}
              allowSkip={false}
              disabled={busy}
              actionLabel="Tap the eliminated player"
              onSelect={(id) => {
                if (id) onRequestElimination(id, playerName(id));
              }}
            />
          </DecreeZone>
        </DecreeCardShell>
      )}

    </MafiaCard>
  );
}
