import type { NextRequest } from "next/server";
import { createType, listTypes, parseTypeInput } from "@/db/workout-types";
import { MAX_CUSTOM_TYPES } from "@/lib/workout-glyphs";
import { currentUserId, json } from "@/lib/api";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return json({ error: "Sign in to see your icons" }, 401);
  return json(await listTypes(userId));
}

export async function POST(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return json({ error: "Sign in to create icons" }, 401);

  const parsed = parseTypeInput(await req.json().catch(() => null));
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  const row = await createType(userId, parsed.value);
  if (!row) return json({ error: `You can have up to ${MAX_CUSTOM_TYPES} custom icons. Delete one first.` }, 400);
  return json(row, 201);
}
