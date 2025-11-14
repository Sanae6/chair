// See https://svelte.dev/docs/kit/types#app.d.ts

import type { WebSocketServer } from "ws";

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			wss?: ExtendedWebSocketServer;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	let wss: WebSocketServer;
}

export { };
