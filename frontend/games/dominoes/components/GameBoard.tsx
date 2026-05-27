"use client";

import {
	useState,
	useEffect,
	useCallback,
	useMemo,
	useRef,
	type CSSProperties,
	type DragEvent,
} from "react";
import { Trophy, RotateCcw, Sparkles } from "lucide-react";
import clsx from "clsx";
import DominoTile from "./DominoTile";
import Boneyard from "./Boneyard";
import DropZone from "./DropZone";
import BoardChain from "./BoardChain";
import ScoreProgressBar from "./ScoreProgressBar";
import GameActionOverlay from "./GameActionOverlay";
import TurnIndicator from "@/components/shared/TurnIndicator";
import {
	playDominoSnapSound,
	playDominoDrawSound,
} from "../lib/dominoSound";
import { arcFanTransform, opponentSeatPositions } from "../lib/handArc";
import type { GameState, Tile, ValidMove } from "../types";
import { TEAM_LABELS } from "../types";
import type { LobbyState } from "@/lib/hub/types";

interface GameBoardProps {
	gameState: GameState;
	lobby: LobbyState;
	playerId: string;
	isSpectator?: boolean;
	onPlayMove: (tile: Tile, end: "left" | "right") => void;
	onDraw: () => void;
	onPass: () => void;
}

function tilesMatch(a: Tile, b: Tile) {
	return (
		(a.left === b.left && a.right === b.right) ||
		(a.left === b.right && a.right === b.left)
	);
}

function OpponentHandSeat({
	name,
	tileCount,
	isActive,
	isTeamMode,
	teamId,
	side,
	handRef,
	drawPulse,
}: {
	name: string;
	tileCount: number;
	isActive: boolean;
	isTeamMode: boolean;
	teamId?: "team1" | "team2";
	side: "top" | "left" | "right";
	handRef?: (el: HTMLDivElement | null) => void;
	drawPulse?: boolean;
}) {
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
				<div className="text-left min-w-0">
					<p className="text-xs font-semibold text-gray-100 leading-tight truncate max-w-[88px]">
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
					drawPulse && "domino-opponent-hand--pulse",
				)}
			>
				{Array.from({ length: visibleTiles }).map((_, i) => (
					<div
						key={i}
						className="domino-opponent-hand__slot"
						style={{
							["--slot-i" as string]: String(i),
							["--slot-n" as string]: String(visibleTiles),
						}}
					>
						<div className="domino-back domino-opponent-tile" />
					</div>
				))}
			</div>
		</div>
	);
}

