"use server";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { focusSessions, topics } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function listTopics() {
  const s = await getSession();
  if (!s) return [];
  return db
    .select({ id: topics.id, name: topics.name, color: topics.color })
    .from(topics)
    .where(eq(topics.userId, s.user.id))
    .orderBy(asc(topics.name));
}

export async function createTopic(name: string, color: string) {
  const s = await getSession();
  if (!s) return { ok: false as const, error: "Sign in to add topics" };
  const clean = name.trim().slice(0, 40);
  if (!clean) return { ok: false as const, error: "Name required" };
  const [row] = await db
    .insert(topics)
    .values({ userId: s.user.id, name: clean, color })
    .onConflictDoNothing()
    .returning({ id: topics.id, name: topics.name, color: topics.color });
  if (!row) return { ok: false as const, error: "Topic already exists" };
  return { ok: true as const, topic: row };
}

export async function logFocusSession(input: {
  topicId: string | null;
  durationMinutes: number; // real elapsed minutes
  date: string; // YYYY-MM-DD, from the client's local clock
}) {
  const s = await getSession();
  if (!s) return { ok: false as const, error: "guest" };

  const minutes = Math.round(input.durationMinutes);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180)
    return { ok: false as const, error: "Invalid duration" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date))
    return { ok: false as const, error: "Invalid date" };

  // Only accept a topic that belongs to this user
  let topicId: string | null = null;
  if (input.topicId) {
    const [t] = await db
      .select({ id: topics.id })
      .from(topics)
      .where(and(eq(topics.id, input.topicId), eq(topics.userId, s.user.id)));
    topicId = t?.id ?? null;
  }

  await db.insert(focusSessions).values({
    userId: s.user.id,
    topicId,
    durationMinutes: minutes,
    date: input.date,
  });
  return { ok: true as const };
}