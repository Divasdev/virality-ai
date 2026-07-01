import type { RoastCritique } from '../types/hooks';

interface RoastCardProps {
  roast: RoastCritique;
  originalHook: string;
}

export function RoastCard({ roast, originalHook }: RoastCardProps) {
  return (
    <article
      className="mb-6 rounded-md border border-red/30 bg-red/5 p-5 shadow-panel opacity-0 motion-safe:animate-cardIn"
      style={{
        boxShadow:
          '0 0 0 1px rgba(239, 68, 68, 0.2), 0 0 18px rgba(239, 68, 68, 0.08)',
      }}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="inline-flex rounded-[3px] border border-red/40 bg-red/15 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-red">
          Current Hook
        </span>
        <span className="inline-flex rounded-[3px] border border-red/40 bg-red/15 px-2.5 py-1 font-display text-lg font-semibold text-red">
          {roast.grade}
        </span>
      </div>

      <p className="mb-5 text-sm italic leading-6 text-muted">
        &ldquo;{originalHook}&rdquo;
      </p>

      <ul className="space-y-2.5">
        {roast.bullets.map((bullet, index) => (
          <li
            key={index}
            className="flex items-start gap-2.5 text-sm leading-6 text-primary"
          >
            <span className="mt-0.5 shrink-0 text-red" aria-hidden="true">
              ✕
            </span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 border-t border-red/15 pt-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-red">
          Biggest Fix
        </p>
        <p className="mt-2 text-sm leading-6 text-primary">
          {roast.biggest_fix}
        </p>
      </div>
    </article>
  );
}
