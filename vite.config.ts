import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { createServer, handleUpgrade } from "./src/lib/server/websocket.startup";

// const configureServer = async (server: { ssrLoadModule: (value: any) => any, httpServer: any }) => {
// 	// this is stupid but there's not really another way to load the websocket server which uses $lib.
// 	// $lib is important for loading the websocket server, but resolution doesn't change for this file, so we can't just rely on import :/
// 	const module = await server.ssrLoadModule("$lib/server/websocket.server");
// 	(server as any).wss = new module.Server(server.httpServer);
// }

export default defineConfig({
	server: {
		hmr: {
			port: 5174,
		},
		allowedHosts: true
	},
	plugins: [
		tailwindcss(),
		sveltekit(),
		devtoolsJson(),
		{
			name: "websocket server",
			async configureServer(server) {
				console.log("servering");
				server.httpServer?.on("upgrade", handleUpgrade);
			}
		}
	]
});
