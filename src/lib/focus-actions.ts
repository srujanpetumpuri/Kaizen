"use server";

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { focusSessions, topics } from "@/db/schema";
import { getSession } from "@/lib/session";
import { FOCUS_MINUTES } from "@/lib/gems";
import { TOPIC_COLORS } from "@/lib/topic-colors";

export type Topic = { id: string; name: string; color: string };
export type TopicStat = { topicId: string | null; name: string; color: string; minutes: number; sessions: number };
export type DaySessions = { date: string; sessions: number };
export type TodayStats = { totalMinutes: number; sessions: number; byTopic: TopicStat[] };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function userId() {
  const session = await getSession();
  return session?.user.id ?? null;
}

export async function getTopics(): Promise<Topic[]> {
  const uid = await userId();
  if (!uid) return [];
  return db
    .select({ id: topics.id, name: topics.name, color: topics.color })
    .from(topics)
    .where(eq(topics.userId, uid))
    .orderBy(desc(topics.createdAt));
}

export async function createTopic(rawName: string): Promise<Topic> {
  const uid = await userId();
  if (!uid) throw new Error("Not signed in");

  const name = rawName.trim().replace(/\s+/g, " ").slice(0, 40);
  if (!name) throw new Error("Give the topic a name");

  const existing = await db
    .select({ id: topics.id, name: topics.name, color: topics.color })
    .from(topics)
    .where(eq(topics.userId, uid));
  const dupe = existing.find((t) => t.name.toLowerCase() === name.toLowerCase());
  if (dupe) return dupe;

  const color = TOPIC_COLORS[existing.length % TOPIC_COLORS.length];
  const [row] = await db
    .insert(topics)
    .values({ userId: uid, name, color })
    .returning({ id: topics.id, name: topics.name, color: topics.color });
  return row;
}

// `date` is the visitor's local calendar day (YYYY-MM-DD): the server runs in UTC,
// so it can't work out "today" for them.
export async function logFocusSession(input: { topicId: string | null; minutes: number; date: string }) {
  const uid = await userId();
  if (!uid) return null;
  if (!Number.isInteger(input.minutes) || input.minutes < 1 || input.minutes > 180) throw new Error("Invalid length");
  if (!DATE_RE.test(input.date)) throw new Error("Invalid date");

  let topicId: string | null = null;
  if (input.topicId) {
    const owned = await db
      .select({ id: topics.id })
      .from(topics)
      .where(and(eq(topics.id, input.topicId), eq(topics.userId, uid)))
      .limit(1);
    topicId = owned[0]?.id ?? null;
  }

  const [row] = await db
    .insert(focusSessions)
    .values({ userId: uid, topicId, durationMinutes: input.minutes, date: input.date })
    .returning({ id: focusSessions.id });
  return row;
}

export async function getTodayStats(date: string): Promise<TodayStats> {
  const empty: TodayStats = { totalMinutes: 0, sessions: 0, byTopic: [] };
  const uid = await userId();
  if (!uid || !DATE_RE.test(date)) return empty;

  const rows = await db
    .select({
      topicId: focusSessions.topicId,
      name: topics.name,
      color: topics.color,
      minutes: sql<number>`coalesce(sum(${focusSessions.durationMinutes}), 0)::int`,
      sessions: sql<number>`count(*)::int`,
    })
    .from(focusSessions)
    .leftJoin(topics, eq(focusSessions.topicId, topics.id))
    .where(and(eq(focusSessions.userId, uid), eq(focusSessions.date, date)))
    .groupBy(focusSessions.topicId, topics.name, topics.color);

  const byTopic = rows
    .map((r) => ({
      topicId: r.topicId,
      name: r.name ?? "No topic",
      color: r.color ?? "#6b4a40",
      minutes: r.minutes,
      sessions: r.sessions,
    }))
    .sort((a, b) => b.minutes - a.minutes);

  return {
    totalMinutes: byTopic.reduce((s, t) => s + t.minutes, 0),
    sessions: byTopic.reduce((s, t) => s + t.sessions, 0),
    byTopic,
  };
}

// Full-length focus rounds per day between two local dates (inclusive), for the gem calendar.
// Days with no sessions are left out. Cycles and gems are worked out from these counts in lib/gems.
export async function getMonthSessions(from: string, to: string): Promise<DaySessions[]> {
  const uid = await userId();
  if (!uid || !DATE_RE.test(from) || !DATE_RE.test(to)) return [];

  return db
    .select({ date: focusSessions.date, sessions: sql<number>`count(*)::int` })
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, uid),
        gte(focusSessions.date, from),
        lte(focusSessions.date, to),
        gte(focusSessions.durationMinutes, FOCUS_MINUTES),
      ),
    )
    .groupBy(focusSessions.date);
}
