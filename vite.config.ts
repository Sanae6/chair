import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { websocketServer } from './src/lib/server/websocket.server';

export default defineConfig({
	server: {
		hmr: {
			port: 5174,
		},
	},
	plugins: [
		tailwindcss(),
		sveltekit(),
		devtoolsJson(),
		websocketServer
	]
});
