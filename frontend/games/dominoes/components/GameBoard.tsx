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
import { Sparkles } from "lucide-react";
import clsx from "clsx";
import DominoTile from "./DominoTile";
import Boneyard from "./Boneyard";
import DropZone from "./DropZone";
import BoardChain, { type BoardChainHandle } from "./BoardChain";
import OpponentHandSeat from "./OpponentHandSeat";
import RoundResultsModal from "./RoundResultsModal";
import ScoreProgressBar from "./ScoreProgressBar";
import GameActionOverlay from "./GameActionOverlay";
import TurnIndicator from "@/components/shared/TurnIndicator";
import {
	playDominoSnapSound,
	playDominoDrawSound,
	playDominoPassSound,
} from "../lib/dominoSound";
import { arcFanTransform, opponentSeatPositions } from "../lib/handArc";
import { handPipCount, tileKey, tilesMatch } from "../lib/tileUtils";
import type { GameState, Tile, ValidMove } from "../types";
import { TEAM_LABELS } from "../types";
import type { LobbyState } from "@/lib/hub/types";

interface GameBoardProps {
	gameState: GameState;
	lobby: LobbyState;
	playerId: string;
	isHost?: boolean;
	isSpectator?: boolean;
	onPlayMove: (tile: Tile, end: "left" | "right") => void;
	onDraw: () => void;
	onPass: () => void;
	onContinueRound: () => Promise<boolean>;
	onRematch: () => Promise<boolean>;
}

