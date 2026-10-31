"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMonthSessions } from "@/lib/focus-actions";
import { CYCLE_SESSIONS, GEMS, cyclesFrom, gemFor, type Gem } from "@/lib/gems";
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
    "grid h-7 min-w-7 place-items-center rounded-md border border-rule bg-raise px-1.5 text-ink hover:bg-bg";

  return (
    <section id="gems" className="rounded-sticker border-2 border-line bg-paper p-3 shadow-sticker" aria-label="Gem calendar">
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <h2 className="font-head text-lg font-extrabold leading-none">Gems</h2>
        <div className="ml-auto flex gap-1">
          <button type="button" className={navBtn} onClick={() => shift(-1)} aria-label="Previous month">
            <ChevronLeft size={14} />
          </button>
          <button type="button" className={`${navBtn} px-2 text-[11px] font-bold`} onClick={() => cursor && setCursor({ y: new Date().getFullYear(), m: new Date().getMonth() })}>
            Today
          </button>
          <button type="button" className={navBtn} onClick={() => shift(1)} aria-label="Next month">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-extrabold">{cursor ? `${MONTH_NAMES[cursor.m]} ${cursor.y}` : ""}</h3>
        {signedIn && cursor && (
          <p className="text-[11px] font-bold text-sub">{plural(monthCycles, "cycle")}</p>
        )}
      </div>

      {!signedIn && (
        <p className="mb-2 rounded-md border border-rule border-l-4 border-l-cta bg-bg px-2 py-1.5 text-[11px] font-semibold">
          <button type="button" className="font-bold text-cta underline" onClick={() => window.dispatchEvent(new Event("kaizen:signin"))}>
            Sign in
          </button>{" "}
          to collect gems.
        </p>
      )}
      {failed && (
        <p className="mb-2 rounded-md border border-rule border-l-4 border-l-[var(--warn)] bg-bg px-2 py-1.5 text-[11px] font-semibold text-[var(--warn)]" role="alert">
          Couldn&apos;t load your sessions.
        </p>
      )}

      <div className="grid grid-cols-7 gap-0.5" aria-hidden="true">
        {WEEKDAYS_SHORT.map((d) => (
          <span key={d} className="pb-0.5 text-center text-[9px] font-bold uppercase tracking-wider text-sub">
            {d}
          </span>
        ))}
      </div>

      <ul className="grid grid-cols-7 gap-px">
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
              title={summary ? `${when} · ${summary}${sessions > cycles * CYCLE_SESSIONS && gem ? ` (${plural(sessions, "round")})` : ""}` : when}
              aria-current={c.key === todayKey ? "date" : undefined}
              className={`relative flex h-7 items-center justify-center rounded-sm border ${
                c.key === todayKey ? "border-cta bg-raise" : "border-rule bg-bg"
              } ${c.inMonth ? "" : "opacity-45"}`}
            >
              {gem ? (
                <span role="img" aria-label={`${when}: ${summary}`} className="block h-4 w-4">
                  <GemImage gem={gem} />
                </span>
              ) : (
                <span className="text-[10px] font-bold leading-none text-sub">{c.day}</span>
              )}
              {gem && cycles > 1 && <span className="absolute bottom-0 right-px text-[7px] font-extrabold leading-none">×{cycles}</span>}
              {sessions > 0 && !gem && (
                <span className="sr-only">{sessions}/{CYCLE_SESSIONS}</span>
              )}
            </li>
          );
        })}
      </ul>

      <ul className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-rule pt-2" aria-label="Gem guide">
        {GEMS.map((g, i) => (
          <li key={g.name} className="flex items-center gap-1 text-[10px] font-bold" title={`${g.name} · ${i === GEMS.length - 1 ? `${g.cycles}+ cycles` : plural(g.cycles, "cycle")}`}>
            <span className="block h-4 w-4">
              <GemImage gem={g} />
            </span>
            <span className="text-sub">{i === GEMS.length - 1 ? `${g.cycles}+` : g.cycles}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
