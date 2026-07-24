// PÉLDA pure-core modul: se Tauri-, se Svelte-import — Node alatt tesztelhető.
// Az érdemi logika ilyen modulokba menjen, kolokált *.test.ts-sel.

/** Másodpercek → tömör "1:23:45" / "3:07" formátum. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
