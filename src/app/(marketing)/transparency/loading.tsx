export default function TransparencyLoading() {
  return (
    <div className="space-y-16 animate-pulse">
      <div className="space-y-4 py-20 text-center">
        <div className="mx-auto h-7 w-48 rounded-full bg-border-subtle dark:bg-[rgba(255,255,255,0.08)]" />
        <div className="mx-auto h-12 w-2/3 rounded bg-border-subtle dark:bg-[rgba(255,255,255,0.08)]" />
        <div className="mx-auto h-6 w-1/2 rounded bg-border-subtle dark:bg-[rgba(255,255,255,0.06)]" />
      </div>
      <div className="mx-auto grid max-w-5xl gap-px md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4 rounded-xl p-8">
            <div className="h-4 w-32 rounded bg-border-subtle dark:bg-[rgba(255,255,255,0.06)]" />
            <div className="h-10 w-24 rounded bg-border-subtle dark:bg-[rgba(255,255,255,0.08)]" />
            <div className="h-3 w-full rounded bg-border-subtle dark:bg-[rgba(255,255,255,0.06)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
