import { building } from "$app/environment";
import { Server } from "$lib/server/websocket.server";
import { createServer } from "$lib/server/websocket.startup";
import type { Handle } from "@sveltejs/kit";
import type { WebSocketServer } from "ws";

let initialized = false;

export const handle = (async ({ event, resolve }) => {
  // Skip WebSocket server when pre-rendering pages
  if (!building) {
    createServer();
    
    if (wss !== undefined) {
      event.locals.wss = wss;
      if (!initialized) {
        initialized = true;
        new Server();
      }
    }

  }
  const response = await resolve(event, {
    filterSerializedResponseHeaders: name => name === 'content-type',
  });
  return response;
}) satisfies Handle;
