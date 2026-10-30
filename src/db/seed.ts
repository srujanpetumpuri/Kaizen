// Seeds a demo user with ~75 days of focus sessions so every gem shows on the calendar.
// Run:  npx tsx scripts/seed.ts
// Login: demo@kaizen.test / demo12345
// Safe to re-run: it deletes the demo user (cascades to their data) and recreates it.
import { config } from "dotenv";
config({ path: ".env" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "./schema";

const EMAIL = "demo@kaizen.test";
const PASSWORD = "demo12345";
const DAYS = 75;

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });
// same auth config as src/lib/auth.ts, minus nextCookies (needs a Next request context)
const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
});

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// sessions per day, cycled through: covers no gem, partial cycle, and all 5 gems
// (4 sessions = 1 cycle; 20+ = top gem)
const PATTERN = [4, 8, 0, 12, 16, 20, 6, 4, 0, 8, 24, 12, 0, 16, 4, 20, 10, 8];

async function main() {
  await db.delete(schema.user).where(eq(schema.user.email, EMAIL));

  const res = await auth.api.signUpEmail({
    body: { name: "Demo User", email: EMAIL, password: PASSWORD },
  });
  const userId = res.user.id;

  const topicRows = await db
    .insert(schema.topics)
    .values([
      { userId, name: "Coding", color: "#c8323b" },
      { userId, name: "Reading", color: "#35c9d6" },
      { userId, name: "Math", color: "#f0902c" },
    ])
    .returning({ id: schema.topics.id });

  await db
    .insert(schema.schedules)
    .values(topicRows.map((t) => ({ userId, topicId: t.id })));

  const rows: (typeof schema.focusSessions.$inferInsert)[] = [];
  const today = new Date();
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const count = PATTERN[i % PATTERN.length];
    for (let s = 0; s < count; s++) {
      const at = new Date(d);
      at.setHours(8 + Math.floor(s / 2), (s % 2) * 30, 0, 0);
      rows.push({
        userId,
        topicId: topicRows[(i + s) % topicRows.length].id,
        durationMinutes: 25,
        completedAt: at,
        date: ymd(d),
      });
    }
  }
  for (let i = 0; i < rows.length; i += 500) {
    await db.insert(schema.focusSessions).values(rows.slice(i, i + 500));
  }

  console.log(`Seeded ${rows.length} sessions. Login: ${EMAIL} / ${PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});