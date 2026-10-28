import { Suspense } from "react";
import AuthDialog from "@/components/AuthDialog";
import { getSession } from "@/lib/session";

async function SessionView() {
  const session = await getSession();
  return session ? (
    <p>Signed in as {session.user.email}</p>
  ) : (
    <AuthDialog />
  );
}

export default function Home() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <Suspense fallback={<p className="text-[var(--sub)]">Loading…</p>}>
        <SessionView />
      </Suspense>
    </main>
  );
}