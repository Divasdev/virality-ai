export function SkeletonCard() {
  return (
    <article
      aria-hidden="true"
      className="min-h-[360px] rounded-md border border-white/10 bg-surface p-5 shadow-panel"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="h-3 w-32 rounded-[3px] bg-amber/30 motion-safe:animate-skeletonPulse" />
          <div className="h-6 w-24 rounded-[3px] bg-white/10 motion-safe:animate-skeletonPulse" />
        </div>
        <div className="h-10 w-10 rounded-[4px] border border-white/10 bg-white/5 motion-safe:animate-skeletonPulse" />
      </div>
      <div className="mt-9 space-y-3">
        <div className="h-8 w-11/12 rounded-[3px] bg-white/10 motion-safe:animate-skeletonPulse" />
        <div className="h-8 w-4/5 rounded-[3px] bg-white/10 motion-safe:animate-skeletonPulse" />
      </div>
      <div className="mt-5 space-y-2">
        <div className="h-4 w-full rounded-[3px] bg-white/10 motion-safe:animate-skeletonPulse" />
        <div className="h-4 w-10/12 rounded-[3px] bg-white/10 motion-safe:animate-skeletonPulse" />
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-3 w-24 rounded-[3px] bg-cyan/10 motion-safe:animate-skeletonPulse" />
            <div className="h-1.5 rounded-full bg-cyan/10 motion-safe:animate-skeletonPulse" />
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="h-7 w-20 rounded-[4px] border border-white/10 bg-white/5 motion-safe:animate-skeletonPulse"
          />
        ))}
      </div>
    </article>
  );
}
