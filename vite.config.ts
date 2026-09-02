// Vite & TanStack Start configuration
// Plugins include: TanStack devtools, tanstackStart, viteReact, tailwindcss, tsConfigPaths,
// nitro build integration, VITE_* env injection, @ path alias, and React/TanStack dedupe.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: process.env.VERCEL ? "vercel" : undefined,
  },
});
