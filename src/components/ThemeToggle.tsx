"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

// The <html data-theme> attribute is set before first paint by the inline script in layout.tsx
// (saved choice, else the system setting). This button just flips it and remembers the choice.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const getTheme = (): Theme | null => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
// unknown during server render, so server and client markup match
const getServerTheme = (): Theme | null => null;

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("kaizen-theme", next);
    } catch {
      /* private mode: the choice just won't persist */
    }
  }

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme ? label : "Change theme"}
      title={theme ? label : "Change theme"}
      className="grid h-10 w-10 place-items-center rounded-full border-2 border-line bg-paper text-ink shadow-[3px_3px_0_var(--line)] transition hover:bg-raise active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
    >
      {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : theme === "light" ? <Moon size={18} aria-hidden="true" /> : null}
    </button>
  );
}
