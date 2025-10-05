import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

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
			hotUpdate(hmr) {
				// to always update the websocket server, just restart the server.
				// this sucks ass but Here We Are.
				// hmr.server.restart();
				// (hmr.server as any).wss.kill()
				// return []
			},
			async configureServer(server) {
				// this is stupid but there's not really another way to load the websocket server which uses $lib.
				// $lib is important for loading the websocket server, but resolution doesn't change for this file, so we can't just rely on import :/
				const module = await server.ssrLoadModule("$lib/server/websocket.server");
				(server as any).wss = new module.Server(server);
			}
		}
	]
});
