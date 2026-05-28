"use client";

import clsx from "clsx";
import { RotateCcw, Trophy } from "lucide-react";
import type { GameState } from "../types";
import { handPipCount } from "../lib/tileUtils";

interface RoundResultsModalProps {
	gameState: GameState;
	playerNames: Record<string, string>;
	isHost: boolean;
	isSpectator: boolean;
	myPlayerId: string;
	onContinue: () => void;
	onRematch: () => void;
	loading?: boolean;
}

export default function RoundResultsModal({
	gameState,
	playerNames,
	isHost,
	isSpectator,
	myPlayerId,
	onContinue,
	onRematch,
	loading = false,
}: RoundResultsModalProps) {
	const isMatchOver = gameState.phase === "match_over";
	const isTeamMode = gameState.settings?.mode === "2v2";
	const reason = gameState.lastAction?.reason;
	const winnerId = isMatchOver ?
		gameState.matchWinnerId
	:	gameState.roundWinnerId;
	const winnerLabel =
		isTeamMode ?
			winnerId === "team1" ? "Team 1"
			: winnerId === "team2" ? "Team 2"
			: "Team"
		:	playerNames[winnerId || ""] || "Winner";

	const won =
		!isSpectator &&
		(isTeamMode ?
			gameState.teamIds[myPlayerId] === winnerId
		:	myPlayerId === winnerId);

	return (
		<div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 glass-blur-sm p-4 pointer-events-auto overscroll-contain">
			<div
				className={clsx(
					"w-full max-w-lg rounded-2xl border-2 p-6 sm:p-8 text-center shadow-2xl animate-overlay-pop",
					isMatchOver ?
						"border-amber-400/50 bg-hub-surface/95"
					: reason === "domino" ?
						"border-amber-400/45 bg-amber-950/90"
					:	"border-orange-400/40 bg-orange-950/85",
				)}
				role="dialog"
				aria-modal="true"
				aria-labelledby="domino-results-title"
			>
				{isMatchOver ?
					<Trophy
						className={clsx(
							"w-14 h-14 mx-auto mb-3",
							won ? "text-amber-400" : "text-hub-muted",
						)}
					/>
				:	null}

				<p
					id="domino-results-title"
					className="text-2xl sm:text-3xl font-black tracking-wide mb-1"
				>
					{isMatchOver ?
						won ? "Match won!"
					:	`${winnerLabel} wins the match`
					: reason === "domino" ?
						"Domino!"
					:	"Table locked"}
				</p>

				<p className="text-sm text-hub-muted mb-5">
					{isMatchOver ?
						`First to ${gameState.settings?.scoreCap ?? 100} points`
					:	<>
							{winnerLabel} wins round {gameState.roundNumber}
							{gameState.lastAction?.points != null &&
								` · +${gameState.lastAction.points} pts`}
						</>
					}
				</p>

				{gameState.handsByPlayer && (
					<ul className="text-left space-y-2 mb-6 max-h-40 overflow-y-auto">
						{gameState.playerIds.map((id) => {
							const hand = gameState.handsByPlayer?.[id] ?? [];
							const pips = handPipCount(hand);
							return (
								<li
									key={id}
									className="flex items-center justify-between gap-2 rounded-lg border border-hub-border/60 bg-black/20 px-3 py-2 text-sm"
								>
									<span className="font-medium truncate">
										{playerNames[id] || "Player"}
									</span>
									<span className="text-hub-muted tabular-nums shrink-0">
										{hand.length === 0 ?
											"0 pips"
										:	`${pips} pips · ${hand.length} tiles`}
									</span>
								</li>
							);
						})}
					</ul>
				)}

				{!isSpectator && (
					<button
						type="button"
						onClick={isMatchOver ? onRematch : onContinue}
						disabled={loading || (isMatchOver && !isHost)}
						className="btn-primary w-full flex items-center justify-center gap-2"
					>
						<RotateCcw className="w-4 h-4" />
						{loading ?
							"Starting…"
						: isMatchOver ?
							isHost ?
								"Play again"
							:	"Waiting for host…"
						:	"Next round"}
					</button>
				)}

				{!isMatchOver && (
					<p className="text-[11px] text-hub-muted mt-3">
						Auto-continues in a few seconds if you don&apos;t tap
					</p>
				)}
			</div>
		</div>
	);
}
