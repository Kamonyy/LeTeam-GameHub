"use client";

import clsx from "clsx";
import { arcFanTransform } from "../lib/handArc";
import { TEAM_LABELS } from "../types";

type SeatSide = "top" | "left" | "right";

interface OpponentHandSeatProps {
	id: string;
	name: string;
	tileCount: number;
	isActive: boolean;
	isTeamMode: boolean;
	teamId?: "team1" | "team2";
	side: SeatSide;
	drawPulse?: boolean;
	handRef?: (el: HTMLDivElement | null) => void;
}

export default function OpponentHandSeat({
	id,
	name,
	tileCount,
	isActive,
	isTeamMode,
	teamId,
	side,
	drawPulse = false,
	handRef,
}: OpponentHandSeatProps) {
	const visibleTiles = Math.min(tileCount, 9);

	return (
		<div
			className={clsx(
				"domino-opponent-seat",
				`domino-opponent-seat--${side}`,
				isActive && "domino-opponent-seat--active",
				isTeamMode && teamId === "team1" && "domino-opponent-seat--team1",
				isTeamMode && teamId === "team2" && "domino-opponent-seat--team2",
			)}
		>
			<div className="domino-opponent-seat__badge">
				<div
					className={clsx(
						"w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold uppercase shrink-0",
						isActive ?
							"bg-hub-accent text-white"
						:	"bg-hub-border text-hub-muted",
					)}
				>
					{name.charAt(0)}
				</div>
				<div className="min-w-0 text-left">
					<p className="text-xs font-semibold text-foreground truncate max-w-[88px]">
						{name}
					</p>
					{isTeamMode && teamId && (
						<p className="text-[9px] text-hub-muted leading-tight">
							{TEAM_LABELS[teamId]}
						</p>
					)}
				</div>
			</div>

			<div
				ref={handRef}
				className={clsx(
					"domino-opponent-hand",
					side === "top" && "min-h-[3.5rem]",
					drawPulse &&
						"ring-2 ring-emerald-400/35 rounded-xl shadow-[0_0_14px_rgba(52,211,153,0.2)]",
				)}
				aria-hidden
			>
				{Array.from({ length: visibleTiles }).map((_, i) => (
					<div
						key={`${id}-back-${i}`}
						className="domino-opponent-hand__slot"
						style={{
							transform: arcFanTransform(i, visibleTiles, side),
							zIndex: i + 1,
						}}
					>
						<div className="domino-back domino-opponent-tile" />
					</div>
				))}
			</div>
		</div>
	);
}
