// Plans for visitors who aren't signed in live in this browser's localStorage instead of the database.
// Every read/write is wrapped: private mode or blocked storage must never break the page.

export function readGuest<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.items)) return data.items;
    }
  } catch {
    /* corrupt or unavailable: start empty */
  }
  return [];
}

// returns false when the browser refused to store it (quota, private mode)
export function writeGuest<T>(key: string, items: T[]): boolean {
  try {
    localStorage.setItem(key, JSON.stringify({ items }));
    return true;
  } catch {
    return false;
  }
}

export const GUEST_WORKOUTS_KEY = "kaizen-guest-workouts";
export const GUEST_SCHEDULES_KEY = "kaizen-guest-schedules";

export const newGuestId = () =>
  `g-${typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

// "tmp-…" marks an entry that is still being saved to the server
export const newTempId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
