"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Clock, Loader2 } from "lucide-react";
import clsx from "clsx";
import type { GameCatalogEntry } from "@/lib/hub/games-registry";
import HubDominoTile from "./HubDominoTile";
import { markHubGameNavigation } from "./hubGameNavigation";

const SPARKS = [
	{ sx: "6px", sy: "-18px", delay: "0s" },
	{ sx: "-10px", sy: "-22px", delay: "0.08s" },
	{ sx: "14px", sy: "-14px", delay: "0.12s" },
	{ sx: "-4px", sy: "-26px", delay: "0.05s" },
];

const CURSOR_BY_GAME: Record<string, string> = {
	dominoes: "grab",
	wordgame: "letter",
	"bara-alsalafa": "crosshair",
	mafia: "mask",
};

/** Uniform index in [0, max) — crypto.getRandomValues when available */
function randomIndex(max: number): number {
	if (max <= 1) return 0;
	if (typeof crypto !== "undefined" && crypto.getRandomValues) {
		const bucket = new Uint32Array(1);
		crypto.getRandomValues(bucket);
		return bucket[0] % max;
	}
	return Math.floor(Math.random() * max);
}

function pickRandomFromPool<T extends string>(
	words: readonly T[],
	exclude?: T,
): T {
	const pool =
		exclude && words.length > 1 ? words.filter((w) => w !== exclude) : words;
	if (pool.length === 0) {
		return words[randomIndex(words.length)]!;
	}
	return pool[randomIndex(pool.length)]!;
}

interface GameArcadeCardProps {
	game: GameCatalogEntry;
	staggerIndex: number;
}

/** Sample secret words for hub Word Game card preview */
const WORD_PREVIEW_WORDS = [
	"YEET",
	"SUS",
	"BRUH",
	"NOOB",
	"RIZZ",
	"OOF",
	"POG",
	"CAP",
	"LAG",
	"AFK",
] as const;

const WORD_MATRIX_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#%&*";

const WORD_PREVIEW_SCRAMBLE_MS = 28;
const WORD_PREVIEW_INITIAL_SCRAMBLE_MS = 240;
const WORD_PREVIEW_FIRST_LETTER_MS = 240;
const WORD_PREVIEW_LETTER_BASE_MS = 180;
const WORD_PREVIEW_LETTER_STEP_MS = 52;
const WORD_PREVIEW_HOLD_MS = 2200;

function randomMatrixChar(): string {
	return WORD_MATRIX_CHARSET[randomIndex(WORD_MATRIX_CHARSET.length)]!;
}

function pickRandomWordPreview(exclude?: string): string {
	return pickRandomFromPool(WORD_PREVIEW_WORDS, exclude);
}

function emptyWordSlots(length: number): { slots: string[]; locked: boolean[] } {
	return {
		slots: Array.from({ length }, () => "·"),
		locked: Array.from({ length }, () => false),
	};
}

