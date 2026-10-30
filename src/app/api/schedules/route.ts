import type { NextRequest } from "next/server";
import { createSchedule, listSchedules } from "@/db/schedules";
import { currentUserId, json } from "@/lib/api";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return json({ error: "Sign in to view your schedules" }, 401);
  return json(await listSchedules(userId));
}

// body: { topic: string } — makes the topic if it's new; 409 when that topic already has a schedule
export async function POST(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return json({ error: "Sign in to create schedules" }, 401);

  const body = await req.json().catch(() => null);
  const result = await createSchedule(userId, body?.topic);
  if (!result.ok) return json({ error: result.error }, result.status);
  return json(result.schedule, 201);
}
