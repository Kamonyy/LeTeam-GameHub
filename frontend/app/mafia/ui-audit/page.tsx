"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, LogIn, UserPlus, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MafiaAtmosphere from "@/games/mafia/components/MafiaAtmosphere";
import MafiaLobby from "@/games/mafia/components/MafiaLobby";
import NarratorDashboard from "@/games/mafia/components/NarratorDashboard";
import PlayerCompanion from "@/games/mafia/components/PlayerCompanion";
import { MafiaButton } from "@/components/mafia/mafia-button";
import {
  MafiaCard,
  MafiaCardContent,
  MafiaCardHeader,
  MafiaCardTitle,
} from "@/components/mafia/mafia-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildAuditScenarios,
  AUDIT_NARRATOR_ID,
} from "@/games/mafia/fixtures/auditFixtures";
import type {
  MafiaNarratorGameState,
  MafiaPlayerGameState,
} from "@/games/mafia/types";
import "@/games/mafia/mafia.css";

const noopBots = async () => ({ ok: true as const });
const noopNarrator = async () => true;
const noop = () => {};

const MAFIA_CARD_VARIANTS = ["glass", "elevated", "codex", "inset"] as const;

function MafiaCardShowcase() {
  return (
    <section
      data-audit-section="mafia-card-variants"
      className="overflow-hidden rounded-lg border border-amber-900/40"
    >
      <h2 className="border-b border-amber-900/30 bg-black/40 px-4 py-2 font-mono text-sm uppercase tracking-widest text-amber-200/90">
        MafiaCard variants
      </h2>
      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
        {MAFIA_CARD_VARIANTS.map((variant) => (
          <MafiaCard key={variant} variant={variant}>
            <MafiaCardHeader className="border-b border-amber-900/25 p-4 pb-2">
              <MafiaCardTitle className="font-cinzel text-[0.72rem] font-bold uppercase tracking-[0.28em] text-amber-200">
                {variant}
              </MafiaCardTitle>
            </MafiaCardHeader>
            <MafiaCardContent className="p-4 pt-3">
              <p className="text-sm text-[color:var(--p1-ink-dim)]">
                Bronze panel shell — atmosphere visible through glass.
              </p>
            </MafiaCardContent>
          </MafiaCard>
        ))}
      </div>
    </section>
  );
}

function CreateGatePreview() {
  return (
    <div className="mx-auto my-5 max-w-md px-5 py-7">
      <Card className="border-stone-800 bg-stone-900/80 backdrop-blur-md">
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="audit-create-name">Display name</Label>
            <Input
              id="audit-create-name"
              type="text"
              defaultValue="Preview Player"
              readOnly
            />
          </div>
          <MafiaButton type="button" variant="primary" className="w-full">
            <Plus className="w-4 h-4" />
            Create room
          </MafiaButton>
          <div className="space-y-2">
            <Label htmlFor="audit-join-code">Room code</Label>
            <Input
              id="audit-join-code"
              type="text"
              className="font-mono tracking-widest"
              defaultValue="AUDIT01"
              readOnly
            />
          </div>
          <MafiaButton type="button" variant="ghost" className="w-full">
            <LogIn className="w-4 h-4" />
            Join room
          </MafiaButton>
        </CardContent>
      </Card>
    </div>
  );
}

function InviteGatePreview() {
  return (
    <div className="mx-auto my-5 max-w-md px-5 py-7">
      <Card className="border-stone-800 bg-stone-900/80 backdrop-blur-md">
        <CardHeader className="pb-2">
          <CardTitle className="font-cinzel flex items-center gap-2 text-lg text-amber-100">
            <UserPlus className="w-5 h-5" />
            Join Mafia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-cormorant text-sm text-stone-400/80">
            Room{" "}
            <span className="font-mono tracking-widest font-cinzel">AUDIT01</span>
          </p>
          <div className="space-y-2">
            <Label htmlFor="audit-invite-name">Display name</Label>
            <Input
              id="audit-invite-name"
              type="text"
              defaultValue="Guest Player"
              readOnly
            />
          </div>
          <MafiaButton type="button" variant="primary" className="w-full">
            <LogIn className="w-4 h-4" />
            Join
          </MafiaButton>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MafiaUiAuditPage() {
  const scenarios = useMemo(() => buildAuditScenarios(), []);

  if (process.env.NODE_ENV === "production") {
    return (
      <main className="min-h-screen p-8 text-white bg-hub-deep">
        <p>UI audit is only available in development.</p>
        <Link href="/mafia" className="text-hub-accent underline mt-4 inline-block">
          Back to Mafia
        </Link>
      </main>
    );
  }

  return (
    <main
      data-mafia-theme
      className="relative min-h-screen bg-zinc-950 text-stone-100"
    >
      <MafiaAtmosphere variant="day" reduced />
      <header className="sticky top-0 z-40 border-b border-stone-800 bg-stone-900/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[76rem] flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/mafia"
              className="shrink-0 rounded-[10px] p-1.5 text-stone-300 hover:text-amber-100"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-cinzel text-xl font-bold uppercase tracking-[0.18em] text-amber-100">
                Mafia UI Audit
              </h1>
              <p className="font-cormorant text-sm italic text-stone-400">
                Development preview — all screens
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="gap-1.5 px-3 py-1 font-cinzel text-[0.7rem] uppercase tracking-widest"
          >
            <Wifi className="h-3.5 w-3.5" aria-hidden />
            Connected
          </Badge>
        </div>
      </header>

      <div className="relative z-[2] isolate mx-auto max-w-[76rem] space-y-16 px-4 pb-24">
        <MafiaCardShowcase />

        {scenarios.map((scenario) => (
          <section
            key={scenario.id}
            data-audit-section={scenario.id}
            className="border border-amber-900/40 rounded-lg overflow-hidden"
          >
            <h2 className="text-sm font-mono uppercase tracking-widest text-amber-200/90 bg-black/40 px-4 py-2 border-b border-amber-900/30">
              {scenario.label}
            </h2>
            <div className="relative min-h-[320px]">
              {scenario.kind === "shell" && scenario.id === "shell-create" && (
                <CreateGatePreview />
              )}
              {scenario.kind === "shell" && scenario.id === "shell-invite" && (
                <InviteGatePreview />
              )}
              {(scenario.kind === "lobby-host" || scenario.kind === "lobby-guest") &&
                scenario.lobby && (
                  <MafiaLobby
                    lobby={scenario.lobby}
                    playerId={scenario.playerId ?? AUDIT_NARRATOR_ID}
                    onStartGame={noop}
                    onLeave={noop}
                    onSettingsChange={
                      scenario.kind === "lobby-host" ? noop : undefined
                    }
                    onKickPlayer={scenario.kind === "lobby-host" ? noop : undefined}
                    onAddDevBots={noopBots}
                    onRemoveDevBots={noopBots}
                  />
                )}
              {scenario.kind === "narrator" && scenario.state && scenario.lobby && (
                <NarratorDashboard
                  state={scenario.state as MafiaNarratorGameState}
                  lobby={scenario.lobby}
                  onNarratorAction={noopNarrator}
                />
              )}
              {scenario.kind === "player" &&
                scenario.state &&
                scenario.lobby &&
                scenario.playerId && (
                  <PlayerCompanion
                    state={scenario.state as MafiaPlayerGameState}
                    lobby={scenario.lobby}
                    playerId={scenario.playerId}
                  />
                )}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
