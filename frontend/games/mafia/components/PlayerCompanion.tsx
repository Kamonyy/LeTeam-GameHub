"use client";

import { memo, type ReactNode } from "react";
import clsx from "clsx";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import PhaseCeremony from "@/components/mafia/PhaseCeremony";
import {
	MafiaCard,
	MafiaCardContent,
	MafiaCardHeader,
	MafiaCardTitle,
} from "@/components/mafia/mafia-panel";
import type { MafiaPlayerGameState } from "../types";
import type { LobbyState } from "@/lib/hub/types";
import RoleRevealCard from "./RoleRevealCard";
import PlayerActivityLog from "./PlayerActivityLog";
import {
	roleBorderAccentStyle,
	roleIconBadgeStyle,
	roleThemeStyleFromRole,
} from "../lib/roleTheme";

interface PlayerCompanionProps {
	state: MafiaPlayerGameState;
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

function CompactRoleBadge({
	role,
}: {
	role: NonNullable<MafiaPlayerGameState["myRole"]>;
}) {
	return (
		<MafiaCard
			variant="elevated"
			className="border-l-4"
			style={{
				...roleThemeStyleFromRole(role.id, role.accentColor),
				...roleBorderAccentStyle(role.id, role.accentColor),
			}}
			aria-label={`Your role: ${role.nameEn}`}
		>
			<MafiaCardContent className="flex items-center gap-3.5 p-4">
				<span
					className="inline-flex h-[3.2rem] w-[3.2rem] shrink-0 items-center justify-center rounded-full border-2 text-[1.7rem]"
					style={roleIconBadgeStyle(role.id, role.accentColor)}
					aria-hidden
				>
					{role.icon}
				</span>
				<div className="flex min-w-0 flex-col gap-0.5">
					<span className="font-cinzel text-[1.1rem] text-[color:var(--p1-ink-soft)]">
						{role.nameAr}
					</span>
					<span
						className="font-cinzel text-[1.05rem] font-bold uppercase tracking-[0.12em]"
						style={{ color: role.accentColor }}
					>
						{role.nameEn}
					</span>
				</div>
			</MafiaCardContent>
		</MafiaCard>
	);
}

function NightCalloutCard({
	variant,
	children,
}: {
	variant: "yours" | "dormant";
	children: ReactNode;
}) {
	return (
		<MafiaCard
			role="status"
			variant={variant === "yours" ? "elevated" : "glass"}
			className={clsx(
				"text-center",
				variant === "yours" &&
					"animate-in zoom-in-95 border-amber-500/60 duration-300 motion-safe:animate-[pulse_2.4s_ease-in-out_infinite]",
				variant === "dormant" &&
					"animate-in zoom-in-95 border-indigo-500/40 bg-gradient-to-b from-indigo-950/50 to-stone-950/90 duration-300",
			)}
		>
			<MafiaCardContent className="space-y-2 p-4">{children}</MafiaCardContent>
		</MafiaCard>
	);
}

function PlayerCompanion({
	state,
	lobby,
	playerId,
	onAcknowledgeRole,
	acknowledging,
}: PlayerCompanionProps) {
	const phaseLabel =
		state.phase === "day" || state.phase === "morning"
			? "Day"
			: state.phase === "night"
				? "Night"
				: state.phase === "role_reveal"
					? "Role reveal"
					: state.phase === "match_over"
						? "Game over"
						: state.phase;

	const roleReveal = state.phase === "role_reveal";
	const hasChronicle =
		state.playerChronicle != null && state.playerChronicle.length > 0;

	return (
		<TooltipProvider delayDuration={200}>
			<div
				className={clsx(
					"relative mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-10 pt-6",
					"after:pointer-events-none after:fixed after:inset-0 after:z-[1] after:bg-[radial-gradient(ellipse_at_50%_42%,rgba(180,120,40,0.07)_0%,transparent_58%)]",
					roleReveal &&
						"min-h-[calc(100dvh-10rem)] items-center justify-center gap-6 py-8",
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
					<div
						key={`${state.phase}-${state.dayNumber}-${state.nightNumber}`}
						className="flex flex-col gap-4 [&>*]:animate-in [&>*]:fade-in [&>*]:slide-in-from-bottom-2 [&>*]:duration-300"
					>
						{state.myRole && <CompactRoleBadge role={state.myRole} />}

						{state.phase === "night" && state.nightCallout?.isYourTurn && (
							<NightCalloutCard variant="yours">
								<span
									className="mx-auto mb-1 inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-amber-400/70 bg-gradient-to-b from-amber-900/60 to-stone-900 text-[1.85rem] shadow-[0_0_22px_-2px_rgba(245,158,11,0.55)]"
									aria-hidden
								>
									{state.nightCallout.roleIcon ?? state.myRole?.icon}
								</span>
								<p className="font-cinzel text-base font-bold uppercase tracking-[0.22em] text-amber-200">
									<span className="text-amber-300" aria-hidden>
										✦{" "}
									</span>
									Narrator may call on you
								</p>
								<p className="font-cinzel text-[0.78rem] uppercase tracking-[0.18em] text-[color:var(--p1-ink-soft)]">
									{state.nightCallout.stepTitleEn}
								</p>
								<p className="text-sm italic text-[color:var(--p1-ink-dim)]">
									Stay ready — answer only when the narrator wakes you.
								</p>
							</NightCalloutCard>
						)}

						{state.phase === "night" &&
							state.nightCallout &&
							!state.nightCallout.isYourTurn && (
								<NightCalloutCard variant="dormant">
									<p className="font-cinzel text-base font-bold uppercase tracking-[0.22em] text-indigo-100">
										<span aria-hidden>☾ </span>
										Night {state.nightNumber}
									</p>
									<p className="text-sm italic text-indigo-200/70">
										Eyes closed. Wait for the narrator — do not speak.
									</p>
								</NightCalloutCard>
							)}

						{!state.iAmAlive && state.phase !== "match_over" && (
							<p className="rounded border border-dashed border-stone-700 bg-stone-950/50 px-3 py-2 text-center text-sm italic text-[color:var(--p1-ink-dim)]">
								You have been eliminated. Follow the narrator.
							</p>
						)}

						{state.iAmSilenced && state.phase === "day" && (
							<p className="rounded border border-dashed border-amber-900/50 bg-amber-950/30 px-3 py-2 text-center text-sm italic text-amber-200/80">
								You are silenced today.
							</p>
						)}

						<MafiaCard variant="glass" className="w-full">
							<MafiaCardHeader className="space-y-0 border-b border-stone-800 p-4 pb-3">
								<MafiaCardTitle className="font-cinzel text-[0.72rem] font-bold uppercase tracking-[0.32em] text-amber-200">
									<span className="mr-1 text-[0.55rem] text-amber-500" aria-hidden>
										◆
									</span>
									Players
								</MafiaCardTitle>
							</MafiaCardHeader>
							<MafiaCardContent className="p-4 pt-3">
								<ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 max-[480px]:grid-cols-1">
									{state.playerCards.map((card) => {
										const isSelf = card.id === playerId;
										const isDead = !card.alive;
										const name = displayName(lobby, card.id);

										const seat = (
											<li
												key={card.id}
												className={clsx(
													"grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded border px-2.5 py-2 text-[0.95rem] text-stone-200 transition-colors",
													isDead
														? "border-stone-800/80 bg-stone-950/50 opacity-45 grayscale"
														: "border-stone-700/80 bg-stone-800/40 hover:border-stone-600 hover:bg-stone-800/60",
													isSelf &&
														!isDead &&
														"border-amber-500/60 bg-gradient-to-b from-amber-950/40 to-stone-900/80 shadow-[0_0_14px_-3px_rgba(245,158,11,0.35)]",
												)}
											>
												<span
													className="inline-block h-2.5 w-2.5 shrink-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
													style={{ background: card.color }}
													aria-hidden
												/>
												<span
													className={clsx(
														"min-w-0 truncate",
														isDead && "line-through decoration-stone-600",
													)}
												>
													{name}
													{isSelf ? " (you)" : ""}
												</span>
												<Badge
													variant={isDead ? "destructive" : isSelf ? "default" : "outline"}
													className="justify-self-end whitespace-nowrap"
												>
													{card.alive ? "alive" : "dead"}
												</Badge>
											</li>
										);

										if (isDead) {
											return (
												<Tooltip key={card.id}>
													<TooltipTrigger asChild>{seat}</TooltipTrigger>
													<TooltipContent>Eliminated — follow the narrator</TooltipContent>
												</Tooltip>
											);
										}

										return seat;
									})}
								</ul>
							</MafiaCardContent>
						</MafiaCard>

						{hasChronicle && (
							<PlayerActivityLog
								sections={state.playerChronicle!}
								playerName={(id) => displayName(lobby, id)}
								roleName={roleName}
							/>
						)}
					</div>
				)}

				{!roleReveal && state.phase !== "match_over" && (
					<p className="text-center text-sm italic text-stone-500">
						<span className="text-amber-600/50" aria-hidden>
							~{" "}
						</span>
						Listen to your narrator.
						<span className="text-amber-600/50" aria-hidden>
							{" "}
							~
						</span>
					</p>
				)}
			</div>
		</TooltipProvider>
	);
}

export default memo(PlayerCompanion);
