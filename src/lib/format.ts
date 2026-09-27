// Small display helpers.

// SQLite stores "2026-09-26 10:30:00" (UTC) → "26 Sep 2026"
export function formatDate(sqliteDate: string): string {
  return new Date(sqliteDate.replace(" ", "T") + "Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// 169 → "2:49"
export function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

// "EAC9koXp…t36Um"
export function shortAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
