import AccountMenu from "@/components/AccountMenu";
import ThemeToggle from "@/components/ThemeToggle";

export default function Header({ user }: { user: { name: string; email: string } | null }) {
  const link = "rounded-full px-3 py-1.5 text-sm font-bold text-sub transition-colors hover:text-ink";
  return (
    <header className="sticky top-0 z-40 border-b-2 border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-2 px-4 sm:gap-4 sm:px-8">
        <a href="#focus" className="font-head text-xl font-extrabold uppercase tracking-wide text-ink sm:text-2xl">
          Kaizen<span className="text-cta">.</span>
        </a>
        <nav aria-label="Sections" className="flex flex-1 gap-1">
          <a href="#focus" className={`${link} hidden sm:inline-block`}>Focus</a>
          <a href="#workouts" className={link}>Workouts</a>
        </nav>
        <ThemeToggle />
        <AccountMenu user={user} />
      </div>
    </header>
  );
}
