import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { topics } from "./schema";
import { TOPIC_COLORS } from "@/lib/topic-colors";

export type TopicRow = { id: string; name: string; color: string };

const columns = { id: topics.id, name: topics.name, color: topics.color };

// Finds the user's topic with this name (ignoring case) or creates it. Safe to call from two
// requests at once: the loser of the race re-reads the row the winner inserted.
export async function findOrCreateTopic(userId: string, name: string): Promise<TopicRow> {
  const mine = await db.select(columns).from(topics).where(eq(topics.userId, userId));
  const found = mine.find((t) => t.name.toLowerCase() === name.toLowerCase());
  if (found) return found;

  const color = TOPIC_COLORS[mine.length % TOPIC_COLORS.length];
  const [row] = await db.insert(topics).values({ userId, name, color }).onConflictDoNothing().returning(columns);
  if (row) return row;

  const [again] = await db
    .select(columns)
    .from(topics)
    .where(and(eq(topics.userId, userId), eq(topics.name, name)))
    .limit(1);
  if (!again) throw new Error("Couldn't create that topic");
  return again;
}
