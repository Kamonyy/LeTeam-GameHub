"use client";

import clsx from "clsx";
import type { DragEvent, CSSProperties } from "react";

export interface DominoTileProps {
	left: number;
	right: number;
	horizontal?: boolean;
	playable?: boolean;
	/** Grayed out when it's your turn but the tile cannot be played */
	unplayable?: boolean;
	selected?: boolean;
	compact?: boolean;
	placed?: boolean;
	dragging?: boolean;
	draggable?: boolean;
	ghost?: boolean;
	inHand?: boolean;
	onClick?: () => void;
	onDragStart?: (e: DragEvent) => void;
	onDragEnd?: () => void;
	connectEnd?: "left" | "right" | null;
	className?: string;
	style?: CSSProperties;
}

function Pip({ value, placed = false }: { value: number; placed?: boolean }) {
	const positions: Record<number, number[][]> = {
		0: [],
		1: [[1, 1]],
		2: [
			[0, 0],
			[2, 2],
		],
		3: [
			[0, 0],
			[1, 1],
			[2, 2],
		],
		4: [
			[0, 0],
			[0, 2],
			[2, 0],
			[2, 2],
		],
		5: [
			[0, 0],
			[0, 2],
			[1, 1],
			[2, 0],
			[2, 2],
		],
		6: [
			[0, 0],
			[0, 1],
			[0, 2],
			[2, 0],
			[2, 1],
			[2, 2],
		],
	};

	const dots = positions[value] || [];

	return (
		<div className="relative w-full h-full">
			{dots.map(([row, col], i) => (
				<span
					key={i}
					className={clsx(
						"domino-pip absolute rounded-full",
						placed && "domino-pip-board",
					)}
					style={{
						top: `${row * 33 + 16}%`,
						left: `${col * 33 + 16}%`,
						transform: "translate(-50%, -50%)",
					}}
				/>
			))}
		</div>
	);
}

function Half({ value, placed = false }: { value: number; placed?: boolean }) {
	return (
		<div
			className={clsx(
				"domino-face flex-1 flex items-center justify-center min-w-0 relative overflow-hidden",
				placed && "domino-face-board",
			)}
		>
			<div className="domino-face-shimmer absolute inset-0 pointer-events-none z-[2]" />
			<div
				className={clsx(
					"aspect-square relative z-[1]",
					placed ? "w-[92%] h-[92%]" : "w-[88%] h-[88%]",
				)}
			>
				<Pip value={value} placed={placed} />
			</div>
		</div>
	);
}

export default function DominoTile({
	left,
	right,
	horizontal = false,
	playable = false,
	unplayable = false,
	selected = false,
	compact = false,
	placed = false,
	dragging = false,
	draggable = false,
	ghost = false,
	inHand = false,
	onClick,
	onDragStart,
	onDragEnd,
	connectEnd = null,
	className,
	style,
}: DominoTileProps) {
	const isDouble = left === right;
	const boardHorizontal =
		placed && compact ? !isDouble : horizontal && !isDouble;
	const boardVertical = isDouble && compact;

	const size =
		compact ?
			boardVertical ? "w-10 h-[5rem]"
			: boardHorizontal ? "w-[4.5rem] h-[2.25rem]"
			: "w-[2.25rem] h-[4.5rem]"
		: horizontal ? "w-[5.25rem] h-[2.625rem]"
		: "w-[3.25rem] h-[6.25rem]";

	const layoutHorizontal = compact ? boardHorizontal : horizontal;
	const interactive = !!(onClick || draggable);

	return (
		<div
			role={onClick ? "button" : undefined}
			tabIndex={onClick ? 0 : undefined}
			draggable={draggable}
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
			onClick={onClick}
			onKeyDown={
				onClick ?
					(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							onClick();
						}
					}
				:	undefined
			}
			style={style}
			className={clsx(
				"domino-tile relative flex rounded-md select-none touch-none",
				"transition-[transform,box-shadow,filter] duration-300",
				inHand ?
					"domino-tile-hand ease-[cubic-bezier(0.175,0.885,0.32,1.275)]"
				:	"ease-out",
				size,
				layoutHorizontal ? "flex-row" : "flex-col",
				placed && "domino-placed",
				inHand && "domino-tile-3d",
				playable && "domino-playable",
				unplayable && "domino-unplayable",
				selected && "domino-selected",
				dragging && "domino-tile-dragging",
				ghost && "domino-tile-ghost-preview",
				interactive && !playable && onClick && "cursor-pointer domino-hover",
				!interactive && "cursor-default",
				connectEnd && "ring-2 ring-emerald-400/70",
				className,
			)}
		>
			<div className="domino-body absolute inset-0 rounded-md" />
			<Half value={left} placed={placed} />
			<div
				className={clsx(
					"domino-spine shrink-0 relative z-[2]",
					placed && "domino-spine-board",
					layoutHorizontal ? "w-[2px] h-full" : "h-[2px] w-full",
				)}
			>
				<div className="domino-rivet absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
			</div>
			<Half value={right} placed={placed} />
		</div>
	);
}
