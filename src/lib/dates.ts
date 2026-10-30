const pad = (n: number) => String(n).padStart(2, "0");

// The visitor's local calendar day as "YYYY-MM-DD". Browser-only: the server runs in UTC.
export const localDateKey = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function fmtMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// A month as a Monday-first grid padded to whole weeks. `m` is 0-11; each cell's key is a local "YYYY-MM-DD".
export function monthGrid(y: number, m: number) {
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const total = Math.ceil((lead + days) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(y, m, 1 - lead + i);
    return { key: localDateKey(d), day: d.getDate(), inMonth: d.getMonth() === m };
  });
}
