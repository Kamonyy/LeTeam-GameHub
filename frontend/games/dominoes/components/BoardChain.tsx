"use client";

import clsx from "clsx";
import {
	forwardRef,
	useImperativeHandle,
	useMemo,
	useRef,
	type DragEvent,
	type CSSProperties,
} from "react";
import type { BoardTile, Tile } from "../types";
import {
	computeChainLayout,
	computeGhostPreview,
	TABLE_PADDING,
	type ChainSide,
	type LayoutDirection,
} from "../lib/chainLayout";
import { useDebouncedSize } from "../lib/useDebouncedSize";
import DominoTile from "./DominoTile";
import DropZone from "./DropZone";

export interface BoardChainHandle {
	getEndClientPoint(end: ChainSide): { x: number; y: number } | null;
}

interface BoardChainProps {
	board: BoardTile[];
	openEnds: { left: number; right: number } | null;
	showDropZones: boolean;
	canPlayEnd: (end: ChainSide) => boolean;
	activeTile: Tile | null;
	dragOverEnd: ChainSide | null;
	ghostEnd: ChainSide | null;
	recentlyPlaced: number | null;
	onEndClick: (end: ChainSide) => void;
	onDragOverEnd: (end: ChainSide) => (e: DragEvent) => void;
	onDragLeave: () => void;
	onDropOnEnd: (end: ChainSide) => (e: DragEvent) => void;
	onZoneHover: (end: ChainSide | null) => void;
}

function chainPointStyle(
	x: number,
	y: number,
	offsetX: number,
	offsetY: number,
): CSSProperties {
	return {
		left: `calc(50% + ${x + offsetX}px)`,
		top: `calc(50% + ${y + offsetY}px)`,
	};
}

function endFacesVertical(dir: LayoutDirection): boolean {
	return dir === "north" || dir === "south";
}

