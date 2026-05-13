export default function VehiclePassportLoading() {
  return (
    <main className="mx-auto max-w-[860px] space-y-4 p-4 animate-pulse">
      <div className="glass-card space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="h-6 w-56 rounded bg-border-subtle dark:bg-[rgba(255,255,255,0.08)]" />
            <div className="h-4 w-44 rounded bg-border-subtle dark:bg-[rgba(255,255,255,0.06)]" />
          </div>
          <div className="h-12 w-24 rounded-xl bg-border-subtle dark:bg-[rgba(255,255,255,0.08)]" />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-7 w-40 rounded-full bg-border-subtle dark:bg-[rgba(255,255,255,0.06)]" />
          <div className="h-7 w-32 rounded-full bg-border-subtle dark:bg-[rgba(255,255,255,0.06)]" />
          <div className="h-7 w-36 rounded-full bg-border-subtle dark:bg-[rgba(255,255,255,0.06)]" />
        </div>
      </div>
      <div className="glass-card space-y-4 p-5">
        <div className="h-5 w-44 rounded bg-border-subtle dark:bg-[rgba(255,255,255,0.08)]" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border-default bg-base p-4 space-y-2">
            <div className="h-4 w-40 rounded bg-border-subtle dark:bg-[rgba(255,255,255,0.06)]" />
            <div className="h-3 w-56 rounded bg-border-subtle dark:bg-[rgba(255,255,255,0.05)]" />
            <div className="mt-2 h-7 w-32 rounded-lg bg-border-subtle dark:bg-[rgba(255,255,255,0.05)]" />
          </div>
        ))}
      </div>
    </main>
  );
}
