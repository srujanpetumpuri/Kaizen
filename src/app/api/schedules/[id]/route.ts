import type { NextRequest } from "next/server";
import { deleteSchedule } from "@/db/schedules";
import { isUuid } from "@/db/workouts";
import { currentUserId, json } from "@/lib/api";

// Deletes the schedule and every task in it. A user's last schedule can't be deleted.
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/schedules/[id]">) {
  const userId = await currentUserId();
  if (!userId) return json({ error: "Sign in to edit your schedules" }, 401);

  const { id } = await ctx.params;
  if (!isUuid(id)) return json({ error: "Invalid id" }, 400);

  const result = await deleteSchedule(userId, id);
  if (result === "not_found") return json({ error: "Not found" }, 404);
  if (result === "last") return json({ error: "Keep at least one schedule." }, 409);
  return json({ ok: true });
}
