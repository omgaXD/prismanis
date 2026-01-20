import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "path";

export default defineConfig({
	// Root of the source code
	root: "web/src",
	base: "/",
	build: {
		// Output directory relative to the project root (not the config root)
		outDir: "../out",
		emptyOutDir: true,
		manifest: true, // Generate manifest.json for the backend
		rollupOptions: {
			// The entry point for the application
			input: {
				main: path.resolve(__dirname, "web/src/ts/main.ts"),
				prismanis: path.resolve(__dirname, "web/src/ts/prismanis/index.ts"),
			},
		},
	},
	plugins: [
		viteStaticCopy({
			targets: [
				// Copy templates so the production backend can find them in one place
				{ src: "templates/**/*", dest: "templates" },
				// Copy other static assets
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
