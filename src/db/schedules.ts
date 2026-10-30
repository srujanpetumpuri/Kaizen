import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "./index";
import { schedules, topics, workoutEntries } from "./schema";
import { findOrCreateTopic } from "./topics";
import { cleanTopicName } from "@/lib/topic-colors";
import { DEFAULT_SCHEDULE_TOPIC, MAX_SCHEDULES, type Schedule } from "@/lib/schedules";

const columns = {
  id: schedules.id,
  topicId: schedules.topicId,
  topic: topics.name,
  color: topics.color,
};

function selectSchedules(userId: string) {
  return db
    .select(columns)
    .from(schedules)
    .innerJoin(topics, eq(schedules.topicId, topics.id))
    .where(eq(schedules.userId, userId))
    .orderBy(asc(schedules.createdAt));
}

// The user's schedules, oldest first. A user always has at least one: the first time they load the
// planner a "Workouts" schedule is created, and any tasks made before schedules existed move into
// their first schedule. Both steps are idempotent, so concurrent requests can't duplicate anything.
export async function listSchedules(userId: string): Promise<Schedule[]> {
  let rows = await selectSchedules(userId);

  if (rows.length === 0) {
    const topic = await findOrCreateTopic(userId, DEFAULT_SCHEDULE_TOPIC);
    await db.insert(schedules).values({ userId, topicId: topic.id }).onConflictDoNothing();
    rows = await selectSchedules(userId);
  }

  const orphaned = await db
    .select({ id: workoutEntries.id })
    .from(workoutEntries)
    .where(and(eq(workoutEntries.userId, userId), isNull(workoutEntries.scheduleId)))
    .limit(1);
  if (orphaned.length > 0) {
    await db
      .update(workoutEntries)
      .set({ scheduleId: rows[0].id })
      .where(and(eq(workoutEntries.userId, userId), isNull(workoutEntries.scheduleId)));
  }

  return rows;
}

export type CreateScheduleResult =
  | { ok: true; schedule: Schedule }
  | { ok: false; status: 400 | 409; error: string };

// Creates the schedule for a topic, making the topic first if it's new. A topic can only have one
// schedule, so asking for one that exists is a 409.
export async function createSchedule(userId: string, rawTopic: unknown): Promise<CreateScheduleResult> {
  const name = typeof rawTopic === "string" ? cleanTopicName(rawTopic) : "";
  if (!name) return { ok: false, status: 400, error: "Give the schedule a topic." };

  const existing = await selectSchedules(userId);
  if (existing.length >= MAX_SCHEDULES) {
    return { ok: false, status: 400, error: `You can have up to ${MAX_SCHEDULES} schedules.` };
  }

  const topic = await findOrCreateTopic(userId, name);
  const taken = { ok: false, status: 409, error: `You already have a schedule for “${topic.name}”.` } as const;
  if (existing.some((s) => s.topicId === topic.id)) return taken;

  const [row] = await db.insert(schedules).values({ userId, topicId: topic.id }).onConflictDoNothing().returning({ id: schedules.id });
  if (!row) return taken; // a concurrent request got there first
  return { ok: true, schedule: { id: row.id, topicId: topic.id, topic: topic.name, color: topic.color } };
}

// Removes the schedule and its tasks (FK cascade). The topic stays, since the focus timer still uses it.
// "last" means the user's only schedule, which can't be deleted.
export async function deleteSchedule(userId: string, id: string): Promise<"ok" | "not_found" | "last"> {
  const mine = await selectSchedules(userId);
  if (!mine.some((s) => s.id === id)) return "not_found";
  if (mine.length <= 1) return "last";
  await db.delete(schedules).where(and(eq(schedules.id, id), eq(schedules.userId, userId)));
  return "ok";
}

export async function ownsSchedule(userId: string, id: string) {
  const rows = await db
    .select({ id: schedules.id })
    .from(schedules)
    .where(and(eq(schedules.id, id), eq(schedules.userId, userId)))
    .limit(1);
  return rows.length > 0;
}
