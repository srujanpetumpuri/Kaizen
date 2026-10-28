import { Suspense } from "react";
import { ChevronDown } from "lucide-react";
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
        {/* The timer fills the first screen; the workout planner is revealed by scrolling down. */}
        <section id="focus" className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-[1180px] flex-col items-center justify-center px-4 pb-24 pt-8 sm:px-8">
          <FocusTimer signedIn={!!user} />
          <a
            href="#workouts"
            className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center text-sm font-bold text-sub transition-colors hover:text-ink"
          >
            Workouts
            <ChevronDown size={22} className="animate-bounce motion-reduce:animate-none" aria-hidden="true" />
          </a>
        </section>

        <section id="workouts" className="mx-auto max-w-[1180px] px-4 pb-24 pt-10 sm:px-8">
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
