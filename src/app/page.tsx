export default function Page() {
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-6xl">Kaizen</h1>
      <div className="w-full rounded-sticker border-2 border-line bg-paper p-8 shadow-sticker">
        <p className="mb-4 font-semibold text-sub">Sunrise theme check</p>
        <button className="rounded-full border-2 border-line bg-cta px-6 py-3 font-extrabold text-on-cta hover:bg-cta-hover">
          Start focus
        </button>
      </div>
    </main>
  );
}