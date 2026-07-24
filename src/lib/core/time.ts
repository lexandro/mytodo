// Timestamp rendering per DESIGN.md: "Today 09:21" / "Yesterday 18:11" /
// "Mar 4 10:03". `now` is injected for testability.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 86_400_000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatTimestamp(ts: number, now: number): string {
  const date = new Date(ts);
  const hm = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  if (ts >= todayStart.getTime()) return `Today ${hm}`;
  if (ts >= todayStart.getTime() - DAY_MS) return `Yesterday ${hm}`;
  return `${MONTHS[date.getMonth()]} ${date.getDate()} ${hm}`;
}
