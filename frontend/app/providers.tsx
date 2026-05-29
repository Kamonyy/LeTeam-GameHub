"use client";

import type { ReactNode } from "react";
import { SocketProvider } from "@/lib/hub/SocketProvider.jsx";
import { ViewTransitionProvider } from "@/lib/hub/ViewTransitionProvider";
import { ClientStorageProvider } from "@/lib/session/ClientStorageContext";
import StuckResetButton from "@/components/shared/StuckResetButton";

/**
 * Provider order (outer → inner):
 * ViewTransitionProvider — InvitationProvider (inside Socket) uses useViewNavigator.
 * SocketProvider — realtime hub + game state.
 * ClientStorageProvider — gates page UI until local session is ready; socket still connects above.
 */
export default function Providers({ children }: { children: ReactNode }) {
	const app = (
		<>
			<StuckResetButton />
			<ClientStorageProvider children={children} />
		</>
	);

	return (
		<ViewTransitionProvider children={<SocketProvider children={app} />} />
	);
}