export default function GameBoard({
	gameState,
	lobby,
	playerId,
	isSpectator = false,
	onPlayMove,
	onDraw,
	onPass,
}: GameBoardProps) {
	const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
	const [dragTile, setDragTile] = useState<Tile | null>(null);
	const [dragOverEnd, setDragOverEnd] = useState<"left" | "right" | null>(null);
	const [hoverEnd, setHoverEnd] = useState<"left" | "right" | null>(null);
	const [localTimer, setLocalTimer] = useState(gameState.turnTimeRemaining);
	const [recentlyPlaced, setRecentlyPlaced] = useState<number | null>(null);
	const [shockwave, setShockwave] = useState(false);
	const [boneyardDrawing, setBoneyardDrawing] = useState(false);
	const [opponentDrawPulse, setOpponentDrawPulse] = useState<string | null>(
		null,
	);
	const [drawFly, setDrawFly] = useState<{
		key: string;
		faceDown: boolean;
		tile?: Tile;
		style: CSSProperties;
	} | null>(null);

	const boneyardOriginRef = useRef<HTMLDivElement>(null);
	const playerHandRef = useRef<HTMLDivElement>(null);
	const opponentDrawTargets = useRef<Record<string, HTMLDivElement | null>>({});
	const processedDrawSig = useRef<string | null>(null);

	const isMyTurn = !isSpectator && gameState.currentPlayerId === playerId;
	const isTeamMode = gameState.settings?.mode === "2v2";
	const scoreCap = gameState.settings?.scoreCap ?? 100;

	const playerNames = useMemo(
		() => Object.fromEntries(lobby.players.map((p) => [p.id, p.displayName])),
		[lobby.players],
	);

	const opponents = useMemo(() => {
		if (isSpectator) return [];
		return gameState.playerIds.filter((id) => id !== playerId);
	}, [gameState.playerIds, playerId, isSpectator]);

	const opponentPositions = useMemo(
		() => opponentSeatPositions(opponents.length),
		[opponents.length],
	);

	useEffect(() => {
		setLocalTimer(gameState.turnTimeRemaining);
		if (gameState.turnTimerPaused || gameState.phase !== "playing") return;
		const interval = setInterval(() => {
			setLocalTimer((t) => Math.max(0, t - 100));
		}, 100);
		return () => clearInterval(interval);
	}, [
		gameState.turnTimeRemaining,
		gameState.turnTimerPaused,
		gameState.currentPlayerId,
		gameState.phase,
	]);

	useEffect(() => {
		if (gameState.lastAction?.type === "play") {
			setRecentlyPlaced(gameState.board.length - 1);
			const t = setTimeout(() => setRecentlyPlaced(null), 700);
			return () => clearTimeout(t);
		}
		if (gameState.lastAction?.type === "gameover") {
			setShockwave(true);
			const t = setTimeout(() => setShockwave(false), 900);
			return () => clearTimeout(t);
		}
	}, [gameState.lastAction, gameState.board.length]);

	useEffect(() => {
		const action = gameState.lastAction;
		if (action?.type !== "draw" || !action.playerId) return;

		const drawerId = action.playerId;
		const sig = `${drawerId}:${gameState.boneyardCount}:${gameState.tileCounts[drawerId] ?? 0}`;
		if (processedDrawSig.current === sig) return;
		processedDrawSig.current = sig;

		const isSelfDraw = drawerId === playerId;

		setBoneyardDrawing(true);
		const stackPopTimer = setTimeout(() => setBoneyardDrawing(false), 380);

		if (!isSelfDraw) {
			setOpponentDrawPulse(drawerId);
		}
		const pulseTimer = !isSelfDraw ?
			setTimeout(() => setOpponentDrawPulse(null), 700)
		:	undefined;

		const runFly = () => {
			const origin = boneyardOriginRef.current;
			if (!origin) return;

			const from = origin.getBoundingClientRect();
			const fromX = from.left + from.width / 2;
			const fromY = from.top + from.height / 2;

			let toX: number;
			let toY: number;
			let endRot = "0deg";
			let arc = "-28px";
			let faceDown = true;
			let tile: Tile | undefined;

			if (isSelfDraw) {
				const handEl = playerHandRef.current;
				if (!handEl) return;

				const handTarget =
					handEl.querySelector<HTMLElement>('[data-draw-target="hand"]') ??
					handEl;
				const to = handTarget.getBoundingClientRect();
				toX = to.left + to.width / 2;
				toY = to.top + to.height / 2;

				const count = gameState.myHand.length;
				const fan = arcFanTransform(count - 1, count, "bottom");
				const rotMatch = fan.match(/rotate\(([-\d.]+)deg\)/);
				endRot = rotMatch ? `${rotMatch[1]}deg` : "0deg";
				arc = "-36px";
				faceDown = false;
				tile = action.tile;
			} else {
				const target = opponentDrawTargets.current[drawerId];
				if (!target) return;
				const to = target.getBoundingClientRect();
				toX = to.left + to.width / 2;
				toY = to.top + to.height / 2;
			}

			playDominoDrawSound();

			setDrawFly({
				key: sig,
				faceDown,
				tile,
				style: {
					position: "fixed",
					left: fromX,
					top: fromY,
					zIndex: 9999,
					pointerEvents: "none",
					["--fly-dx" as string]: `${toX - fromX}px`,
					["--fly-dy" as string]: `${toY - fromY}px`,
					["--fly-arc" as string]: arc,
					["--fly-end-rot" as string]: endRot,
				},
			});

			const flyTimer = setTimeout(() => setDrawFly(null), 640);
			return () => clearTimeout(flyTimer);
		};

		let flyCleanup: (() => void) | undefined;
		const flyFrame = requestAnimationFrame(() => {
			flyCleanup = runFly();
		});

		return () => {
			clearTimeout(stackPopTimer);
			if (pulseTimer) clearTimeout(pulseTimer);
			cancelAnimationFrame(flyFrame);
			flyCleanup?.();
		};
	}, [
		gameState.lastAction,
		gameState.boneyardCount,
		gameState.tileCounts,
		gameState.myHand.length,
		playerId,
	]);

	useEffect(() => {
		if (gameState.phase === "playing") {
			processedDrawSig.current = null;
		}
	}, [gameState.roundNumber, gameState.phase]);

	useEffect(() => {
		if (gameState.phase === "playing") {
			setSelectedTile(null);
			setDragTile(null);
			setDragOverEnd(null);
		}
	}, [gameState.currentPlayerId, gameState.phase]);

	const validMoves = gameState.validMoves || [];

	const isPlayable = useCallback(
		(tile: Tile): ValidMove[] => {
			if (!isMyTurn) return [];
			return validMoves.filter((m) => tilesMatch(m.tile, tile));
		},
		[isMyTurn, validMoves],
	);

	const canPlayEnd = (end: "left" | "right") =>
		validMoves.some((m) => m.end === end);

	const playTile = (tile: Tile, end: "left" | "right") => {
		if (!isPlayable(tile).some((m) => m.end === end)) return;
		playDominoSnapSound();
		onPlayMove(tile, end);
		setSelectedTile(null);
		setDragTile(null);
		setDragOverEnd(null);
		setHoverEnd(null);
	};

	const handleTileClick = (tile: Tile) => {
		if (!isMyTurn) return;
		const moves = isPlayable(tile);
		if (moves.length === 0) return;

		if (moves.length === 1) {
			playTile(tile, moves[0].end);
			return;
		}

		setSelectedTile(
			selectedTile && tilesMatch(selectedTile, tile) ? null : tile,
		);
	};

	const handleBoardEndClick = (end: "left" | "right") => {
		const tile = dragTile || selectedTile;
		if (!tile) return;
		playTile(tile, end);
	};

	const handleDragStart = (tile: Tile) => (e: DragEvent) => {
		const moves = isPlayable(tile);
		if (moves.length === 0) {
			e.preventDefault();
			return;
		}
		setDragTile(tile);
		setSelectedTile(tile);
		e.dataTransfer.setData("application/json", JSON.stringify(tile));
		e.dataTransfer.effectAllowed = "move";
	};

	const handleDragEnd = () => {
		setDragTile(null);
		setDragOverEnd(null);
	};

	const handleDropOnEnd = (end: "left" | "right") => (e: DragEvent) => {
		e.preventDefault();
		let tile = dragTile;
		if (!tile) {
			try {
				tile = JSON.parse(e.dataTransfer.getData("application/json")) as Tile;
			} catch {
				tile = null;
			}
		}
		if (tile) playTile(tile, end);
		setDragOverEnd(null);
	};

	const handleDragOverEnd = (end: "left" | "right") => (e: DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		setDragOverEnd(end);
	};

	const canDraw =
		isMyTurn && validMoves.length === 0 && gameState.boneyardCount > 0;
	const showDropZones = isMyTurn && gameState.phase === "playing";
	const activeDragTile = dragTile || selectedTile;
	const ghostEnd = dragOverEnd ?? hoverEnd;
	const urgentTimer =
		isMyTurn && localTimer <= 10000 && !gameState.turnTimerPaused;
	const tableGlowClass =
		shockwave ? "animate-table-shockwave"
		: urgentTimer ? "animate-table-glow-urgent"
		: "animate-table-glow";

	const scoreBars =
		isTeamMode ?
			<>
				<ScoreProgressBar
					label={TEAM_LABELS.team1}
					score={gameState.matchScores.team1 ?? 0}
					cap={scoreCap}
					teamColor="blue"
					highlight={!isSpectator && gameState.teamIds[playerId] === "team1"}
				/>
				<ScoreProgressBar
					label={TEAM_LABELS.team2}
					score={gameState.matchScores.team2 ?? 0}
					cap={scoreCap}
					teamColor="amber"
					highlight={!isSpectator && gameState.teamIds[playerId] === "team2"}
				/>
			</>
		:	gameState.playerIds.map((id) => (
				<ScoreProgressBar
					key={id}
					label={playerNames[id] || "Player"}
					score={gameState.matchScores[id] ?? 0}
					cap={scoreCap}
					highlight={!isSpectator && id === playerId}
				/>
			));

	if (gameState.phase === "match_over") {
		const won =
			!isSpectator &&
			(isTeamMode ?
				gameState.matchWinnerId === gameState.teamIds[playerId]
			:	gameState.matchWinnerId === playerId);
		const winnerLabel =
			isTeamMode ?
				(TEAM_LABELS[gameState.matchWinnerId as "team1" | "team2"] ?? "Team")
			:	playerNames[gameState.matchWinnerId || ""] || "Unknown";

		return (
			<div className="flex flex-col items-center justify-center gap-8 py-16 animate-fade-in">
				<Trophy
					className={clsx(
						"w-24 h-24 animate-overlay-pop",
						won ?
							"text-amber-400 drop-shadow-[0_0_24px_rgba(251,191,36,0.4)]"
						:	"text-hub-muted",
					)}
				/>
				<div className="text-center">
					<p className="text-sm text-hub-muted uppercase tracking-widest mb-2">
						Match Complete
					</p>
					<h2 className="text-4xl font-black mb-2">
						{won ? "Victory!" : `${winnerLabel} wins!`}
					</h2>
					<p className="text-hub-muted">
						First to {scoreCap} points · {gameState.roundNumber} rounds
					</p>
				</div>
				<div className="flex flex-wrap justify-center gap-4 w-full max-w-2xl px-4">
					{scoreBars}
				</div>
			</div>
		);
	}

	if (gameState.phase === "round_over") {
		const roundWinner = playerNames[gameState.roundWinnerId || ""] || "Unknown";
		const reason = gameState.lastAction?.reason;

		return (
			<div className="flex flex-col items-center gap-8 py-12 animate-fade-in">
				<div
					className={clsx(
						"px-10 py-6 rounded-2xl border-2 text-center animate-overlay-pop",
						reason === "domino" ?
							"border-amber-400/50 bg-amber-950/40 shadow-lg shadow-amber-500/10"
						:	"border-orange-400/40 bg-orange-950/30",
					)}
				>
					<p className="text-4xl font-black tracking-wider mb-1">
						{reason === "domino" ? "DOMINO!" : "TABLE LOCKED"}
					</p>
					<p className="text-hub-muted">
						{roundWinner} wins round {gameState.roundNumber}
						{gameState.lastAction?.points != null &&
							` · +${gameState.lastAction.points} pts`}
					</p>
				</div>
				<div className="flex flex-wrap justify-center gap-3 w-full max-w-3xl px-4">
					{scoreBars}
				</div>
				{gameState.handsByPlayer &&
					Object.keys(gameState.handsByPlayer).length > 0 && (
						<div className="w-full max-w-4xl px-4 animate-fade-in">
							<p className="text-center text-xs uppercase tracking-widest text-hub-muted mb-4">
								Remaining hands
							</p>
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
								{gameState.playerIds.map((id) => {
									const hand = gameState.handsByPlayer?.[id] ?? [];
									return (
										<div
											key={id}
											className="rounded-xl border border-hub-border bg-hub-surface/60 p-4"
										>
											<p className="text-sm font-semibold mb-3 truncate">
												{playerNames[id] || "Player"}
												{hand.length > 0 && (
													<span className="text-hub-muted font-normal ml-1">
														· {hand.length}
													</span>
												)}
											</p>
											<div className="flex flex-wrap gap-2 justify-center min-h-[2.5rem]">
												{hand.length === 0 ?
													<span className="text-xs text-hub-muted">
														Empty
													</span>
												:	hand.map((tile, i) => (
														<DominoTile
															key={`${id}-${tile.left}-${tile.right}-${i}`}
															left={tile.left}
															right={tile.right}
															compact
															className="animate-overlay-pop"
															style={{
																animationDelay: `${i * 40}ms`,
															}}
														/>
													))
												}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}
				<p className="text-sm text-hub-muted flex items-center gap-2 animate-pulse-soft">
					<RotateCcw className="w-4 h-4" />
					Next round starting…
				</p>
			</div>
		);
	}

	const handCount = gameState.myHand.length;

	return (
		<div className="domino-arena flex flex-col gap-3 w-full max-w-7xl mx-auto min-h-[calc(100dvh-5rem)] animate-fade-in pb-2">
			<div className="flex flex-col gap-2 px-1">
				<div className="flex items-center justify-center gap-2 text-xs text-hub-muted uppercase tracking-widest">
					<Sparkles className="w-3.5 h-3.5 text-hub-accent" />
					Round {gameState.roundNumber} · First to {scoreCap}
				</div>
				<div className="flex flex-wrap justify-center gap-2">{scoreBars}</div>
			</div>

			<TurnIndicator
				currentPlayerId={gameState.currentPlayerId}
				myPlayerId={isSpectator ? "" : playerId}
				playerNames={playerNames}
				turnTimeRemaining={localTimer}
				turnTimerPaused={gameState.turnTimerPaused}
			/>

			<div className="domino-table-stage hands-around-table flex-1 min-h-0 w-full">
				{opponents.map((id, idx) => (
					<OpponentHandSeat
						key={id}
						name={playerNames[id] || "Player"}
						tileCount={gameState.tileCounts[id] || 0}
						isActive={id === gameState.currentPlayerId}
						isTeamMode={isTeamMode}
						teamId={gameState.teamIds[id]}
						side={opponentPositions[idx] ?? "top"}
						handRef={(el) => {
							opponentDrawTargets.current[id] = el;
						}}
						drawPulse={opponentDrawPulse === id}
					/>
				))}

				<div
					className={clsx(
						"domino-table-square relative",
						tableGlowClass,
					)}
				>
					<GameActionOverlay
						lastAction={gameState.lastAction}
						playerNames={playerNames}
					/>

					{gameState.board.length === 0 ?
						<div className="relative z-10 flex flex-col items-center justify-center gap-4 h-full min-h-[300px] px-4 pb-16 pt-14">
							<DropZone
								end="left"
								active={showDropZones}
								valid={validMoves.length > 0}
								dragOver={dragOverEnd === "left"}
								onClick={() => activeDragTile && handleBoardEndClick("left")}
								onDragOver={handleDragOverEnd("left")}
								onDragLeave={() => setDragOverEnd(null)}
								onDrop={handleDropOnEnd("left")}
								onHover={() => setHoverEnd("left")}
								onHoverEnd={() => setHoverEnd(null)}
								vertical={false}
								large
							/>
							{!showDropZones && (
								<p className="text-emerald-200/40 text-sm font-medium tracking-wide">
									Play the first tile
								</p>
							)}
						</div>
					:	<BoardChain
							board={gameState.board}
							openEnds={gameState.openEnds}
							showDropZones={showDropZones}
							canPlayEnd={canPlayEnd}
							activeTile={activeDragTile}
							dragOverEnd={dragOverEnd}
							ghostEnd={ghostEnd}
							recentlyPlaced={recentlyPlaced}
							onEndClick={handleBoardEndClick}
							onDragOverEnd={handleDragOverEnd}
							onDragLeave={() => setDragOverEnd(null)}
							onDropOnEnd={handleDropOnEnd}
							onZoneHover={setHoverEnd}
						/>
					}

					{gameState.openEnds && gameState.board.length > 0 && (
						<div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 flex gap-4 text-xs font-mono">
							<span className="px-3 py-1 rounded-full bg-black/40 text-emerald-300/90 border border-emerald-500/20 backdrop-blur-sm">
								◀ {gameState.openEnds.left}
							</span>
							<span className="px-3 py-1 rounded-full bg-black/40 text-emerald-300/90 border border-emerald-500/20 backdrop-blur-sm">
								{gameState.openEnds.right} ▶
							</span>
						</div>
					)}

					{gameState.boneyardCount > 0 && (
						<div className="domino-boneyard-float">
							<Boneyard
								ref={boneyardOriginRef}
								count={gameState.boneyardCount}
								canDraw={!isSpectator && canDraw}
								onDraw={onDraw}
								isDrawing={boneyardDrawing}
							/>
						</div>
					)}
				</div>

				{!isSpectator && (
				<>
				<p className="domino-player-hand-hint text-[10px] uppercase tracking-widest text-hub-muted/90">
					{isMyTurn ?
						"Drag to the table or tap a tile"
					:	"Your hand · waiting"}
					{selectedTile &&
						isMyTurn &&
						isPlayable(selectedTile).length > 1 &&
						!dragTile && (
							<span className="block text-emerald-400/90 normal-case tracking-normal text-xs mt-0.5 animate-pulse-soft">
								Tap left / right on the table
							</span>
						)}
					{canDraw && (
						<span className="block text-hub-muted normal-case tracking-normal text-xs mt-0.5">
							No moves — draw from the boneyard
						</span>
					)}
				</p>

				<div
					ref={playerHandRef}
					key={gameState.roundNumber}
					className="domino-hand-arc domino-hand-arc--bottom domino-player-hand"
				>
					{gameState.myHand.map((tile, i) => {
						const playable = isPlayable(tile).length > 0;
						const isSelected =
							selectedTile !== null && tilesMatch(selectedTile, tile);
						const isDragging =
							dragTile !== null && tilesMatch(dragTile, tile);
						const fanTransform = arcFanTransform(i, handCount, "bottom", {
							selected: isSelected,
							dragging: isDragging,
						});
						const isHandDrawTarget = i === handCount - 1;
						const hideDuringFly =
							drawFly && !drawFly.faceDown && isHandDrawTarget;

						return (
							<div
								key={`${tile.left}-${tile.right}-${i}`}
								data-draw-target={isHandDrawTarget ? "hand" : undefined}
								className={clsx(
									"origin-bottom transition-transform duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
									hideDuringFly && "opacity-0",
								)}
								style={{
									transform: fanTransform,
									zIndex: isSelected || isDragging ? 40 : i + 1,
								}}
							>
								<DominoTile
									left={tile.left}
									right={tile.right}
									playable={playable && isMyTurn}
									selected={isSelected}
									dragging={isDragging}
									draggable={playable && isMyTurn}
									inHand
									onDragStart={handleDragStart(tile)}
									onDragEnd={handleDragEnd}
									onClick={() => handleTileClick(tile)}
									className="animate-hand-deal"
									style={{
										animationDelay: `${i * 65}ms`,
										["--deal-from-x" as string]: `${(i - (handCount - 1) / 2) * -12}px`,
										["--fan-rotate" as string]: "0deg",
									}}
								/>
							</div>
						);
					})}
				</div>
				</>
				)}
			</div>

			{drawFly && (
				<div
					key={drawFly.key}
					className="animate-boneyard-draw-fly"
					style={drawFly.style}
					aria-hidden
				>
					{drawFly.faceDown || !drawFly.tile ?
						<div className="domino-back domino-opponent-tile rounded-md border border-white/[0.12] shadow-[0_8px_20px_rgba(0,0,0,0.5)]" />
					:	<DominoTile
							left={drawFly.tile.left}
							right={drawFly.tile.right}
							inHand
							className="shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
						/>
					}
				</div>
			)}
		</div>
	);
}
