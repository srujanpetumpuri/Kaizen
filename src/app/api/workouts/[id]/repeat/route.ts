import type { NextRequest } from "next/server";
import { isUuid, repeatWorkout } from "@/db/workouts";
import { currentUserId, json } from "@/lib/api";

// body: { frequency: "daily" | "weekly", interval: 1-4, days: number[] (0 = Mon … 6 = Sun), until: "YYYY-MM-DD" }
export async function POST(req: NextRequest, ctx: RouteContext<"/api/workouts/[id]/repeat">) {
  const userId = await currentUserId();
  if (!userId) return json({ error: "Sign in to edit your plan" }, 401);

  const { id } = await ctx.params;
  if (!isUuid(id)) return json({ error: "Invalid id" }, 400);

  const result = await repeatWorkout(userId, id, await req.json().catch(() => null));
  if (!result.ok) return json({ error: result.error }, result.status);
  return json({ seriesId: result.seriesId, created: result.created }, 201);
}
