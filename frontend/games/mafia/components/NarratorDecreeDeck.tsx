"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { Badge } from "@/components/ui/badge";
import {
  MafiaCard,
  MafiaCardFooter,
} from "@/components/mafia/mafia-panel";
import { NIGHT_SEQUENCE } from "@shared/games/mafia/nightSequence.js";
import { getRoleAccent } from "@shared/games/mafia/roles.js";
import {
  nightStepDotStyle,
  nightStepLabelStyle,
  nightStepProgressBarStyle,
  nightStepShortTitle,
} from "../lib/nightStepTrackTheme";
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
import { mfTitleGold } from "../lib/mafiaTypography";

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
  compact = false,
}: {
  kicker: string;
  children: ReactNode;
  tone?: keyof typeof decreeZoneShellClass;
  compact?: boolean;
}) {
  return (
    <section className={decreeZoneShellClass[tone]}>
      <div className={compact ? "p-2.5 sm:p-3" : "p-3.5 sm:p-4"}>
        <div className={compact ? "mb-2" : "mb-2.5"}>
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
  activeRoleId,
}: {
  currentIndex: number;
  total: number;
  titleEn: string;
  activeRoleId: string | null;
}) {
  const steps = NIGHT_SEQUENCE.slice(0, total);
  const progressPct =
    total <= 1 ? 100 : (currentIndex / (total - 1)) * 100;

  const trackTop = "top-[0.65rem]";
  /** Center of first/last dot in equal grid columns */
  const trackInset =
    total > 1 ? `calc(100% / ${total} / 2)` : "0";
  const trackSpan =
    total > 1 ? `calc(100% - 100% / ${total})` : "100%";

  return (
    <nav
      className="border-b border-amber-800/45 bg-gradient-to-b from-[#1c1810] via-[#14110c] to-[#0e0c08] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(251,191,36,0.12),0_2px_10px_rgba(0,0,0,0.4)]"
      aria-label={`Night step ${currentIndex + 1} of ${total}: ${titleEn}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-cinzel text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
          Night path
        </span>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-600/45 bg-[#2a2214] px-2 py-0.5 font-cinzel text-[0.58rem] tabular-nums leading-none shadow-[0_0_10px_rgba(180,120,40,0.35),inset_0_1px_0_rgba(253,230,138,0.12)]"
          role="status"
        >
          <span className="font-bold text-amber-200 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]">
            {currentIndex + 1}
          </span>
          <span className="text-amber-200/80">/</span>
          <span className="text-amber-50">{total}</span>
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
                "pointer-events-none absolute h-[3px] rounded-full bg-violet-400/85",
                trackTop,
                "shadow-[0_0_14px_rgba(167,139,250,0.75),inset_0_1px_0_rgba(255,255,255,0.2)]",
              )}
              style={{ left: trackInset, right: trackInset }}
              aria-hidden
            />
            <span
              className={clsx(
                "pointer-events-none absolute h-[3px] rounded-full transition-[width] duration-300 motion-reduce:transition-none",
                trackTop,
              )}
              style={{
                left: trackInset,
                width: `calc(${trackSpan} * ${progressPct / 100})`,
                ...nightStepProgressBarStyle(activeRoleId),
              }}
              aria-hidden
            />
          </>
        )}

        <ol
          className="relative m-0 grid list-none p-0"
          style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
        >
          {steps.map((stepDef, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            const state = done ? "done" : active ? "active" : "upcoming";
            return (
              <li
                key={stepDef.key}
                className="flex min-w-0 flex-col items-center gap-1.5 justify-self-center"
              >
                <span
                  className={clsx(
                    "relative flex h-[1.35rem] w-[1.35rem] items-center justify-center rounded-full border font-cinzel text-[0.55rem] font-bold leading-none transition-all duration-200 motion-reduce:transition-none",
                    active && "mf-night-step-active z-[1] scale-[1.14] ring-2 ring-white/35",
                  )}
                  style={nightStepDotStyle(stepDef.roleId, state)}
                  aria-current={active ? "step" : undefined}
                  title={stepDef.titleEn}
                >
                  {done ? (
                    <span className="text-[0.48rem] leading-none" aria-hidden>
                      ✓
                    </span>
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={clsx(
                    "max-w-full truncate text-center font-cinzel text-[0.58rem] font-semibold uppercase leading-tight tracking-[0.1em] sm:text-[0.62rem]",
                    active && "font-bold",
                  )}
                  style={nightStepLabelStyle(stepDef.roleId, state)}
                  aria-current={active ? "step" : undefined}
                >
                  {nightStepShortTitle(stepDef.titleEn)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
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
      className="overflow-visible p-0 animate-mf-fade-rise motion-reduce:animate-none"
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
      data-decree-footer=""
      data-decree-night={night ? "" : undefined}
      className={clsx(
        "z-[2] rounded-b-md border-t border-amber-900/45 bg-gradient-to-t from-stone-950 via-stone-950/98 to-stone-950/90 p-3 pb-3.5 shadow-[inset_0_1px_0_rgba(212,166,74,0.1)] max-md:pb-[max(0.85rem,env(safe-area-inset-bottom,0px))]",
        "max-md:sticky max-md:bottom-0 max-md:glass-blur-sm min-[960px]:sticky min-[960px]:bottom-0 min-[960px]:glass-blur-sm",
        night && "border-violet-900/40 shadow-[inset_0_1px_0_rgba(167,139,250,0.12)]",
        className,
      )}
    >
      {children}
    </MafiaCardFooter>
  );
}

function DecreeTitleBlock({
  decreeContext,
  nightStep,
  className,
}: {
  decreeContext: string;
  nightStep?: MafiaNightStepView | null;
  className?: string;
}) {
  const showNightProgress = Boolean(nightStep);
  const progressPct = nightStep
    ? Math.round(((nightStep.index + 1) / nightStep.total) * 100)
    : 0;

  return (
    <div className={className}>
      <h2
        id="mf-decree-title"
        className={clsx(
          mfTitleGold,
          'm-0 text-[clamp(1.2rem,2.8vw,1.6rem)] tracking-[0.16em]',
        )}
      >
        Decree of the Hour
      </h2>
      <Badge
        variant="phase"
        className="mt-2.5 block max-w-full truncate rounded-md font-[family-name:var(--p1-font-script)] text-[0.95rem] font-normal italic tracking-normal normal-case"
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
    </div>
  );
}

/** Desktop / tablet wide — sticky above decree body cards */
function DecreeHeaderStrip({
  decreeContext,
  nightStep,
}: {
  decreeContext: string;
  nightStep?: MafiaNightStepView | null;
}) {
  return (
    <header
      data-decree-header=""
      className="hidden shrink-0 rounded-lg border border-amber-900/45 bg-gradient-to-b from-stone-950/98 via-stone-950/95 to-stone-900/90 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(212,166,74,0.14),0_4px_16px_-8px_rgba(0,0,0,0.55)] backdrop-blur-sm min-[960px]:sticky min-[960px]:top-0 min-[960px]:z-[3] min-[960px]:block"
    >
      <DecreeTitleBlock decreeContext={decreeContext} nightStep={nightStep} />
    </header>
  );
}

function MobileNightDecreeHeader({ decreeContext }: { decreeContext: string }) {
  return (
    <div
      data-decree-header=""
      className="shrink-0 border-b border-amber-900/40 bg-gradient-to-b from-stone-950/98 to-stone-900/92 px-3 py-2.5 min-[960px]:hidden"
    >
      <DecreeTitleBlock decreeContext={decreeContext} nightStep={null} />
    </div>
  );
}

/** Non-night phases on phone — static title (no sticky overlap) */
function MobileDecreeHeader({ decreeContext }: { decreeContext: string }) {
  return (
    <div
      data-decree-header=""
      className="shrink-0 rounded-lg border border-amber-900/45 bg-gradient-to-b from-stone-950/98 via-stone-950/95 to-stone-900/90 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(212,166,74,0.14)] min-[960px]:hidden"
    >
      <DecreeTitleBlock decreeContext={decreeContext} nightStep={null} />
    </div>
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

  const isNight = state.phase === "night" && !!step;

  return (
    <MafiaCard
      variant="elevated"
      interactive={false}
      className={clsx(
        "relative flex flex-col gap-4 rounded-md p-4 sm:p-5 before:pointer-events-none before:absolute before:inset-1 before:rounded before:border before:border-white/[0.06]",
        isNight && "max-[959px]:gap-0 max-[959px]:p-3",
      )}
      aria-labelledby="mf-decree-title"
    >
      <DecreeHeaderStrip
        decreeContext={decreeContext}
        nightStep={isNight ? step : null}
      />
      {!isNight && <MobileDecreeHeader decreeContext={decreeContext} />}

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
          <MobileNightDecreeHeader decreeContext={decreeContext} />
          <div className="flex min-w-0 flex-col max-[959px]:overflow-visible min-[960px]:min-h-0">
            <NightStepTrack
              currentIndex={step.index}
              total={step.total}
              titleEn={step.titleEn}
              activeRoleId={step.roleId}
            />

            <div className="flex min-w-0 flex-col p-3 sm:p-4">
              {step.playAlongOnly ? (
                <>
                  <DecreeZone kicker="1 · Read aloud" tone="night" compact>
                    <p className="mb-0.5 font-cinzel text-base font-bold uppercase tracking-widest text-amber-200">
                      {step.titleEn}
                    </p>
                    {step.titleAr && (
                      <p
                        className={clsx(scriptClass, "mb-2 text-sm")}
                        dir="rtl"
                      >
                        {step.titleAr}
                      </p>
                    )}
                    <p className={clsx(instructionClass, "m-0 text-sm [&_p]:my-1")}>
                      Run the {step.roleNameEn ?? "role"} ritual for theater only
                      — the holder is dead.
                    </p>
                  </DecreeZone>
                  <DecreeZone kicker="2 · Play along" tone="night" compact>
                    <p
                      className={clsx(
                        instructionClass,
                        "m-0 text-sm leading-relaxed [&_p]:my-1",
                      )}
                    >
                      {step.playAlongMessageEn}
                    </p>
                    {step.playAlongMessageAr && (
                      <p
                        className={clsx(
                          scriptClass,
                          "m-0 mt-2 text-sm leading-relaxed text-[color:var(--p1-ink-soft)]",
                        )}
                        dir="rtl"
                        lang="ar"
                      >
                        {step.playAlongMessageAr}
                      </p>
                    )}
                  </DecreeZone>
                </>
              ) : step.roleId ? (
                <DecreeZone kicker="1 · Wake & ask" tone="night" compact>
                  <div className="space-y-2.5">
                    <div className="min-w-0 rounded-md border border-violet-800/30 bg-violet-950/20 px-3 py-2.5">
                      <p className="m-0 font-cinzel text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-amber-200/85">
                        Read aloud
                      </p>
                      <div
                        className={clsx(
                          instructionClass,
                          "mt-1.5 text-sm leading-snug [&_p]:my-0.5",
                        )}
                      >
                        <p>{step.instructionEn}</p>
                        {step.instructionAr && (
                          <p dir="rtl" lang="ar">
                            {step.instructionAr}
                          </p>
                        )}
                      </div>
                    </div>
                    <NarratorAskPrompt
                      embedded
                      step={step}
                      holders={step.roleHolders}
                      playerName={playerName}
                    />
                  </div>
                </DecreeZone>
              ) : (
                <DecreeZone kicker="1 · Read aloud" tone="night" compact>
                  <p className="mb-0.5 font-cinzel text-base font-bold uppercase tracking-widest text-amber-200">
                    {step.titleEn}
                  </p>
                  {step.titleAr && (
                    <p
                      className={clsx(scriptClass, "mb-2 text-sm")}
                      dir="rtl"
                    >
                      {step.titleAr}
                    </p>
                  )}
                  <div className={clsx(instructionClass, "text-sm [&_p]:my-1")}>
                    <p>{step.instructionEn}</p>
                    {step.instructionAr && (
                      <p dir="rtl" lang="ar">
                        {step.instructionAr}
                      </p>
                    )}
                  </div>
                </DecreeZone>
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
                <DecreeZone kicker="3 · Continue" tone="night" compact>
                  <p className={clsx(instructionClass, "m-0 text-sm italic")}>
                    No target is recorded — the night action has no effect.
                  </p>
                </DecreeZone>
              ) : step.requiresTarget && panel ? (
                <DecreeZone
                  kicker={
                    seerReveal && !step.playAlongOnly ?
                      "3 · Record choice"
                    : "2 · Record choice"
                  }
                  tone="night"
                  compact
                >
                  <NarratorTargetPicker
                    players={panel.allPlayers}
                    playerIds={state.playerIds}
                    playerName={playerName}
                    selectedId={step.selectedTargetId}
                    selectedIds={step.selectedTargetIds}
                    requiredTargetCount={step.requiredTargetCount}
                    maxTargetCount={step.maxTargetCount}
                    skipSelected={step.skipped}
                    blockedIds={step.blockedTargetIds}
                    allowSkip={step.allowSkip}
                    aliveOnly
                    disabled={busy}
                    onSelect={onSelectNightTarget}
                  />
                </DecreeZone>
              ) : (
                !step.requiresTarget && (
                  <DecreeZone kicker="2 · Continue" tone="night" compact>
                    <p className={clsx(instructionClass, "m-0 text-sm")}>
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