function WordPreview({ active }: { active: boolean }) {
	const [initial] = useState(() => {
		const word = pickRandomWordPreview();
		const empty = emptyWordSlots(word.length);
		return { word, slots: empty.slots, locked: empty.locked };
	});
	const [target, setTarget] = useState(initial.word);
	const [slots, setSlots] = useState(initial.slots);
	const [lockedMask, setLockedMask] = useState(initial.locked);
	const [complete, setComplete] = useState(false);
	const activeRef = useRef(false);
	const timersRef = useRef<{
		tick?: number;
		lock?: number;
		cycle?: number;
	}>({});

	useEffect(() => {
		activeRef.current = active;
	}, [active]);

	useEffect(() => {
		const clearTimers = () => {
			if (timersRef.current.tick) window.clearInterval(timersRef.current.tick);
			if (timersRef.current.lock) window.clearTimeout(timersRef.current.lock);
			if (timersRef.current.cycle) window.clearTimeout(timersRef.current.cycle);
			timersRef.current = {};
		};

		const startWordCycle = (word: string) => {
			if (!activeRef.current) return;

			const letters = word.split("");
			const len = letters.length;
			let lockIndex = 0;

			setTarget(word);
			setComplete(false);
			setLockedMask(emptyWordSlots(len).locked);
			setSlots(emptyWordSlots(len).slots);

			const scramble = () => {
				setSlots(
					letters.map((letter, i) => {
						if (i < lockIndex) return letter;
						return randomIndex(100) > 3 ? randomMatrixChar() : "·";
					}),
				);
			};

			const lockNext = () => {
				if (!activeRef.current) return;

				if (lockIndex >= len) {
					if (timersRef.current.tick) {
						window.clearInterval(timersRef.current.tick);
					}
					setComplete(true);
					timersRef.current.cycle = window.setTimeout(() => {
						if (activeRef.current) {
							startWordCycle(pickRandomWordPreview(word));
						}
					}, WORD_PREVIEW_HOLD_MS);
					return;
				}

				const i = lockIndex;
				lockIndex += 1;
				setLockedMask((prev) => {
					const next = [...prev];
					next[i] = true;
					return next;
				});
				setSlots((prev) => {
					const next = [...prev];
					next[i] = letters[i];
					return next;
				});

				const delayMs =
					lockIndex === 1
						? WORD_PREVIEW_FIRST_LETTER_MS
						: WORD_PREVIEW_LETTER_BASE_MS + lockIndex * WORD_PREVIEW_LETTER_STEP_MS;
				timersRef.current.lock = window.setTimeout(lockNext, delayMs);
			};

			scramble();
			timersRef.current.tick = window.setInterval(scramble, WORD_PREVIEW_SCRAMBLE_MS);
			timersRef.current.lock = window.setTimeout(
				lockNext,
				WORD_PREVIEW_INITIAL_SCRAMBLE_MS,
			);
		};

		if (!active) {
			clearTimers();
			const idle = emptyWordSlots(5);
			setTarget("·····");
			setComplete(false);
			setLockedMask(idle.locked);
			setSlots(idle.slots);
			return clearTimers;
		}

		const reducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		if (reducedMotion) {
			let word = pickRandomWordPreview();
			const apply = (w: string) => {
				setTarget(w);
				setComplete(true);
				setLockedMask(w.split("").map(() => true));
				setSlots(w.split(""));
			};
			apply(word);
			timersRef.current.tick = window.setInterval(() => {
				if (!activeRef.current) return;
				word = pickRandomWordPreview(word);
				apply(word);
			}, 3500);
			return clearTimers;
		}

		startWordCycle(pickRandomWordPreview());
		return clearTimers;
	}, [active]);

	return (
		<div
			className={clsx(
				"hub-word-slots mt-4",
				active && "hub-word-slots--live",
				complete && "hub-word-slots--complete",
			)}
			aria-hidden
		>
			{target.split("").map((_, i) => (
				<span
					key={`${target}-${i}`}
					className={clsx(
						"hub-word-slot",
						lockedMask[i] && "hub-word-slot--locked",
						active && !lockedMask[i] && "hub-word-slot--scramble",
					)}
				>
					<span className="hub-word-slot__char">{slots[i] ?? "·"}</span>
				</span>
			))}
		</div>
	);
}

/** Sample secret words for hub Bara card preview (برا السالفة) */
const BARA_PREVIEW_WORDS = [
	"بيتزا",
	"قهوة",
	"مطار",
	"سينما",
	"شاطئ",
	"مطعم",
	"سيارة",
	"تلفون",
	"مستشفى",
	"حديقة",
] as const;

const BARA_SCAN_CHARS = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي";

/** Hub preview timing (ms) — letter lock build-up */
const BARA_PREVIEW_SCRAMBLE_MS = 40;
const BARA_PREVIEW_INITIAL_SCRAMBLE_MS = 320;
const BARA_PREVIEW_FIRST_LETTER_MS = 260;
const BARA_PREVIEW_LETTER_BASE_MS = 200;
const BARA_PREVIEW_LETTER_STEP_MS = 65;
const BARA_PREVIEW_HOLD_MS = 2400;

function randomBaraGlyph(): string {
	return BARA_SCAN_CHARS[randomIndex(BARA_SCAN_CHARS.length)]!;
}

