const pad = (n: number) => String(n).padStart(2, "0");

// The visitor's local calendar day as "YYYY-MM-DD". Browser-only: the server runs in UTC.
export const localDateKey = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function fmtMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}
