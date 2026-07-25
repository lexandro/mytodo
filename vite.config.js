import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";
import { sveltekit } from "@sveltejs/kit/vite";

const host = process.env.TAURI_DEV_HOST;

/** @type {{ version: string }} */
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/** Short HEAD hash; "unknown" outside a git checkout (e.g. a source tarball). */
function gitCommit() {
  try {
    return execSync("git rev-parse --short=7 HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

// Build metadata for the About dialog (src/lib/build-info.ts). Only the
// release workflow sets MYTODO_BUILD_CHANNEL=release for its tag builds —
// every other build (local build.bat, CI, dev server) stays a dev build and
// shows the -dev version suffix.
const buildInfo = {
  version: pkg.version,
  channel: process.env.MYTODO_BUILD_CHANNEL === "release" ? "release" : "dev",
  commit: gitCommit(),
  builtAt: new Date().toISOString(),
};

export default defineConfig(async () => ({
  plugins: [sveltekit()],

  define: {
    __MYTODO_BUILD__: JSON.stringify(buildInfo),
  },

  // a pure-core tesztek környezet-függetlenek; komponens-tesztekhez később
  // jsdom + @testing-library/svelte vehető fel
  test: {
    environment: "node",
  },

  // Tauri-fejlesztéshez szabott Vite-opciók:
  // 1. a Rust-hibákat ne takarja el a képernyőtörlés
  clearScreen: false,
  // 2. a Tauri fix portot vár — foglalt portnál bukjon, ne váltson
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. az src-tauri változásait a cargo figyeli, ne a Vite
      ignored: ["**/src-tauri/**"],
    },
    fs: {
      // The About dialog imports the real app icon, so the dev server must be
      // allowed to serve that one folder (SvelteKit's allow list stops at
      // src/). Production builds bundle it as an asset and need no exception.
      allow: ["src-tauri/icons"],
    },
  },
}));