function pickRandomBaraWord(exclude?: string): string {
	return pickRandomFromPool(BARA_PREVIEW_WORDS, exclude);
}

function BaraPreview({ active }: { active: boolean }) {
	const [phase, setPhase] = useState<"idle" | "scan" | "reveal">("idle");
	const [display, setDisplay] = useState("·····");
	const activeRef = useRef(false);
	const timersRef = useRef<{
		tick?: number;
		lock?: number;
		cycle?: number;
	}>({});

	useEffect(() => {
		activeRef.current = active;
	}, [active]);

	useEffect(() => {
		const clearTimers = () => {
			if (timersRef.current.tick) window.clearInterval(timersRef.current.tick);
			if (timersRef.current.lock) window.clearTimeout(timersRef.current.lock);
			if (timersRef.current.cycle) window.clearTimeout(timersRef.current.cycle);
			timersRef.current = {};
		};

		const startWordCycle = (targetWord: string) => {
			if (!activeRef.current) return;

			const letters = Array.from(targetWord);
			const len = letters.length;
			let lockIndex = 0;

			setPhase("scan");
			setDisplay(letters.map(() => "·").join(""));

			const scramble = () => {
				setDisplay(
					letters
						.map((ch, i) => {
							if (i < lockIndex) return ch;
							return randomIndex(10) > 0 ? randomBaraGlyph() : "·";
						})
						.join(""),
				);
			};

			const lockNext = () => {
				if (!activeRef.current) return;

				if (lockIndex >= len) {
					if (timersRef.current.tick) {
						window.clearInterval(timersRef.current.tick);
					}
					setPhase("reveal");
					setDisplay(targetWord);
					timersRef.current.cycle = window.setTimeout(() => {
						if (activeRef.current) {
							startWordCycle(pickRandomBaraWord(targetWord));
						}
					}, BARA_PREVIEW_HOLD_MS);
					return;
				}

				lockIndex += 1;
				setDisplay(
					letters
						.map((ch, i) => (i < lockIndex ? ch : randomBaraGlyph()))
						.join(""),
				);

				const delayMs =
					lockIndex === 1
						? BARA_PREVIEW_FIRST_LETTER_MS
						: BARA_PREVIEW_LETTER_BASE_MS + lockIndex * BARA_PREVIEW_LETTER_STEP_MS;
				timersRef.current.lock = window.setTimeout(lockNext, delayMs);
			};

			scramble();
			timersRef.current.tick = window.setInterval(scramble, BARA_PREVIEW_SCRAMBLE_MS);
			timersRef.current.lock = window.setTimeout(
				lockNext,
				BARA_PREVIEW_INITIAL_SCRAMBLE_MS,
			);
		};

		if (!active) {
			clearTimers();
			setPhase("idle");
			setDisplay("·····");
			return clearTimers;
		}

		const reducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		if (reducedMotion) {
			let word = pickRandomBaraWord();
			setPhase("reveal");
			setDisplay(word);
			timersRef.current.tick = window.setInterval(() => {
				if (!activeRef.current) return;
				word = pickRandomBaraWord(word);
				setDisplay(word);
			}, 4000);
			return clearTimers;
		}

		startWordCycle(pickRandomBaraWord());
		return clearTimers;
	}, [active]);

	return (
		<div
			className={clsx(
				"hub-bara-preview mt-4",
				active && "hub-bara-preview--live",
				phase === "scan" && "hub-bara-preview--building",
				phase === "reveal" && "hub-bara-preview--reveal",
			)}
			dir="rtl"
			aria-hidden
		>
			<div className="hub-bara-preview__card">
				<span className="hub-bara-preview__label">الكلمة السرية</span>
				<div className="hub-bara-preview__word-wrap">
					<span className="hub-bara-preview__word">{display}</span>
				</div>
			</div>
			<p className="hub-bara-preview__hint">
				{phase === "reveal" ? "واحد برا السالفة…" : "منو برا السالفة؟"}
			</p>
		</div>
	);
}

