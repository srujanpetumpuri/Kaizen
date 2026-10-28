"use client";

import { useState, useTransition } from "react";
import { useTimer } from "@/hooks/useTimer";
import { MODES, localDate, type Mode } from "@/lib/timer";
import { createTopic, logFocusSession } from "@/app/actions/focus";

type Topic = { id: string; name: string; color: string };

const R = 120;
const C = 2 * Math.PI * R;

export default function Timer({
  initialTopics,
  signedIn,
}: {
  initialTopics: Topic[];
  signedIn: boolean;
}) {
  const [topics, setTopics] = useState(initialTopics);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState("");
  const [note, setNote] = useState("");
  const [, startTransition] = useTransition();

  const t = useTimer({
    onFinish: ({ mode, elapsedMs, completed }) => {
      if (mode !== "focus" || !signedIn) return;
      const minutes = Math.round(elapsedMs / 60_000);
      if (minutes < 1) return;
      startTransition(async () => {
        const res = await logFocusSession({
          topicId,
          durationMinutes: minutes,
          date: localDate(),
        });
        setNote(res.ok ? `Logged ${minutes} min${completed ? " ✓" : ""}` : "");
      });
    },
  });

  const secs = Math.ceil(t.remaining / 1000);
  const label = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  const progress = 1 - t.remaining / t.totalMs;
  const running = t.status === "running";

  async function addTopic(e: React.FormEvent) {
    e.preventDefault();
    const res = await createTopic(newTopic, "#c8323b");
    if (res.ok) {
      setTopics((p) => [...p, res.topic]);
      setTopicId(res.topic.id);
      setNewTopic("");
    }
  }

  const pill = (active: boolean) =>
    `rounded-full border-2 border-[var(--line)] px-4 py-1.5 text-sm font-semibold ${
      active ? "bg-[var(--cta)] text-white" : "bg-[var(--paper)] text-[var(--ink)]"
    }`;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-2">
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <button key={m} onClick={() => t.setMode(m)} className={pill(t.mode === m)}>
            {MODES[m].label} {MODES[m].minutes}
          </button>
        ))}
      </div>

      <div className="relative grid place-items-center">
        <svg width="280" height="280" viewBox="0 0 280 280" className="-rotate-90">
          <circle cx="140" cy="140" r={R} fill="var(--paper)" stroke="var(--line)" strokeWidth="2" />
          <circle
            cx="140" cy="140" r={R} fill="none"
            stroke={t.mode === "focus" ? "var(--cta)" : "var(--sun)"}
            strokeWidth="14" strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
          />
        </svg>
        <div className="absolute text-center">
          <div className="font-[family-name:var(--font-heading)] text-6xl tabular-nums">{label}</div>
        </div>
        {/* TODO: walking sprite. Position along the ring using `progress` (0..1) */}
      </div>

      <div className="flex gap-3">
        <button
          onClick={running ? t.pause : t.start}
          className="rounded-full border-2 border-[var(--line)] bg-[var(--cta)] px-8 py-2.5 font-semibold text-white shadow-[3px_3px_0_var(--line)] hover:bg-[var(--cta-hover)]"
        >
          {running ? "Pause" : t.status === "paused" ? "Resume" : "Start"}
        </button>
        <button
          onClick={t.stop}
          disabled={t.status === "idle"}
          className="rounded-full border-2 border-[var(--line)] bg-[var(--paper)] px-6 py-2.5 font-semibold disabled:opacity-40"
        >
          {t.mode === "focus" ? "Finish" : "Reset"}
        </button>
      </div>

      {signedIn ? (
        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap justify-center gap-2">
            {topics.map((tp) => (
              <button key={tp.id} onClick={() => setTopicId(topicId === tp.id ? null : tp.id)} className={pill(topicId === tp.id)}>
                {tp.name}
              </button>
            ))}
          </div>
          <form onSubmit={addTopic} className="flex gap-2">
            <input
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="New topic"
              className="rounded-full border-2 border-[var(--line)] bg-[var(--paper)] px-4 py-1.5 text-sm outline-none"
            />
            <button className={pill(false)}>Add</button>
          </form>
        </div>
      ) : (
        <p className="text-sm text-[var(--sub)]">Sign in to track focus time by topic.</p>
      )}

      {note && <p className="text-sm text-[var(--sub)]">{note}</p>}
    </div>
  );
}