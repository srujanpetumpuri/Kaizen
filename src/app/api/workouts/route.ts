import type { NextRequest } from "next/server";
import { createWorkout, isDateKey, listWorkouts, parseEntryInput } from "@/db/workouts";
import type { WorkoutEntryInput } from "@/db/workouts";
import { ownsType } from "@/db/workout-types";
import { currentUserId, json } from "@/lib/api";

export async function GET(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return json({ error: "Sign in to view your plan" }, 401);

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!isDateKey(from) || !isDateKey(to)) return json({ error: "from and to must be YYYY-MM-DD" }, 400);

  return json(await listWorkouts(userId, from, to));
}

export async function POST(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return json({ error: "Sign in to plan workouts" }, 401);

  const parsed = parseEntryInput(await req.json().catch(() => null), false);
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  const v = parsed.value;
  const entry: WorkoutEntryInput = {
    date: v.date!,
    category: v.category ?? null,
    typeId: v.typeId ?? null,
    title: v.title ?? null,
    notes: v.notes ?? null,
    startMinutes: v.startMinutes ?? null,
    durationMinutes: v.durationMinutes ?? 60,
    completed: v.completed ?? false,
  };
  if (entry.typeId !== null && !(await ownsType(userId, entry.typeId))) return json({ error: "Unknown icon" }, 400);
  return json(await createWorkout(userId, entry), 201);
}