function MafiaPreview({ active }: { active: boolean }) {
	const [isNight, setIsNight] = useState(false);
	const timerRef = useRef<number | undefined>(undefined);

	useEffect(() => {
		if (timerRef.current) window.clearTimeout(timerRef.current);

		if (!active) {
			setIsNight(false);
			return;
		}

		setIsNight(false);
		timerRef.current = window.setTimeout(() => setIsNight(true), 480);

		return () => {
			if (timerRef.current) window.clearTimeout(timerRef.current);
		};
	}, [active]);

	return (
		<div
			className={clsx(
				"hub-mafia-preview mt-4",
				active && "hub-mafia-preview--live",
				isNight && "hub-mafia-preview--night",
			)}
			aria-hidden
		>
			<div className="hub-mafia-preview__phases">
				<span
					className={clsx(
						"hub-mafia-preview__label",
						!isNight && "hub-mafia-preview__label--on",
					)}
				>
					Day
				</span>
				<div className="hub-mafia-preview__track">
					<span className="hub-mafia-preview__thumb" />
				</div>
				<span
					className={clsx(
						"hub-mafia-preview__label",
						isNight && "hub-mafia-preview__label--on",
					)}
				>
					Night
				</span>
			</div>
			<p className="hub-mafia-preview__copy">
				{isNight ?
					"Eyes closed — the town belongs to shadows"
				:	"Gather in person — narrator runs the room"}
			</p>
		</div>
	);
}