const BoardChain = forwardRef<BoardChainHandle, BoardChainProps>(
	function BoardChain(
		{
			board,
			openEnds,
			showDropZones,
			canPlayEnd,
			activeTile,
			dragOverEnd,
			ghostEnd,
			recentlyPlaced,
			onEndClick,
			onDragOverEnd,
			onDragLeave,
			onDropOnEnd,
			onZoneHover,
		},
		ref,
	) {
		const viewportRef = useRef<HTMLDivElement>(null);
		const viewportSize = useDebouncedSize(viewportRef, 120);

		const layout = useMemo(
			() =>
				computeChainLayout(
					board,
					viewportSize.width > 0 ?
						{ width: viewportSize.width, height: viewportSize.height }
					:	undefined,
				),
			[board, viewportSize.width, viewportSize.height],
		);

		const previewEnd = ghostEnd ?? dragOverEnd;

		const ghostLeft = useMemo(
			() =>
				activeTile && previewEnd === "left" && openEnds ?
					computeGhostPreview(board, activeTile, "left", openEnds)
				:	null,
			[activeTile, previewEnd, openEnds, board],
		);

		const ghostRight = useMemo(
			() =>
				activeTile && previewEnd === "right" && openEnds ?
					computeGhostPreview(board, activeTile, "right", openEnds)
				:	null,
			[activeTile, previewEnd, openEnds, board],
		);

		const leftAnchor = useMemo(
			() => ({
				x: layout.leftEnd.x + layout.offsetX,
				y: layout.leftEnd.y + layout.offsetY,
			}),
			[layout],
		);

		const rightAnchor = useMemo(
			() => ({
				x: layout.rightEnd.x + layout.offsetX,
				y: layout.rightEnd.y + layout.offsetY,
			}),
			[layout],
		);

		useImperativeHandle(
			ref,
			() => ({
				getEndClientPoint(end: ChainSide) {
					const viewport = viewportRef.current;
					if (!viewport) return null;
					const rect = viewport.getBoundingClientRect();
					const anchor = end === "left" ? leftAnchor : rightAnchor;
					const cx = rect.left + rect.width / 2;
					const cy = rect.top + rect.height / 2;
					const scale = layout.scale;
					return {
						x:
							cx +
							(anchor.x * scale + layout.panX),
						y:
							cy +
							(anchor.y * scale + layout.panY),
					};
				},
			}),
			[layout, leftAnchor, rightAnchor],
		);

		const canvasTransform = `translate(${layout.panX}px, ${layout.panY}px) scale(${layout.scale})`;

		return (
			<div
				ref={viewportRef}
				className="domino-chain-viewport absolute z-10 flex items-center justify-center overflow-hidden pointer-events-none"
				style={{ inset: TABLE_PADDING }}
			>
				<div
					className="domino-chain-canvas relative w-full h-full pointer-events-auto transition-transform duration-500 ease-out"
					style={{
						transform: canvasTransform,
						transformOrigin: "center center",
					}}
				>
					<div className="absolute inset-0">
						{layout.tiles.map((t) => (
							<div
								key={`chain-${t.index}`}
								className="absolute domino-chain-tile-slot"
								style={{
									...chainPointStyle(
										t.x,
										t.y,
										layout.offsetX,
										layout.offsetY,
									),
									transform: `translate(-50%, -50%) rotate(${t.rotation}deg)`,
									zIndex: recentlyPlaced === t.index ? 20 : 10 + t.index,
								}}
							>
								<DominoTile
									left={t.displayLeft}
									right={t.displayRight}
									compact
									placed
									className={clsx(
										recentlyPlaced === t.index &&
											"animate-tile-snap-magnetic",
									)}
								/>
							</div>
						))}

						{ghostLeft && (
							<div
								className="absolute pointer-events-none animate-ghost-fade-in"
								style={{
									...chainPointStyle(ghostLeft.x, ghostLeft.y, 0, 0),
									transform: `translate(-50%, -50%) rotate(${ghostLeft.rotation}deg)`,
									zIndex: 25,
								}}
							>
								<DominoTile
									left={ghostLeft.displayLeft}
									right={ghostLeft.displayRight}
									compact
									placed
									ghost
								/>
							</div>
						)}

						{ghostRight && (
							<div
								className="absolute pointer-events-none animate-ghost-fade-in"
								style={{
									...chainPointStyle(ghostRight.x, ghostRight.y, 0, 0),
									transform: `translate(-50%, -50%) rotate(${ghostRight.rotation}deg)`,
									zIndex: 25,
								}}
							>
								<DominoTile
									left={ghostRight.displayLeft}
									right={ghostRight.displayRight}
									compact
									placed
									ghost
								/>
							</div>
						)}

						{showDropZones && canPlayEnd("left") && (
							<>
								<div
									className="domino-chain-end-glow absolute pointer-events-none"
									style={chainPointStyle(
										leftAnchor.x,
										leftAnchor.y,
										0,
										0,
									)}
									aria-hidden
								/>
								<DropZone
									end="left"
									active={showDropZones}
									valid={canPlayEnd("left")}
									dragOver={dragOverEnd === "left"}
									onClick={() => onEndClick("left")}
									onDragOver={onDragOverEnd("left")}
									onDragLeave={onDragLeave}
									onDrop={onDropOnEnd("left")}
									onHover={() => onZoneHover("left")}
									onHoverEnd={() => onZoneHover(null)}
									floating
									vertical={!endFacesVertical(layout.leftEnd.direction)}
									style={chainPointStyle(leftAnchor.x, leftAnchor.y, 0, 0)}
								/>
							</>
						)}

						{showDropZones && canPlayEnd("right") && (
							<>
								<div
									className="domino-chain-end-glow absolute pointer-events-none"
									style={chainPointStyle(
										rightAnchor.x,
										rightAnchor.y,
										0,
										0,
									)}
									aria-hidden
								/>
								<DropZone
									end="right"
									active={showDropZones}
									valid={canPlayEnd("right")}
									dragOver={dragOverEnd === "right"}
									onClick={() => onEndClick("right")}
									onDragOver={onDragOverEnd("right")}
									onDragLeave={onDragLeave}
									onDrop={onDropOnEnd("right")}
									onHover={() => onZoneHover("right")}
									onHoverEnd={() => onZoneHover(null)}
									floating
									vertical={!endFacesVertical(layout.rightEnd.direction)}
									style={chainPointStyle(rightAnchor.x, rightAnchor.y, 0, 0)}
								/>
							</>
						)}
					</div>
				</div>
			</div>
		);
	},
);

export default BoardChain;
