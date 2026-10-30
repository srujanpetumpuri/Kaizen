"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_SCHEDULES, type Schedule } from "@/lib/schedules";
import { MAX_TOPIC_NAME } from "@/lib/topic-colors";

export const ALL_SCHEDULES = "all";

type Props = {
  schedules: Schedule[];
  activeId: string; // ALL_SCHEDULES or a schedule id
  onSelect: (id: string) => void;
  // resolves to an error message, or null on success
  onCreate: (topic: string) => Promise<string | null>;
  onDelete: (s: Schedule) => void;
};

const dotStyle = (color: string) => ({ "--sc": color }) as React.CSSProperties;

export default function ScheduleBar({ schedules, activeId, onSelect, onCreate, onDelete }: Props) {
  const [adding, setAdding] = useState(false);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  function close() {
    setAdding(false);
    setTopic("");
    setMsg(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const err = await onCreate(topic);
    setBusy(false);
    if (err) return setMsg(err);
    close();
  }

  const atLimit = schedules.length >= MAX_SCHEDULES;

  return (
    <div className="wk-sched">
      <div className="wk-sched-tabs" role="tablist" aria-label="Schedules">
        <button
          type="button"
          role="tab"
          aria-selected={activeId === ALL_SCHEDULES}
          className={`wk-sched-tab ${activeId === ALL_SCHEDULES ? "on" : ""}`}
          onClick={() => onSelect(ALL_SCHEDULES)}
        >
          All schedules
        </button>

        {schedules.map((s) => (
          <span className="wk-sched-wrap" key={s.id}>
            <button
              type="button"
              role="tab"
              aria-selected={activeId === s.id}
              className={`wk-sched-tab ${activeId === s.id ? "on" : ""}`}
              style={dotStyle(s.color)}
              onClick={() => onSelect(s.id)}
            >
              <i className="wk-sched-dot" aria-hidden="true" />
              {s.topic}
            </button>
            {schedules.length > 1 && (
              <button type="button" className="wk-sched-del" aria-label={`Delete the ${s.topic} schedule`} onClick={() => onDelete(s)}>
                ×
              </button>
            )}
          </span>
        ))}

        {!adding && (
          <button type="button" className="wk-sched-add" disabled={atLimit} title={atLimit ? `Up to ${MAX_SCHEDULES} schedules` : undefined} onClick={() => setAdding(true)}>
            + New schedule
          </button>
        )}
      </div>

      {adding && (
        <form className="wk-sched-form" onSubmit={submit}>
          <label className="wk-field wk-sched-field">
            <span>Topic</span>
            <input
              ref={inputRef}
              type="text"
              value={topic}
              maxLength={MAX_TOPIC_NAME}
              placeholder="e.g. Study, Coding, Reading"
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && close()}
              required
            />
          </label>
          <button type="submit" className="wk-create-btn" disabled={busy || !topic.trim()}>
            {busy ? "Creating…" : "Create schedule"}
          </button>
          <button type="button" className="wk-link" onClick={close}>Cancel</button>
          {msg && <p className="wk-box-error" role="alert">{msg}</p>}
        </form>
      )}

      {activeId === ALL_SCHEDULES && (
        <p className="wk-sched-note">Every schedule in one calendar. Pick a schedule to add tasks to it.</p>
      )}
    </div>
  );
}
