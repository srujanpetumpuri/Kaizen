"use client";

import { useEffect, useState } from "react";
import { getTodayStats, type TodayStats } from "@/lib/focus-actions";
import { fmtMinutes, localDateKey } from "@/lib/dates";

export default function TodayFocus({ signedIn, refreshKey, visitSessions }: { signedIn: boolean; refreshKey: number; visitSessions: number }) {
  const [stats, setStats] = useState<TodayStats | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    getTodayStats(localDateKey())
      .then((s) => !cancelled && setStats(s))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [signedIn, refreshKey]);

  const max = Math.max(1, ...(stats?.byTopic.map((t) => t.minutes) ?? [1]));

  return (
    <aside className="w-full rounded-sticker border-2 border-line bg-paper p-6 shadow-sticker lg:max-w-xs" aria-label="Today's focus">
      <h2 className="font-head text-2xl">Today</h2>

      {!signedIn ? (
        <div className="mt-3 space-y-3 text-sm text-sub">
          <p>
            <b className="text-ink">{visitSessions}</b> focus session{visitSessions === 1 ? "" : "s"} this visit.
          </p>
          <p>
            <button type="button" className="font-bold text-cta underline" onClick={() => window.dispatchEvent(new Event("kaizen:signin"))}>
              Sign in
            </button>{" "}
            to save your sessions and see time spent per topic.
          </p>
        </div>
      ) : !stats ? (
        <p className="mt-3 text-sm text-sub">Loading…</p>
      ) : stats.sessions === 0 ? (
        <p className="mt-3 text-sm text-sub">No focus sessions yet today. Finish a round and it shows up here.</p>
      ) : (
        <>
          <p className="mt-2 font-head text-5xl leading-none">{fmtMinutes(stats.totalMinutes)}</p>
          <p className="mt-1 text-sm text-sub">
            across {stats.sessions} session{stats.sessions === 1 ? "" : "s"}
          </p>
          <ul className="mt-5 space-y-3">
            {stats.byTopic.map((t) => (
              <li key={t.topicId ?? "none"}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm font-bold">
                  <span className="truncate">{t.name}</span>
                  <span className="shrink-0 text-sub">{fmtMinutes(t.minutes)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full border-2 border-line bg-bg">
                  <div className="h-full" style={{ width: `${(t.minutes / max) * 100}%`, background: t.color }} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
