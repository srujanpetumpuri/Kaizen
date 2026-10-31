"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import TopicPicker from "./TopicPicker";
import TodayFocus from "./TodayFocus";
import GemCalendar from "./GemCalendar";
import { logFocusSession } from "@/lib/focus-actions";
import { localDateKey } from "@/lib/dates";

type Mode = "focus" | "short" | "long";

const MODES: { key: Mode; label: string; minutes: number }[] = [
  { key: "focus", label: "Focus", minutes: 25 },
  { key: "short", label: "Short break", minutes: 5 },
  { key: "long", label: "Long break", minutes: 10 },
];
const CYCLE_LENGTH = 4; // focus rounds before a long break
const lengthOf = (m: Mode) => MODES.find((x) => x.key === m)!.minutes * 60;

const R = 118;
const CIRC = 2 * Math.PI * R;

// A short three-note chime, synthesised so there's no audio asset to ship.
function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1175, 1568].forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.18;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    /* audio blocked: the on-screen change is enough */
  }
}

export default function FocusTimer({ signedIn }: { signedIn: boolean }) {
  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(lengthOf("focus"));
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(0); // focus rounds done in the current set of four
  const [topicId, setTopicId] = useState<string | null>(null);
  const [visitSessions, setVisitSessions] = useState(0);
  const [statsKey, setStatsKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  // The clock is derived from a wall-clock deadline rather than counting ticks, so a
  // throttled background tab can't make the timer run slow.
  const endAt = useRef<number | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setSecondsLeft(lengthOf(next));
    setRunning(false);
    endAt.current = null;
  }

  async function finish() {
    setRunning(false);
    endAt.current = null;
    chime();

    if (mode === "focus") {
      const done = cycle + 1;
      setCycle(done);
      setVisitSessions((n) => n + 1);
      if (signedIn) {
        try {
          await logFocusSession({ topicId, minutes: MODES[0].minutes, date: localDateKey() });
          setStatsKey((k) => k + 1);
          window.dispatchEvent(new Event("kaizen:session-logged")); // lets the gem calendar update
        } catch {
          setNotice("That session finished but couldn't be saved.");
        }
      }
      switchMode(done >= CYCLE_LENGTH ? "long" : "short");
    } else {
      if (mode === "long") setCycle(0);
      switchMode("focus");
    }
  }

  // the interval always calls the latest finish(), which closes over the current mode/cycle/topic
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      if (endAt.current == null) return;
      const left = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) finishRef.current();
    };
    const id = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [running]);

  function toggle() {
    if (running) {
      setRunning(false);
      endAt.current = null;
    } else {
      endAt.current = Date.now() + secondsLeft * 1000;
      setRunning(true);
    }
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const label = MODES.find((m) => m.key === mode)!.label;

  useEffect(() => {
    if (!running) return;
    const prev = document.title;
    document.title = `${mm}:${ss} · ${label}`;
    return () => {
      document.title = prev;
    };
  }, [running, mm, ss, label]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const total = lengthOf(mode);
  const offset = CIRC * (1 - secondsLeft / total);
  const ringColor = mode === "focus" ? "var(--cta)" : "var(--ok)";

  const btn =
    "inline-flex items-center justify-center gap-2 rounded-full border-2 border-line font-bold shadow-[3px_3px_0_var(--shadow-c)] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 lg:flex-row lg:items-start lg:gap-5">
      <section className="w-full max-w-lg rounded-sticker border-2 border-line bg-paper p-5 shadow-sticker-lg sm:p-6" aria-label="Focus timer">
        <div role="tablist" aria-label="Timer mode" className="mx-auto mb-5 flex w-fit max-w-full justify-center gap-0.5 sm:gap-1 rounded-full border-2 border-line bg-bg p-1 shadow-[3px_3px_0_var(--shadow-c)]">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={mode === m.key}
              onClick={() => switchMode(m.key)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-bold transition-colors sm:px-4 sm:text-sm ${mode === m.key ? "bg-cta text-on-cta" : "text-sub hover:text-ink"}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {signedIn && (
          <div className="mb-4 flex justify-center">
            <TopicPicker selectedTopicId={topicId} onSelect={setTopicId} />
          </div>
        )}

        <div className="relative mx-auto aspect-square w-full max-w-[240px] sm:max-w-[260px]">
          <svg viewBox="0 0 280 280" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="140" cy="140" r={R} fill="none" stroke="var(--raise)" strokeWidth="26" />
            <circle cx="140" cy="140" r={R} fill="none" stroke="var(--line)" strokeWidth="30" opacity="0.12" />
            <circle
              cx="140"
              cy="140"
              r={R}
              fill="none"
              stroke={ringColor}
              strokeWidth="26"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              style={{ transition: running ? "stroke-dashoffset 0.3s linear" : "none" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="font-head text-5xl font-extrabold tabular-nums leading-none sm:text-6xl" role="timer" aria-live="off">
                {mm}:{ss}
              </p>
              <p className="mt-2 text-sm font-bold uppercase tracking-widest text-sub">{running ? label : "Ready"}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button type="button" onClick={() => switchMode(mode)} aria-label="Reset timer" title="Reset" className={`${btn} h-12 w-12 bg-raise text-ink hover:bg-bg`}>
            <RotateCcw size={18} />
          </button>
          <button type="button" onClick={toggle} className={`${btn} h-14 min-w-36 bg-cta px-6 text-lg text-on-cta hover:bg-cta-hover`}>
            {running ? <Pause size={20} /> : <Play size={20} />}
            {running ? "Pause" : "Start"}
          </button>
          <button
            type="button"
            onClick={() => switchMode(mode === "focus" ? (cycle + 1 >= CYCLE_LENGTH ? "long" : "short") : "focus")}
            aria-label="Skip to next"
            title="Skip"
            className={`${btn} h-12 w-12 bg-raise text-ink hover:bg-bg`}
          >
            <SkipForward size={18} />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3" aria-label={`${cycle} of ${CYCLE_LENGTH} focus rounds done`}>
          {Array.from({ length: CYCLE_LENGTH }, (_, i) => (
            <span
              key={i}
              className={`h-5 w-5 rounded-full border-2 border-line transition-colors ${i < cycle ? "bg-cta" : "bg-bg"}`}
              title={i < cycle ? "Round done" : "Round to go"}
            />
          ))}
          <span className="ml-1 text-sm font-bold text-sub">
            {cycle}/{CYCLE_LENGTH}
          </span>
        </div>

        {notice && (
          <p className="mt-4 text-center text-sm font-semibold text-[var(--warn)]" role="alert">
            {notice}
          </p>
        )}
      </section>

      <div className="flex w-full max-w-lg flex-col gap-3 lg:w-72 lg:max-w-72">
        <TodayFocus signedIn={signedIn} refreshKey={statsKey} visitSessions={visitSessions} />
        <GemCalendar signedIn={signedIn} />
      </div>
    </div>
  );
}
