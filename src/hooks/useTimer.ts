"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MODES, type Mode } from "@/lib/timer";

type Status = "idle" | "running" | "paused";

export function useTimer(opts: {
  onFinish: (r: { mode: Mode; elapsedMs: number; completed: boolean }) => void;
}) {
  const [mode, setModeState] = useState<Mode>("focus");
  const [status, setStatus] = useState<Status>("idle");
  const [endAt, setEndAt] = useState<number | null>(null);
  const [leftMs, setLeftMs] = useState(MODES.focus.minutes * 60_000); // idle/paused value
  const [now, setNow] = useState(0);

  const onFinish = useRef(opts.onFinish);
  useEffect(() => {
    onFinish.current = opts.onFinish;
  });

  const totalMs = MODES[mode].minutes * 60_000;
  const remaining =
    status === "running" && endAt ? Math.max(0, endAt - now) : leftMs;

  const reset = useCallback(
    (nextMode: Mode, completed: boolean, currentRemaining: number, wasActive: boolean) => {
      if (wasActive)
        onFinish.current({
          mode,
          elapsedMs: MODES[mode].minutes * 60_000 - currentRemaining,
          completed,
        });
      setModeState(nextMode);
      setStatus("idle");
      setEndAt(null);
      setLeftMs(MODES[nextMode].minutes * 60_000);
    },
    [mode],
  );

  // Tick only re-renders; truth is endAt
  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [status]);

  // Finished
  useEffect(() => {
    if (status === "running" && endAt && now >= endAt) {
      reset(mode, true, 0, true);
    }
  }, [now, status, endAt, mode, reset]);

  // Tab title
  useEffect(() => {
    const s = Math.ceil(remaining / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    document.title = status === "idle" ? "Kaizen" : `${mm}:${ss} · Kaizen`;
  }, [remaining, status]);

  return {
    mode,
    status,
    remaining,
    totalMs,
    start() {
      const t = Date.now();
      setNow(t);
      setEndAt(t + remaining);
      setStatus("running");
    },
    pause() {
      setLeftMs(Math.max(0, (endAt ?? Date.now()) - Date.now()));
      setStatus("paused");
      setEndAt(null);
    },
    // Reset current mode; logs real time if >= 1 min was spent
    stop() {
      reset(mode, false, remaining, status !== "idle");
    },
    setMode(m: Mode) {
      if (m === mode) return;
      reset(m, false, remaining, status !== "idle");
    },
  };
}