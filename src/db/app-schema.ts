import {
  pgTable,
  text,
  uuid,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

const userId = () =>
  text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    name: text("name").notNull(),
    color: text("color").notNull().default("#c8323b"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("topics_user_name_idx").on(t.userId, t.name)],
);

export const focusSessions = pgTable(
  "focus_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    topicId: uuid("topic_id").references(() => topics.id, {
      onDelete: "set null",
    }),
    durationMinutes: integer("duration_minutes").notNull(),
    completedAt: timestamp("completed_at").notNull().defaultNow(),
    date: text("date").notNull(),
  },
  (t) => [index("focus_sessions_user_date_idx").on(t.userId, t.date)],
);

export const workoutTypes = pgTable(
  "workout_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    name: text("name").notNull(),
    glyph: text("glyph").notNull(),
    shade: text("shade").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("workout_types_user_idx").on(t.userId)],
);

export const workoutEntries = pgTable(
  "workout_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    // Plain YYYY-MM-DD string, never a timestamp
    date: text("date").notNull(),
    // Built-in category key (e.g. "run"), used when no custom type is set
    category: text("category"),
    // Exactly one of category / typeId is set. Deleting a custom type also
    // removes the planned workouts that use it.
    typeId: uuid("type_id").references(() => workoutTypes.id, {
      onDelete: "cascade",
    }),
    // null = show the icon's name
    title: text("title"),
    notes: text("notes"),
    // Minutes from midnight; null = planned for the day with no set time
    startMinutes: integer("start_minutes"),
    durationMinutes: integer("duration_minutes").notNull().default(60),
    completed: boolean("completed").notNull().default(false),
    // Shared by all entries generated from one repeat rule
    seriesId: text("series_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("workout_entries_user_date_idx").on(t.userId, t.date),
    index("workout_entries_series_idx").on(t.seriesId),
  ],
);