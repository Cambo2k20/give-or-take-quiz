import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages serves a project site from https://<user>.github.io/<repo>/, so
// every asset URL needs that prefix. Override with BASE_PATH=/ when deploying to
// a custom domain or any host that serves the app from the root.
const base = process.env.BASE_PATH ?? "/give-or-take-quiz/";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
