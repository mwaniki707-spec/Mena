// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // Static SPA: prerender only the app shell, render everything else client-side.
    // This lets the app deploy as static files (e.g. Firebase Hosting Spark plan).
    spa: { enabled: true },
  },
  // Skip Nitro entirely: TanStack Start's own post-build prerender emits the SPA
  // shell as static files (no server runtime), which is all Firebase Hosting needs.
  nitro: false,
});
