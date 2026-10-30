"use client";

import { useSyncExternalStore } from "react";
import { Flame, Moon, Sun, type LucideIcon } from "lucide-react";

type Theme = "light" | "night" | "red";

// Click order. The button shows the icon of the theme you'll get next.
const ORDER: Theme[] = ["light", "night", "red"];
const META: Record<Theme, { label: string; Icon: LucideIcon }> = {
  light: { label: "Light", Icon: Sun },
  night: { label: "Night", Icon: Moon },
  red: { label: "Red", Icon: Flame },
};

// The <html data-theme> attribute is set before first paint by the inline script in layout.tsx
// (saved choice, else the system setting). This button just cycles it and remembers the choice.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const getTheme = (): Theme | null => {
  const t = document.documentElement.dataset.theme;
  return t === "night" || t === "red" ? t : "light";
};
// unknown during server render, so server and client markup match
const getServerTheme = (): Theme | null => null;

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme ?? "light") + 1) % ORDER.length];
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("kaizen-theme", next);
    } catch {
      /* private mode: the choice just won't persist */
    }
  }

  const next = theme ? ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length] : null;
  const label = next ? `Switch to ${META[next].label} theme` : "Change theme";
  const Icon = next ? META[next].Icon : null;
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className="grid h-10 w-10 place-items-center rounded-full border-2 border-line bg-paper text-ink shadow-[3px_3px_0_var(--shadow-c)] transition hover:bg-raise active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
    >
      {Icon ? <Icon size={18} aria-hidden="true" /> : null}
    </button>
  );
}
