"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import AuthDialog from "@/components/AuthDialog";
import { signOut } from "@/lib/auth-client";

type User = { name: string; email: string };

// "Sign in" button (or avatar menu when signed in). Anything on the page can open the sign-in
// dialog by dispatching a "kaizen:signin" event on window.
export default function AccountMenu({ user }: { user: User | null }) {
  const router = useRouter();
  const [dialog, setDialog] = useState(false);
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const open = () => setDialog(true);
    window.addEventListener("kaizen:signin", open);
    return () => window.removeEventListener("kaizen:signin", open);
  }, []);

  useEffect(() => {
    if (!menu && !dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(false);
      setDialog(false);
    };
    const onDown = (e: MouseEvent) => {
      if (menu && ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [menu, dialog]);

  return (
    <div className="relative" ref={ref}>
      {user ? (
        <>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menu}
            aria-label="Account menu"
            onClick={() => setMenu((o) => !o)}
            className="grid h-10 w-10 place-items-center rounded-full border-2 border-line bg-cta font-head text-lg font-extrabold uppercase text-on-cta shadow-[3px_3px_0_var(--line)]"
          >
            {(user.name || user.email)[0]}
          </button>
          {menu && (
            <div role="menu" className="absolute right-0 top-12 z-50 w-56 rounded-3xl border-2 border-line bg-paper p-2 shadow-sticker">
              <p className="truncate px-3 pb-1 pt-2 text-sm font-bold">{user.name}</p>
              <p className="truncate px-3 pb-2 text-xs text-sub">{user.email}</p>
              <button
                type="button"
                role="menuitem"
                className="w-full rounded-2xl px-3 py-2 text-left text-sm font-bold hover:bg-raise"
                onClick={async () => {
                  await signOut();
                  setMenu(false);
                  router.refresh();
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={() => setDialog(true)}
          className="whitespace-nowrap rounded-full border-2 border-line bg-cta px-4 py-2 text-sm font-bold sm:px-5 text-on-cta shadow-[3px_3px_0_var(--line)] transition hover:bg-cta-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          Sign in
        </button>
      )}

      {dialog && !user && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[var(--scrim)] p-4"
          onClick={(e) => e.target === e.currentTarget && setDialog(false)}
        >
          <div className="relative w-full max-w-sm">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setDialog(false)}
              className="absolute -right-2 -top-2 z-10 grid h-9 w-9 place-items-center rounded-full border-2 border-line bg-raise hover:bg-cta hover:text-on-cta"
            >
              <X size={16} />
            </button>
            <AuthDialog
              onDone={() => {
                setDialog(false);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
