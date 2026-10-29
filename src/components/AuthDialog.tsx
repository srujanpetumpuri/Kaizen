"use client";

import { useState } from "react";
import { signIn, signUp } from "@/lib/auth-client";

export default function AuthDialog({ onDone }: { onDone?: () => void }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res =
      mode === "in"
        ? await signIn.email({ email, password })
        : await signUp.email({ name: name || email.split("@")[0], email, password });
    setBusy(false);
    if (res.error) return setError(res.error.message ?? "Something went wrong");
    onDone?.();
  }

  const field =
    "w-full rounded-2xl border-2 border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-[var(--ink)] outline-none";

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm space-y-3 rounded-[28px] border-2 border-[var(--line)] bg-[var(--paper)] p-6 shadow-[5px_5px_0_var(--line)]"
    >
      <h2 className="font-head text-2xl">
        {mode === "in" ? "Welcome back" : "Create account"}
      </h2>
      {mode === "up" && (
        <input className={field} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      )}
      <input className={field} type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={field} type="password" placeholder="Password (8+ chars)" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="text-sm text-[var(--cta)]">{error}</p>}
      <button
        disabled={busy}
        className="w-full rounded-full border-2 border-[var(--line)] bg-[var(--cta)] py-2.5 font-semibold text-[var(--on-cta)] shadow-[3px_3px_0_var(--line)] hover:bg-[var(--cta-hover)] disabled:opacity-60"
      >
        {busy ? "…" : mode === "in" ? "Sign in" : "Sign up"}
      </button>
      <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-sm text-[var(--sub)] underline">
        {mode === "in" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>
    </form>
  );
}