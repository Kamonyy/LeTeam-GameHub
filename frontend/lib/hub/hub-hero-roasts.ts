import { gameLabelForPresence } from "./groupOnlinePlayers";
import type { OnlinePlayer, OnlinePlayerStatus } from "./types";

export type RoastContext = {
	name: string;
	game: string | null;
	status: OnlinePlayerStatus;
};

type RoastLine = (ctx: RoastContext) => string;

/** Sarcastic lounge copy — keep playful, not personal attacks. */
const HUB_ROASTS: RoastLine[] = [
	(ctx) =>
		`${ctx.name} is loitering in the lounge like Wi‑Fi with commitment issues — pick a cabinet already.`,
	(ctx) =>
		`${ctx.name} opened the hub, saw multiplayer, and chose emotional support in the lobby instead.`,
	(ctx) =>
		`Lounge report: ${ctx.name} is online. Skill issue still buffering at 0%.`,
	(ctx) =>
		`${ctx.name} has been circling rooms longer than some people stay in relationships.`,
	(ctx) =>
		`Breaking: ${ctx.name} still hasn't dealt a room. The arcade runs on audacity, not hesitation.`,
	(ctx) =>
		`${ctx.name} joined to "hang out," which is gamer code for wasting bandwidth with confidence.`,
	(ctx) =>
		`If indecision were ranked, ${ctx.name} would be grandmaster — no cap, no room.`,
	(ctx) =>
		`${ctx.name} is one more refresh away from becoming a permanent loading screen.`,
	(ctx) =>
		`Everyone be nice — ${ctx.name} is practicing losing in public. They're fragile.`,
	(ctx) =>
		`${ctx.name}'s lobby is a museum exhibit: "Why did I think they'd join?"`,
	(ctx) =>
		`${ctx.name} treats the hub like a green room for a show that keeps getting cancelled.`,
	(ctx) =>
		`Lounge update: ${ctx.name} is here. Like a fire alarm that only rings for disappointment.`,
	(ctx) =>
		`${ctx.name} logged in just to breathe the same air as people who actually click Create.`,
	(ctx) =>
		`${ctx.name} is "in a match"${ctx.game ? ` on ${ctx.game}` : ""} — generous label for what's probably happening.`,
	(ctx) =>
		`${ctx.name} picked ${ctx.game ?? "a game"} like it would fix their decision-making. Spoiler: it won't.`,
	(ctx) =>
		`${ctx.name} is in a lobby waiting for friends. Bold of them to assume they have any.`,
];

function shuffle<T>(items: T[]): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j]!, copy[i]!];
	}
	return copy;
}

function roastContext(player: OnlinePlayer): RoastContext {
	const game =
		player.gameType && player.status !== "hub" ?
			gameLabelForPresence(player.gameType)
		:	null;
	return {
		name: player.displayName,
		game,
		status: player.status,
	};
}

/**
 * Pick random roast lines for the hub ticker (personalized to online players).
 * @param players Everyone currently visible in hub presence (excluding self is server-side optional)
 * @param count How many roasts to inject per presence snapshot
 */
export function sampleRoastLines(players: OnlinePlayer[], count = 4): string[] {
	if (players.length === 0 || HUB_ROASTS.length === 0) return [];

	const pool = shuffle(HUB_ROASTS);
	const take = Math.min(count, pool.length);
	const targets = shuffle(players);

	return pool.slice(0, take).map((line, i) => {
		const ctx = roastContext(targets[i % targets.length]!);
		return `• ${line(ctx)}`;
	});
}