export default function GameBoard({
	gameState,
	lobby,
	playerId,
	isSpectator = false,
	onPlayMove,
	onDraw,
	onPass,
	onContinueRound,
	onRematch,
	isHost = false,
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
	const [placeFly, setPlaceFly] = useState<{
		tile: Tile;
		style: CSSProperties;
	} | null>(null);
	const [resultsLoading, setResultsLoading] = useState(false);
	const [opponentThinking, setOpponentThinking] = useState(false);

	const boneyardOriginRef = useRef<HTMLDivElement>(null);
	const playerHandRef = useRef<HTMLDivElement>(null);
	const chainRef = useRef<BoardChainHandle>(null);
	const handTileRefs = useRef<Record<string, HTMLDivElement | null>>({});
	const opponentDrawTargets = useRef<Record<string, HTMLDivElement | null>>({});
	const processedDrawSig = useRef<string | null>(null);
	const processedPassSig = useRef<string | null>(null);
	const lastTurnPlayerRef = useRef<string | null>(null);

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
		if (action?.type !== "pass") return;
		const sig = `${action.playerId}:${gameState.roundNumber}`;
		if (processedPassSig.current === sig) return;
		processedPassSig.current = sig;
		playDominoPassSound();
	}, [gameState.lastAction, gameState.roundNumber]);

	useEffect(() => {
		if (gameState.phase === "playing") {
			processedPassSig.current = null;
		}
	}, [gameState.roundNumber, gameState.phase]);

	useEffect(() => {
		const current = gameState.currentPlayerId;
		if (gameState.phase !== "playing") {
			lastTurnPlayerRef.current = current;
			setOpponentThinking(false);
			return;
		}
		if (
			current !== playerId &&
			current !== lastTurnPlayerRef.current &&
			!isSpectator
		) {
			setOpponentThinking(true);
			const t = setTimeout(() => setOpponentThinking(false), 850);
			lastTurnPlayerRef.current = current;
			return () => clearTimeout(t);
		}
		lastTurnPlayerRef.current = current;
	}, [gameState.currentPlayerId, gameState.phase, playerId, isSpectator]);

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
		const pulseTimer =
			!isSelfDraw ?
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

		const handIndex = gameState.myHand.findIndex((t) => tilesMatch(t, tile));
		const handEl =
			handIndex >= 0 ? handTileRefs.current[tileKey(tile, handIndex)] : null;
		const target = chainRef.current?.getEndClientPoint(end);

		const finish = () => {
			playDominoSnapSound();
			onPlayMove(tile, end);
			setSelectedTile(null);
			setDragTile(null);
			setDragOverEnd(null);
			setHoverEnd(null);
			setPlaceFly(null);
		};

		if (handEl && target) {
			const from = handEl.getBoundingClientRect();
			setPlaceFly({
				tile,
				style: {
					left: from.left + from.width / 2,
					top: from.top + from.height / 2,
					transform: "translate(-50%, -50%) scale(1)",
				},
			});
			requestAnimationFrame(() => {
				setPlaceFly({
					tile,
					style: {
						left: target.x,
						top: target.y,
						transform: "translate(-50%, -50%) scale(0.92)",
					},
				});
			});
			window.setTimeout(finish, 420);
			return;
		}

		finish();
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

	const handCount = gameState.myHand.length;
	const myPips = handPipCount(gameState.myHand);
	const showResultsModal =
		gameState.phase === "round_over" || gameState.phase === "match_over";

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

			{opponentThinking && !isMyTurn && gameState.phase === "playing" && (
				<p className="text-center text-xs text-emerald-300/80 animate-opponent-thinking">
					Opponent is thinking…
				</p>
			)}

			<div className="domino-table-stage hands-around-table flex-1 min-h-0 w-full">
				{opponents.map((id, idx) => {
					const side = opponentPositions[idx] ?? "top";
					const count = gameState.tileCounts[id] || 0;
					return (
						<div key={id}>
							<span
								className={clsx(
									"domino-hand-pip-badge",
									side === "top" && "domino-hand-pip-badge--opponent-top",
									side === "left" &&
										"domino-hand-pip-badge--opponent-side domino-hand-pip-badge--opponent-left",
									side === "right" &&
										"domino-hand-pip-badge--opponent-side domino-hand-pip-badge--opponent-right",
								)}
							>
								{count} {count === 1 ? "tile" : "tiles"}
							</span>
							<OpponentHandSeat
								id={id}
								name={playerNames[id] || "Player"}
								tileCount={count}
								isActive={id === gameState.currentPlayerId}
								isTeamMode={isTeamMode}
								teamId={gameState.teamIds[id]}
								side={side}
								handRef={(el) => {
									opponentDrawTargets.current[id] = el;
								}}
								drawPulse={opponentDrawPulse === id}
							/>
						</div>
					);
				})}

				<div className={clsx("domino-table-square relative", tableGlowClass)}>
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
							ref={chainRef}
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

					{showResultsModal && (
						<RoundResultsModal
							gameState={gameState}
							playerNames={playerNames}
							isHost={isHost}
							isSpectator={isSpectator}
							myPlayerId={playerId}
							loading={resultsLoading}
							onContinue={async () => {
								setResultsLoading(true);
								await onContinueRound();
								setResultsLoading(false);
							}}
							onRematch={async () => {
								setResultsLoading(true);
								await onRematch();
								setResultsLoading(false);
							}}
						/>
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
						<span className="domino-hand-pip-badge domino-hand-pip-badge--player">
							{myPips} pips · {handCount} tiles
						</span>
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
								const unplayable = isMyTurn && !playable;
								const key = tileKey(tile, i);
								const fanTransform = arcFanTransform(i, handCount, "bottom", {
									selected: isSelected,
									dragging: isDragging,
								});
								const isHandDrawTarget = i === handCount - 1;
								const hideDuringFly =
									drawFly && !drawFly.faceDown && isHandDrawTarget;
								const hideDuringPlace =
									placeFly !== null && tilesMatch(placeFly.tile, tile);

								return (
									<div
										key={key}
										ref={(el) => {
											handTileRefs.current[key] = el;
										}}
										data-draw-target={isHandDrawTarget ? "hand" : undefined}
										className={clsx(
											"domino-hand-slot origin-bottom",
											hideDuringFly && "opacity-0",
											hideDuringPlace && "opacity-0",
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
											unplayable={unplayable}
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
					<div className="domino-draw-flip-inner">
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
				</div>
			)}

			{placeFly && (
				<div
					className="domino-tile-fly-layer"
					style={placeFly.style}
					aria-hidden
				>
					<DominoTile
						left={placeFly.tile.left}
						right={placeFly.tile.right}
						inHand
					/>
				</div>
			)}
		</div>
	);
}
