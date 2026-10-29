import type { NextRequest } from "next/server";
import { deleteType } from "@/db/workout-types";
import { isUuid } from "@/db/workouts";
import { currentUserId, json } from "@/lib/api";

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/workout-types/[id]">) {
  const userId = await currentUserId();
  if (!userId) return json({ error: "Sign in first" }, 401);

  const { id } = await ctx.params;
  if (!isUuid(id)) return json({ error: "Invalid id" }, 400);

  return (await deleteType(userId, id)) ? json({ ok: true }) : json({ error: "Not found" }, 404);
}
