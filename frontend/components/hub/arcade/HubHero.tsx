"use client";

import { useEffect, useMemo, useState } from "react";
import { Zap, Radio } from "lucide-react";
import { GAMES } from "@/lib/hub/games-registry";
import { sampleRoastLines } from "@/lib/hub/hub-hero-roasts";
import { gameLabelForPresence } from "@/lib/hub/groupOnlinePlayers";
import type { HubPresenceState } from "@/lib/hub/types";

interface HubHeroProps {
	connected: boolean;
	hubPresence: HubPresenceState;
}

const TICKER_BASE_MS = 5000;
const TICKER_ROAST_EXTRA_MS = 1000;

type TickerMessage = {
	text: string;
	isRoast: boolean;
};

function tickerLine(text: string, isRoast = false): TickerMessage {
	return { text, isRoast };
}

function formatGameNameList(names: string[]): string {
	if (names.length === 0) return "";
	if (names.length === 1) return names[0]!;
	if (names.length === 2) return `${names[0]} & ${names[1]}`;
	return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]!}`;
}

export default function HubHero({ connected, hubPresence }: HubHeroProps) {
	const [messageIndex, setMessageIndex] = useState(0);

	const liveGameNames = useMemo(
		() => GAMES.filter((g) => g.active).map((g) => g.name),
		[],
	);
	const soonGameNames = useMemo(
		() => GAMES.filter((g) => !g.active).map((g) => g.name),
		[],
	);

	const messages = useMemo(() => {
		const list: TickerMessage[] = [];
		if (hubPresence.total > 0) {
			list.push(
				tickerLine(
					`• ${hubPresence.total} ${hubPresence.total === 1 ? "player" : "players"} in the arcade lounge`,
				),
			);
			for (const p of hubPresence.players.slice(0, 2)) {
				const where =
					p.status === "playing" ? "in a match"
					: p.status === "lobby" ? "in a lobby"
					: "in the lounge";
				const gameLabel =
					p.gameType && p.status !== "hub" ?
						gameLabelForPresence(p.gameType)
					:	null;
				list.push(
					tickerLine(
						gameLabel ?
							`• ${p.displayName} is ${where} — ${gameLabel}`
						:	`• ${p.displayName} is ${where}`,
					),
				);
			}
			for (const roast of sampleRoastLines(hubPresence.players, 5)) {
				list.push(tickerLine(roast, true));
			}
		} else if (connected) {
			list.push(
				tickerLine("• The lounge is quiet — be the first to deal a room"),
			);
		} else {
			list.push(tickerLine("• Connecting to the live hub…"));
		}
		if (liveGameNames.length > 0) {
			const n = liveGameNames.length;
			list.push(
				tickerLine(
					`• ${n} live ${n === 1 ? "cabinet" : "cabinets"} — ${formatGameNameList(liveGameNames)}`,
				),
			);
		}
		if (soonGameNames.length > 0) {
			list.push(
				tickerLine(`• ${formatGameNameList(soonGameNames)} in the workshop`),
			);
		}
		list.push(tickerLine("• Create a room, share the code, play in seconds"));
		return list;
	}, [connected, hubPresence, liveGameNames, soonGameNames]);

	const presenceKey = useMemo(
		() =>
			`${hubPresence.total}:${hubPresence.players
				.map((p) => `${p.id}:${p.displayName}:${p.status}`)
				.join("|")}`,
		[hubPresence],
	);

	useEffect(() => {
		setMessageIndex(0);
	}, [presenceKey]);

	const safeIndex = messages.length > 0 ? messageIndex % messages.length : 0;
	const currentMessage = messages[safeIndex];

	useEffect(() => {
		if (!currentMessage || messages.length === 0) return;

		const delayMs =
			currentMessage.isRoast ?
				TICKER_BASE_MS + TICKER_ROAST_EXTRA_MS
			:	TICKER_BASE_MS;

		const id = window.setTimeout(() => {
			setMessageIndex((i) => (i + 1) % messages.length);
		}, delayMs);

		return () => window.clearTimeout(id);
	}, [currentMessage, messages.length, safeIndex]);

	const statusText = currentMessage?.text ?? "";

	return (
		<section className="hub-enter-hero flex-1 min-w-0 text-center lg:text-left py-8 lg:py-12">
			<p className="text-xs uppercase tracking-[0.35em] text-hub-muted mb-4 font-medium">
				Digital Arcade Lounge
			</p>
			<h2 className="hub-hero-title text-4xl sm:text-5xl lg:text-6xl font-bold mb-5">
				Play together, instantly
			</h2>
			<p className="text-hub-muted text-lg max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
				Real-time multiplayer in your browser. Pick a cabinet, summon friends,
				and jump in.
			</p>

			<div className="hub-ticker-pill inline-flex items-center gap-3 px-4 py-2.5 rounded-full max-w-full">
				<span className="hub-ticker-dot relative flex h-2.5 w-2.5 shrink-0">
					<span className="absolute inline-flex h-full w-full rounded-full bg-hub-success opacity-60 animate-ping" />
					<span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-hub-success" />
				</span>
				<span className="flex items-center gap-2 text-sm text-gray-300 min-w-0">
					<Radio className="w-3.5 h-3.5 text-hub-accent shrink-0" aria-hidden />
					<span key={safeIndex} className="hub-ticker-text truncate">
						{statusText}
					</span>
				</span>
			</div>

			<div className="flex justify-center lg:justify-start gap-8 text-sm text-hub-muted mt-8">
				<span className="flex items-center gap-2">
					<Zap className="w-4 h-4 text-hub-accent" />
					Low latency sockets
				</span>
				<span className="flex items-center gap-2">
					<span className="w-2 h-2 rounded-full bg-hub-success animate-pulse" />
					Live hub
				</span>
			</div>
		</section>
	);
}
