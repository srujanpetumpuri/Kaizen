// Shared by the API, the database layer and the planner UI (pure: no database or browser access).

// A schedule is a calendar of tasks for one topic. Every schedule has its own topic, and a topic
// can only have one schedule.
export type Schedule = {
  id: string; // uuid from the database, "g-…" for guest schedules
  topicId: string | null; // the shared topic row; null for guest schedules (they never leave the browser)
  topic: string;
  color: string; // hex, from the topic
};

export const MAX_SCHEDULES = 12;
export const DEFAULT_SCHEDULE_TOPIC = "Workouts";

/* ---------- clash detection ---------- */

export type Slot = {
  id: string;
  date: string; // YYYY-MM-DD
  scheduleId: string | null;
  startMinutes: number | null; // minutes from midnight, null = no set time
  durationMinutes: number;
};

// Tasks in OTHER schedules that overlap `task` in time. Tasks without a set time can't clash,
// and two tasks in the same schedule are left alone (the calendar already lays those side by side).
// Back-to-back tasks (one ends exactly when the next starts) don't count as a clash.
export function findClashes<T extends Slot>(task: Slot, others: readonly T[]): T[] {
  if (task.startMinutes == null) return [];
  const start = task.startMinutes;
  const end = start + task.durationMinutes;
  return others.filter(
    (o) =>
      o.id !== task.id &&
      o.date === task.date &&
      o.scheduleId !== task.scheduleId &&
      o.startMinutes != null &&
      o.startMinutes < end &&
      start < o.startMinutes + o.durationMinutes
  );
}
