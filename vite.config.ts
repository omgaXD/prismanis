import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "path";

export default defineConfig({
	root: "web/src",
	base: "/",
	build: {
		outDir: "../out",
		emptyOutDir: true,
		manifest: true,
		rollupOptions: {
			input: {
				main: path.resolve(__dirname, "web/src/ts/main.ts"),
				prismanis: path.resolve(__dirname, "web/src/ts/prismanis/index.ts"),
				cards: path.resolve(__dirname, "web/src/ts/cards/index.ts"),
			},
		},
	},
	plugins: [
		viteStaticCopy({
			targets: [
				{ src: "templates/**/*", dest: "templates" },
				{ src: "static/assets/**/*", dest: "static/assets" },
			],
		}),
	],
	server: {
		// Allow the backend (running on a different port) to request scripts
		cors: true,
		origin: "http://localhost:5173",
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./web/src"),
		},
	},
});
