// PreToolUse hook: git commit elott automatikus typecheck (dagchat-minta).
// No-op, ha nincs package.json vagy nincs typecheck script — igy statikus
// projektekben is artalmatlan.
const input = await new Response(process.stdin).text();
let command = "";
try {
  command = JSON.parse(input)?.tool_input?.command ?? "";
} catch {
  process.exit(0);
}
if (!/\bgit\b[^|;&]*\bcommit\b/.test(command)) process.exit(0);

const pkgFile = Bun.file("package.json");
if (!(await pkgFile.exists())) process.exit(0);
let scripts = {};
try {
  scripts = JSON.parse(await pkgFile.text())?.scripts ?? {};
} catch {
  process.exit(0);
}
if (!scripts.typecheck) process.exit(0);

const proc = Bun.spawnSync(["bun", "run", "typecheck"], { stdout: "pipe", stderr: "pipe" });
if (proc.exitCode !== 0) {
  console.error(
    "Typecheck FAILED — a commit blokkolva:\n" +
      new TextDecoder().decode(proc.stdout) +
      new TextDecoder().decode(proc.stderr),
  );
  process.exit(2);
}
process.exit(0);
