/**
 * Unified socket event execution pipeline with rate-limit, auth, and validation guards.
 */

import { verifyPlayerSession } from "./session.js";

/**
 * @param {import('socket.io').Socket} socket
 * @param {unknown} payload
 * @param {import('./eventRegistry.js').EventConfig} eventConfig
 * @param {import('./RoomManager.js').RoomManager} roomManager
 * @param {(result?: object) => void} [ack]
 */
export async function executeSecureEvent(
	socket,
	payload,
	eventConfig,
	roomManager,
	ack,
) {
	const {
		rateLimit,
		actionKey,
		requiresAuth,
		requiresRegistered,
		validate,
		handler,
		emitGameError,
		validationToast = false,
	} = eventConfig;

	if (rateLimit && actionKey) {
		const ok = roomManager.checkRateLimit(socket.id, actionKey, rateLimit);
		if (!ok) {
			socket.emit("protocol:error", {
				code: "RATE_LIMIT",
				message: "Too many requests, slow down",
				action: actionKey,
			});
			ack?.({ error: "Too many requests, slow down" });
			return;
		}
	}

	if (requiresRegistered) {
		const playerId = roomManager.socketToPlayer?.get(socket.id);
		if (!playerId) {
			socket.emit("protocol:error", {
				code: "NOT_REGISTERED",
				message: "Not registered",
			});
			ack?.({ error: "Not registered" });
			return;
		}
	}

	if (requiresAuth) {
		const playerId =
			payload && typeof payload === "object" && !Array.isArray(payload) ?
				payload.playerId
			:	undefined;
		const sessionToken =
			payload && typeof payload === "object" && !Array.isArray(payload) ?
				payload.sessionToken
			:	undefined;
		if (playerId && sessionToken) {
			const session = verifyPlayerSession(
				roomManager.playerSessions,
				playerId,
				sessionToken,
			);
			if (session.error) {
				socket.emit("protocol:error", {
					code: "SESSION_INVALID",
					message: session.error,
				});
				ack?.({ error: session.error });
				return;
			}
		}
	}

	if (validate) {
		const err = validate(payload);
		if (err) {
			if (validationToast) {
				socket.emit("protocol:error", {
					code: "VALIDATION",
					message: err,
				});
			}
			ack?.({ error: err });
			return;
		}
	}

	const result = await handler(socket, payload, roomManager);
	if (result?.error) {
		if (emitGameError) {
			socket.emit("game:error", { message: result.error });
		}
		ack?.({ error: result.error });
		return;
	}
	ack?.({ success: true, ...result });
}
