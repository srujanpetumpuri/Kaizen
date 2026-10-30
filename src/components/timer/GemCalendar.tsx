"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMonthSessions } from "@/lib/focus-actions";
import { CYCLE_SESSIONS, FOCUS_MINUTES, GEMS, cyclesFrom, gemFor, type Gem } from "@/lib/gems";
import { MONTH_NAMES, WEEKDAYS_SHORT, localDateKey, monthGrid } from "@/lib/dates";

// The gem image, or a coloured diamond if the file isn't in /public (yet).
function GemImage({ gem }: { gem: Gem }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return <span aria-hidden="true" className="block h-3/4 w-3/4 rotate-45 rounded-md border-2 border-line" style={{ background: gem.color }} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static file from /public, shown at a few fixed sizes
    <img src={gem.src} alt="" draggable={false} className="h-full w-full object-contain" onError={() => setBroken(true)} />
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function GemCalendar({ signedIn }: { signedIn: boolean }) {
  // "today" is only known in the browser (the server runs in UTC), so it's set after mount
  const [todayKey, setTodayKey] = useState("");
  const [cursor, setCursor] = useState<{ y: number; m: number } | null>(null);
  const [sessionsByDay, setSessionsByDay] = useState<Record<string, number>>({});
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const now = new Date();
    // browser-only values: computing "today" during render would break hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayKey(localDateKey(now));
    setCursor({ y: now.getFullYear(), m: now.getMonth() });
  }, []);

  const cells = useMemo(() => (cursor ? monthGrid(cursor.y, cursor.m) : []), [cursor]);

  // the whole grid is loaded, so the leading/trailing days of neighbouring months show their gems too
  useEffect(() => {
    if (!signedIn || cells.length === 0) return;
    let cancelled = false;
    getMonthSessions(cells[0].key, cells[cells.length - 1].key)
      .then((rows) => {
        if (cancelled) return;
        setSessionsByDay(Object.fromEntries(rows.map((r) => [r.date, r.sessions])));
        setFailed(false);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [signedIn, cells, refresh]);

  // the timer announces each saved session, so a gem appears without a page reload
  useEffect(() => {
    const onLogged = () => setRefresh((n) => n + 1);
    window.addEventListener("kaizen:session-logged", onLogged);
    return () => window.removeEventListener("kaizen:session-logged", onLogged);
  }, []);

  function shift(dir: 1 | -1) {
    setCursor((c) => {
      if (!c) return c;
      const d = new Date(c.y, c.m + dir, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  const monthCycles = cells.filter((c) => c.inMonth).reduce((n, c) => n + cyclesFrom(sessionsByDay[c.key] ?? 0), 0);

  const navBtn =
    "grid h-9 min-w-9 place-items-center rounded-lg border border-rule bg-raise px-2 font-bold text-ink hover:bg-bg";

  return (
    <div>
      <h2 className="font-head text-4xl font-extrabold leading-none sm:text-5xl">Gems</h2>
      <p className="mb-6 mt-2 text-lg text-sub">
        Finish a cycle ({CYCLE_SESSIONS} focus rounds of {FOCUS_MINUTES} minutes) and earn a gem for the day. The more cycles, the rarer the gem.
      </p>

      {!signedIn && (
        <p className="mb-5 rounded-lg border border-rule border-l-4 border-l-cta bg-paper px-4 py-3 text-sm font-semibold">
          Sessions are only saved to your account, so there are no gems to show yet.{" "}
          <button type="button" className="font-bold text-cta underline" onClick={() => window.dispatchEvent(new Event("kaizen:signin"))}>
            Sign in
          </button>{" "}
          to start collecting.
        </p>
      )}
      {failed && (
        <p className="mb-5 rounded-lg border border-rule border-l-4 border-l-[var(--warn)] bg-paper px-4 py-3 text-sm font-semibold text-[var(--warn)]" role="alert">
          Couldn&apos;t load your sessions.
        </p>
      )}

      <section className="rounded-sticker border-2 border-line bg-paper p-5 shadow-sticker sm:p-6" aria-label="Gem calendar">
        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-rule pb-4">
          <div className="flex gap-1.5">
            <button type="button" className={navBtn} onClick={() => shift(-1)} aria-label="Previous month">
              <ChevronLeft size={18} />
            </button>
            <button type="button" className={`${navBtn} text-sm`} onClick={() => cursor && setCursor({ y: new Date().getFullYear(), m: new Date().getMonth() })}>
              Today
            </button>
            <button type="button" className={navBtn} onClick={() => shift(1)} aria-label="Next month">
              <ChevronRight size={18} />
            </button>
          </div>
          <h3 className="font-head text-2xl font-extrabold">{cursor ? `${MONTH_NAMES[cursor.m]} ${cursor.y}` : ""}</h3>
          {signedIn && cursor && (
            <p className="text-sm font-bold text-sub sm:ml-auto">{plural(monthCycles, "cycle")} this month</p>
          )}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2" aria-hidden="true">
          {WEEKDAYS_SHORT.map((d) => (
            <span key={d} className="pb-1 text-center text-xs font-bold uppercase tracking-wider text-sub">
              {d}
            </span>
          ))}
        </div>

        <ul className="grid grid-cols-7 gap-1 sm:gap-2">
          {cells.map((c) => {
            const sessions = sessionsByDay[c.key] ?? 0;
            const cycles = cyclesFrom(sessions);
            const gem = gemFor(cycles);
            const when = new Date(`${c.key}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
            const summary = gem
              ? `${plural(cycles, "cycle")}: ${gem.name} gem`
              : sessions > 0
                ? `${sessions} of ${CYCLE_SESSIONS} rounds toward the first gem`
                : "";
            return (
              <li
                key={c.key}
                title={summary ? `${when} · ${summary}${sessions > cycles * CYCLE_SESSIONS && gem ? ` (${plural(sessions, "round")})` : ""}` : undefined}
                aria-current={c.key === todayKey ? "date" : undefined}
                className={`relative flex min-h-[68px] flex-col rounded-xl border p-1.5 sm:min-h-[96px] sm:p-2 ${
                  c.key === todayKey ? "border-2 border-cta bg-raise" : "border-rule bg-bg"
                } ${c.inMonth ? "" : "opacity-45"}`}
              >
                <span className="text-xs font-bold text-sub sm:text-sm">{c.day}</span>
                {gem ? (
                  <span role="img" aria-label={`${when}: ${summary}`} className="mx-auto mt-0.5 block h-8 w-8 sm:h-12 sm:w-12">
                    <GemImage gem={gem} />
                  </span>
                ) : sessions > 0 ? (
                  <span className="mt-auto text-center text-[11px] font-bold text-sub sm:text-xs" aria-label={`${when}: ${summary}`}>
                    {sessions}/{CYCLE_SESSIONS}
                  </span>
                ) : null}
                {gem && <span className="absolute bottom-1 right-1.5 text-[11px] font-extrabold sm:text-xs">×{cycles}</span>}
              </li>
            );
          })}
        </ul>

        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-rule pt-4" aria-label="Gem guide">
          {GEMS.map((g, i) => (
            <li key={g.name} className="flex items-center gap-2 text-sm font-bold">
              <span className="block h-7 w-7">
                <GemImage gem={g} />
              </span>
              <span>
                {g.name} <span className="font-semibold text-sub">· {i === GEMS.length - 1 ? `${g.cycles}+ cycles` : plural(g.cycles, "cycle")}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
