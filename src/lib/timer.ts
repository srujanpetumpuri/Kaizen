export type Mode = "focus" | "short" | "long";

export const MODES: Record<Mode, { label: string; minutes: number }> = {
  focus: { label: "Focus", minutes: 25 },
  short: { label: "Short", minutes: 5 },
  long: { label: "Long", minutes: 10 },
};

// Local calendar day as YYYY-MM-DD (no timezone conversion)
export function localDate(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}