import { defineConfig } from "vitest/config";
import { sveltekit } from "@sveltejs/kit/vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [sveltekit()],

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
  },
}));
