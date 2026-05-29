/** Hub + game socket event wiring (shared by Worker and local server). */

import { ALL_EVENTS } from "./eventRegistry.js";
import { executeSecureEvent } from "./executeSecureEvent.js";

export function registerHandlers(socket, roomManager) {
	for (const config of ALL_EVENTS) {
		socket.on(config.event, (payload, ack) => {
			executeSecureEvent(socket, payload, config, roomManager, ack);
		});
	}

	socket.on("disconnect", () => {
		roomManager.handleDisconnect(socket);
	});
}