function GameArcadeCard({ game, staggerIndex }: GameArcadeCardProps) {
	const cardRef = useRef<HTMLAnchorElement | HTMLDivElement>(null);
	const [hovered, setHovered] = useState(false);
	const [isNavigating, setIsNavigating] = useState(false);
	const canTiltRef = useRef(false);

	useEffect(() => {
		const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
		const update = () => {
			canTiltRef.current = mq.matches;
		};
		update();
		mq.addEventListener("change", update);
		return () => mq.removeEventListener("change", update);
	}, []);

	const handleMove = useCallback(
		(e: React.MouseEvent) => {
			if (!game.active || !canTiltRef.current) return;
			const el = cardRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			const x = (e.clientX - rect.left) / rect.width - 0.5;
			const y = (e.clientY - rect.top) / rect.height - 0.5;
			const rotateX = y * -4;
			const rotateY = x * 4;
			el.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.015) translateY(-4px) translateZ(0)`;
		},
		[game.active],
	);

	const handleLeave = useCallback(() => {
		setHovered(false);
		const el = cardRef.current;
		if (el) el.style.transform = "";
	}, []);

	const handleEnter = useCallback(() => setHovered(true), []);

	const handleNavigate = useCallback(() => {
		if (isNavigating) return;
		setIsNavigating(true);
		markHubGameNavigation(game.id);
	}, [game.id, isNavigating]);

	const cardClass = clsx(
		"hub-game-card hub-enter-card group block rounded-2xl border border-hub-border bg-hub-card p-6 overflow-hidden min-h-[220px]",
		`hub-game-card--${game.id}`,
		game.active && "hub-game-card--active",
		!game.active && "hub-game-card--inactive opacity-70 cursor-not-allowed",
		game.active && hovered && "hub-game-card--hovered",
		isNavigating && "hub-game-card--navigating",
	);

	const inner = (
		<>
			<span className="hub-game-card__glow" aria-hidden />
			<span className="hub-game-card__shine" aria-hidden />

			{game.id === "dominoes" && (
				<>
					<HubDominoTile top={3} bottom={6} className="hub-domino-tile--a" />
					<HubDominoTile top={1} bottom={5} className="hub-domino-tile--b" />
					{game.active &&
						hovered &&
						SPARKS.map((s, i) => (
							<span
								key={i}
								className="hub-domino-spark"
								style={
									{
										left: `${30 + i * 12}%`,
										bottom: "28%",
										animationDelay: s.delay,
										"--sx": s.sx,
										"--sy": s.sy,
									} as React.CSSProperties
								}
								aria-hidden
							/>
						))}
				</>
			)}

			{game.id === "bara-alsalafa" && (
				<span className="hub-bara-spotlight rounded-2xl" aria-hidden />
			)}

			{isNavigating && (
				<div className="hub-game-card__loading" aria-hidden>
					<Loader2 className="hub-game-card__loading-icon w-8 h-8 animate-spin" />
					<span className="hub-game-card__loading-text">Opening…</span>
				</div>
			)}

			<div className="hub-game-card__surface relative">
				<div className="flex items-start justify-between mb-4">
					<div
						className={clsx(
							"hub-game-card__icon w-14 h-14 rounded-xl flex items-center justify-center text-2xl border",
							game.id === "dominoes" &&
								"bg-emerald-500/10 border-emerald-500/25",
							game.id === "wordgame" && "bg-sky-500/10 border-sky-500/25",
							game.id === "bara-alsalafa" &&
								"bg-rose-500/10 border-rose-500/25",
							game.id === "mafia" && "bg-amber-500/10 border-amber-500/25",
						)}
					>
						{game.id === "mafia" ?
							<>
								<span className="hub-mafia-icon-static" aria-hidden>
									{game.icon ?? "🎭"}
								</span>
								<span className="hub-mafia-masks" aria-hidden>
									<span className="hub-mafia-mask hub-mafia-mask--1">🎭</span>
									<span className="hub-mafia-mask hub-mafia-mask--2">🎭</span>
								</span>
							</>
						:	<span
								className={
									game.id === "bara-alsalafa" ? "hub-bara-logo" : undefined
								}
							>
								{game.icon ?? "🎮"}
							</span>
						}
					</div>
					{game.active ?
						<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-hub-success/15 text-hub-success border border-hub-success/25">
							Live
						</span>
					:	<span className="text-xs font-medium px-2.5 py-1 rounded-full bg-hub-border/80 text-hub-muted flex items-center gap-1">
							<Clock className="w-3 h-3" />
							Soon
						</span>
					}
				</div>

				<h4 className="text-xl font-bold mb-2 text-gray-50 group-hover:text-white transition-colors">
					{game.name}
				</h4>
				<p className="text-hub-muted text-sm mb-3 leading-snug line-clamp-2">
					{game.tagline}
				</p>

				{game.id === "wordgame" && (
					<WordPreview active={game.active && hovered} />
				)}

				{game.id === "bara-alsalafa" && (
					<BaraPreview active={game.active && hovered} />
				)}

				{game.id === "mafia" && (
					<MafiaPreview active={game.active && hovered} />
				)}

				{!game.active && game.disabledReason && (
					<p className="text-xs text-hub-warning mb-3">{game.disabledReason}</p>
				)}

				<div className="flex items-center justify-between mt-4 pt-2 border-t border-hub-border/50">
					<span className="text-xs text-hub-muted font-medium">
						{game.players} players
					</span>
					{game.active && (
						<span className="hub-game-card__play flex items-center gap-1.5 text-sm font-semibold">
							<span className="hub-game-card__play-label">Play</span>
							<ArrowRight className="hub-game-card__play-arrow w-4 h-4" />
						</span>
					)}
				</div>
			</div>
		</>
	);

	const style = {
		["--hub-stagger" as string]: staggerIndex,
	} as React.CSSProperties;

	const interactionProps =
		game.active ?
			{
				onMouseMove: handleMove,
				onMouseEnter: handleEnter,
				onMouseLeave: handleLeave,
				"data-hub-cursor": CURSOR_BY_GAME[game.id] ?? "default",
			}
		:	{};

	if (game.active) {
		return (
			<Link
				ref={cardRef as React.RefObject<HTMLAnchorElement>}
				href={game.href}
				className={clsx(
					cardClass,
					"outline-none focus-visible:ring-2 focus-visible:ring-hub-accent",
				)}
				style={style}
				aria-busy={isNavigating}
				onClick={handleNavigate}
				{...interactionProps}
			>
				{inner}
			</Link>
		);
	}

	return (
		<div
			ref={cardRef as React.RefObject<HTMLDivElement>}
			className={cardClass}
			style={style}
			aria-disabled
			{...interactionProps}
		>
			{inner}
		</div>
	);
}

export default memo(GameArcadeCard);
