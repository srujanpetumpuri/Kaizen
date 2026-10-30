// Seeds demo focus sessions for one account so the gem calendar and the "Today" panel have something to show.
//
//   npm run db:seed -- you@example.com            add the demo sessions
//   npm run db:seed -- you@example.com --replace  clear your sessions in the seeded date range first, then add them
//   npm run db:seed -- you@example.com --dry      only print what would be added
//
// The account must already exist (sign up in the app first). Reads DATABASE_URL from .env.local.
import { pathToFileURL } from "node:url";

const SESSION_MINUTES = 25; // must match FOCUS_MINUTES in src/lib/gems.ts
const CYCLE_SESSIONS = 4; // must match CYCLE_SESSIONS in src/lib/gems.ts
const DAYS_BACK = 35; // from today back, so this month and most of last month are filled

// Focus rounds per day, repeated. Covers every gem (4 = Aqua, 8 = Amethyst, 12 = Amber, 16 = Obsidian,
// 20 and 24 = Crystal cluster) plus days with unfinished cycles (2, 3, 6, 9, 13) and rest days (0).
const PATTERN = [4, 8, 0, 12, 2, 16, 6, 0, 20, 9, 24, 3, 13, 0];

const TOPICS = [
  { name: "Coding", color: "#c8323b" },
  { name: "Study", color: "#f6c453" },
  { name: "Reading", color: "#3f8f4f" },
];

const pad = (n) => String(n).padStart(2, "0");
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// The sessions to insert: { date: "YYYY-MM-DD", completedAt: "YYYY-MM-DD HH:MM:00", topic: <index in TOPICS> }.
// Rounds start at 06:00, one every 30 minutes (25 focus + 5 break). Rounds that would finish after `now`
// are left out, so today never has sessions from the future.
export function buildPlan(now = new Date()) {
  const rows = [];
  for (let back = DAYS_BACK; back >= 0; back--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
    const date = dateKey(day);
    const rounds = PATTERN[back % PATTERN.length]; // today is PATTERN[0], so it always has sessions
    for (let i = 0; i < rounds; i++) {
      const end = 6 * 60 + i * 30 + SESSION_MINUTES;
      const completedAt = `${date} ${pad(Math.floor(end / 60))}:${pad(end % 60)}:00`;
      if (new Date(date + "T00:00:00").getTime() + end * 60_000 > now.getTime()) continue;
      rows.push({ date, completedAt, topic: i % TOPICS.length });
    }
  }
  return rows;
}

// One multi-row INSERT per chunk, with positional parameters.
export function buildInserts(userId, topicIds, rows, chunk = 200) {
  const out = [];
  for (let at = 0; at < rows.length; at += chunk) {
    const part = rows.slice(at, at + chunk);
    const params = [];
    const values = part.map((r) => {
      const n = params.length;
      params.push(userId, topicIds[r.topic], r.completedAt, r.date);
      return `($${n + 1}, $${n + 2}, ${SESSION_MINUTES}, $${n + 3}::timestamp, $${n + 4})`;
    });
    out.push({
      text: `insert into focus_sessions (user_id, topic_id, duration_minutes, completed_at, date) values ${values.join(", ")}`,
      params,
    });
  }
  return out;
}

function summarise(rows) {
  const perDay = new Map();
  for (const r of rows) perDay.set(r.date, (perDay.get(r.date) ?? 0) + 1);
  const gems = ["Aqua", "Amethyst", "Amber", "Obsidian", "Crystal cluster"];
  const tally = Object.fromEntries(gems.map((g) => [g, 0]));
  let partial = 0;
  for (const n of perDay.values()) {
    const cycles = Math.floor(n / CYCLE_SESSIONS);
    if (cycles >= 1) tally[gems[Math.min(cycles, gems.length) - 1]]++;
    else partial++;
  }
  const days = [...perDay.keys()].sort();
  console.log(`${rows.length} focus sessions across ${perDay.size} days (${days[0]} to ${days.at(-1)})`);
  for (const g of gems) console.log(`  ${g.padEnd(16)} ${tally[g]} day${tally[g] === 1 ? "" : "s"}`);
  console.log(`  ${"Not a full cycle".padEnd(16)} ${partial} day${partial === 1 ? "" : "s"}`);
}

// `sql.query(text, params)` must resolve to an array of rows (what @neondatabase/serverless gives).
// Resolves to { ok: true } or { ok: false, error }.
export async function seed(sql, email, plan, { replace = false } = {}) {
  const [u] = await sql.query(`select id from "user" where lower(email) = lower($1)`, [email]);
  if (!u) return { ok: false, error: `No account with the email ${email}. Sign up in the app first, then run this again.` };

  const from = plan[0].date;
  const to = plan.at(-1).date;
  const [{ n }] = await sql.query(
    `select count(*)::int as n from focus_sessions where user_id = $1 and date >= $2 and date <= $3`,
    [u.id, from, to],
  );
  if (n > 0 && !replace) {
    return { ok: false, error: `You already have ${n} focus sessions between ${from} and ${to}. Run again with --replace to clear those first.` };
  }
  if (n > 0) {
    await sql.query(`delete from focus_sessions where user_id = $1 and date >= $2 and date <= $3`, [u.id, from, to]);
    console.log(`Cleared ${n} existing sessions in that range.`);
  }

  // reuse topics you already have with these names, create the rest
  for (const t of TOPICS) {
    await sql.query(`insert into topics (user_id, name, color) values ($1, $2, $3) on conflict do nothing`, [u.id, t.name, t.color]);
  }
  const found = await sql.query(
    `select id, name from topics where user_id = $1 and name in (${TOPICS.map((_, i) => `$${i + 2}`).join(", ")})`,
    [u.id, ...TOPICS.map((t) => t.name)],
  );
  const topicIds = TOPICS.map((t) => found.find((f) => f.name === t.name).id);

  for (const q of buildInserts(u.id, topicIds, plan)) await sql.query(q.text, q.params);
  return { ok: true };
}

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"));
  if (!email) {
    console.error("Usage: npm run db:seed -- you@example.com [--replace] [--dry]");
    process.exit(1);
  }

  const plan = buildPlan();
  summarise(plan);
  if (args.includes("--dry")) return;

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Run this with `npm run db:seed` so it reads .env.local.");
    process.exit(1);
  }
  const { neon } = await import("@neondatabase/serverless");
  const result = await seed(neon(process.env.DATABASE_URL), email, plan, { replace: args.includes("--replace") });
  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }
  console.log("Done. Reload the app and scroll to Gems.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
