// PostToolUse hook: az iment szerkesztett EGYETLEN fajlt formazza.
// Cel a token-sporolas: enelkul a projekt-szintu `dart format .` / `cargo fmt`
// tucatnyi fajlt ir at egyszerre, amirol a rendszer nagy "a fajl modosult"
// emlekeztetoket injektal a kontextusba. A fajlonkenti formazas ezt megszunteti.
// No-op, ha a fajlhoz nincs ismert + elerheto formazo — igy minden projektben artalmatlan.

import { existsSync } from "node:fs";

const WEB_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".svelte", ".json", ".jsonc", ".css", ".scss", ".html", ".md",
]);

/**
 * A fajlhoz tartozo formazo-argv, vagy null ha nincs (kepesseg-fuggo).
 * caps: { has: (cmd) => boolean, localPrettier: boolean }
 */
export function formatterFor(filePath, caps) {
  if (!filePath) return null;
  const dot = filePath.lastIndexOf(".");
  if (dot < 0) return null;
  const ext = filePath.slice(dot).toLowerCase();
  // kanonikus, nulla-konfiguracios beepitett formazok — mindig futnak, ha van eszkoz
  if (ext === ".dart") return caps.has("dart") ? ["dart", "format", filePath] : null;
  if (ext === ".rs") return caps.has("rustfmt") ? ["rustfmt", filePath] : null;
  // JS/web: nincs kanonikus beepitett formazo — csak ha a projekt telepitette a prettiert
  if (WEB_EXTS.has(ext) && caps.localPrettier) return ["bunx", "prettier", "--write", filePath];
  return null;
}

if (import.meta.main) {
  const input = await new Response(process.stdin).text();
  let filePath = "";
  try {
    filePath = JSON.parse(input)?.tool_input?.file_path ?? "";
  } catch {
    process.exit(0);
  }
  if (!filePath || !existsSync(filePath)) process.exit(0);

  const caps = {
    has: (cmd) => Bun.which(cmd) !== null,
    localPrettier: existsSync("node_modules/prettier"),
  };
  const argv = formatterFor(filePath, caps);
  if (!argv) process.exit(0);

  // csendes es soha nem blokkolo: a formazas hibaja (pl. felkesz szintaxis) nem all utba
  Bun.spawnSync(argv, { stdout: "ignore", stderr: "ignore" });
  process.exit(0);
}
