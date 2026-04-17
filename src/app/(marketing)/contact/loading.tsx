export default function ContactLoading() {
  return (
    <div className="space-y-16 animate-pulse">
      <div className="space-y-4 py-16 text-center">
        <div className="mx-auto h-12 w-2/3 rounded bg-border-subtle dark:bg-[rgba(255,255,255,0.08)]" />
        <div className="mx-auto h-6 w-1/2 rounded bg-border-subtle dark:bg-[rgba(255,255,255,0.06)]" />
        <div className="mx-auto h-10 w-36 rounded bg-border-subtle dark:bg-[rgba(255,255,255,0.08)]" />
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3 rounded-xl p-6">
            <div className="h-8 w-8 rounded bg-border-subtle dark:bg-[rgba(255,255,255,0.08)]" />
            <div className="h-5 w-32 rounded bg-border-subtle dark:bg-[rgba(255,255,255,0.08)]" />
            <div className="h-4 w-full rounded bg-border-subtle dark:bg-[rgba(255,255,255,0.06)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
