// Tauri SPA: nincs SSR, minden a webview-ban renderelődik; az adapter-static
// index.html fallbackje szolgálja ki (prerender nélkül — SvelteKit SPA-mód).
export const ssr = false;
