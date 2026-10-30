"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Plus, Tag, X } from "lucide-react";
import { createTopic, getTopics, type Topic } from "@/lib/focus-actions";

export default function TopicPicker({
  selectedTopicId,
  onSelect,
}: {
  selectedTopicId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getTopics().then(setTopics).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  function add() {
    if (!name.trim()) return;
    setError("");
    start(async () => {
      try {
        const topic = await createTopic(name);
        setTopics((prev) => (prev.some((t) => t.id === topic.id) ? prev : [topic, ...prev]));
        onSelect(topic.id);
        setName("");
        setCreating(false);
        setOpen(false);
      } catch {
        setError("Couldn't add that topic.");
      }
    });
  }

  const selected = topics.find((t) => t.id === selectedTopicId);
  const row = (active: boolean) =>
    `flex w-full items-center justify-between gap-2 rounded-2xl border-2 px-3 py-2 text-left text-sm font-semibold transition-colors ${
      active ? "border-line bg-cta text-on-cta" : "border-transparent bg-raise text-ink hover:border-line"
    }`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border-2 border-line bg-paper px-4 py-1.5 text-sm font-bold text-ink shadow-[3px_3px_0_var(--shadow-c)] transition-transform hover:-translate-y-0.5"
      >
        <span className="h-3 w-3 rounded-full border-2 border-line" style={{ background: selected?.color ?? "transparent" }} />
        {selected ? selected.name : "No topic"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[var(--scrim)] p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div role="dialog" aria-modal="true" aria-label="Pick a topic" className="w-full max-w-sm rounded-sticker border-2 border-line bg-paper p-5 shadow-sticker-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-head text-2xl">
                <Tag size={20} /> Pick a topic
              </h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full border-2 border-line bg-raise hover:bg-cta hover:text-on-cta">
                <X size={16} />
              </button>
            </div>

            <div className="flex max-h-60 flex-col gap-1.5 overflow-y-auto pr-1">
              <button type="button" className={row(selectedTopicId === null)} onClick={() => { onSelect(null); setOpen(false); }}>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full border-2 border-current" /> No topic
                </span>
                {selectedTopicId === null && <Check size={16} />}
              </button>
              {topics.map((t) => (
                <button key={t.id} type="button" className={row(selectedTopicId === t.id)} onClick={() => { onSelect(t.id); setOpen(false); }}>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full border-2 border-line" style={{ background: t.color }} />
                    <span className="truncate">{t.name}</span>
                  </span>
                  {selectedTopicId === t.id && <Check size={16} />}
                </button>
              ))}
            </div>

            <div className="mt-4 border-t-2 border-dashed border-line/40 pt-4">
              {creating ? (
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={name}
                    maxLength={40}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && add()}
                    placeholder="Topic name"
                    className="min-w-0 flex-1 rounded-2xl border-2 border-line bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cta"
                  />
                  <button type="button" onClick={add} disabled={pending || !name.trim()} className="rounded-full border-2 border-line bg-cta px-4 py-2 text-sm font-bold text-on-cta shadow-[3px_3px_0_var(--shadow-c)] disabled:opacity-50">
                    {pending ? "…" : "Add"}
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setCreating(true)} className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line/50 py-2 text-sm font-bold text-sub hover:border-cta hover:text-cta">
                  <Plus size={14} /> New topic
                </button>
              )}
              {error && <p className="mt-2 text-sm font-semibold text-[var(--warn)]" role="alert">{error}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
