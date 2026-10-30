// Gems are earned per day: every full cycle (4 focus rounds of 25 minutes) completed that day
// upgrades the day's gem. Pure data and maths, shared by the server query and the calendar.

export const FOCUS_MINUTES = 25; // a focus round only counts toward a cycle if it ran the full length
export const CYCLE_SESSIONS = 4; // focus rounds in one cycle

export type Gem = {
  cycles: number; // cycles needed to earn it (the last gem is also earned by any higher count)
  name: string;
  src: string; // file in /public
  color: string; // stand-in shown if the image is missing
};

// Ordered from 1 cycle up. The filenames must match the images in /public exactly.
export const GEMS: readonly Gem[] = [
  { cycles: 1, name: "Aqua", src: "/Aqua_cyan.png", color: "#35c9d6" },
  { cycles: 2, name: "Amethyst", src: "/Amethyst_Purple.png", color: "#8e5bd6" },
  { cycles: 3, name: "Amber", src: "/Amber_Orange.png", color: "#f0902c" },
  { cycles: 4, name: "Obsidian", src: "/Obsidian_black.png", color: "#1b1b24" },
  { cycles: 5, name: "Crystal cluster", src: "/Cystal_cluster_blue.png", color: "#4a86e8" },
];

// full cycles in a day's worth of completed focus rounds (leftover rounds don't count yet)
export const cyclesFrom = (sessions: number) => Math.floor(Math.max(0, sessions) / CYCLE_SESSIONS);

// the day's gem: none below one cycle, and five or more cycles all earn the top gem
export function gemFor(cycles: number): Gem | null {
  if (cycles < 1) return null;
  return GEMS[Math.min(Math.floor(cycles), GEMS.length) - 1];
}
