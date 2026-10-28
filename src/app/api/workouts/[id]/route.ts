import type { NextRequest } from "next/server";
import { deleteWorkout, isUuid, parseEntryInput, updateWorkout, type DeleteScope } from "@/db/workouts";
import { currentUserId, json } from "@/lib/api";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/workouts/[id]">) {
  const userId = await currentUserId();
  if (!userId) return json({ error: "Sign in to edit your plan" }, 401);

  const { id } = await ctx.params;
  if (!isUuid(id)) return json({ error: "Invalid id" }, 400);

  const parsed = parseEntryInput(await req.json().catch(() => null), true);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  if (Object.keys(parsed.value).length === 0) return json({ error: "Nothing to update" }, 400);

  const row = await updateWorkout(userId, id, parsed.value);
  return row ? json(row) : json({ error: "Not found" }, 404);
}

// ?scope=this (default) | following | all — the last two remove the rest of a repeat series too
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/workouts/[id]">) {
  const userId = await currentUserId();
  if (!userId) return json({ error: "Sign in to edit your plan" }, 401);

  const { id } = await ctx.params;
  if (!isUuid(id)) return json({ error: "Invalid id" }, 400);

  const scope = (req.nextUrl.searchParams.get("scope") ?? "this") as DeleteScope;
  if (!["this", "following", "all"].includes(scope)) return json({ error: "Invalid scope" }, 400);

  return (await deleteWorkout(userId, id, scope)) ? json({ ok: true }) : json({ error: "Not found" }, 404);
}
