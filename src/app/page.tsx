import { Suspense } from "react";
import Header from "@/components/Header";
import FocusTimer from "@/components/timer/FocusTimer";
import WorkoutCalendar from "@/components/workouts/WorkoutCalendar";
import { getSession } from "@/lib/session";

async function Home() {
  const session = await getSession();
  const user = session ? { name: session.user.name, email: session.user.email } : null;

  return (
    <>
      <Header user={user} />
      <main>
        {/* Timer, session stats, and a compact gem calendar share the first screen. */}
        <section id="focus" className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-[1180px] flex-col items-center justify-center px-4 py-6 sm:px-8">
          <FocusTimer signedIn={!!user} />
        </section>

        <section id="workouts" className="mx-auto max-w-[1180px] px-4 pb-24 pt-6 sm:px-8">
          <WorkoutCalendar signedIn={!!user} />
        </section>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="grid min-h-svh place-items-center text-sub">Loading…</p>}>
      <Home />
    </Suspense>
  );
}
