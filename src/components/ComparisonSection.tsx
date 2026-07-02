import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { GradeBreakdown } from './GradeBreakdown';

const chatGptHooks = [
  'Did you know consistency is the key to success?',
  'Stay disciplined every day.',
  "Here's another way to think about productivity.",
  'Most people give up too early.',
  'What if I told you there was a better way?',
];

const viralityAiExample = {
  framework: 'CURIOSITY GAP' as const,
  text: 'Day 60 almost broke me. Day 90 changed everything.',
  why: 'Drops the viewer into a crisis mid-journey, creating a gap between the low point and the payoff that demands resolution.',
  scores: {
    curiosity: 92,
    clarity: 85,
    scroll_stop: 94,
    platform_fit: 88,
  },
};

export function ComparisonSection() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1500);

    return () => window.clearTimeout(timeout);
  }, [copied]);

  const copyHook = async (): Promise<void> => {
    await navigator.clipboard.writeText(viralityAiExample.text);
    setCopied(true);
  };

  return (
    <section className="mt-6 mb-2">
      <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        Why not ChatGPT?
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {/* ChatGPT card */}
        <div className="rounded-md border border-white/8 bg-black/20 p-5 opacity-70">
          <div className="mb-4">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              ChatGPT
            </p>
            <p className="mt-1 text-[13px] text-muted/70">
              Generic prompt response
            </p>
          </div>
          <ol className="space-y-2.5">
            {chatGptHooks.map((hook, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm leading-6 text-muted"
              >
                <span className="mt-0.5 shrink-0 font-mono text-[11px] text-muted/50">
                  {index + 1}.
                </span>
                <span>{hook}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 border-t border-white/5 pt-3">
            <p className="font-mono text-[10px] text-muted/50">
              No frameworks · No scoring · No explanation
            </p>
          </div>
        </div>

        {/* Virality AI card */}
        <article
          className="relative flex flex-col rounded-md border border-white/10 bg-surface p-5 shadow-panel"
          style={{
            boxShadow:
              '0 0 0 1.5px var(--accent-amber), 0 0 12px rgba(255,138,61,0.15)',
          }}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 inline-flex rounded-[3px] border border-amber/40 bg-amber/15 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-amber">
                Best for YouTube Shorts
              </p>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-amber">
                Virality AI
              </p>
              <p className="mt-1 text-[13px] text-muted/70">
                Purpose-built creator workflow
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void copyHook();
              }}
              aria-label={copied ? 'Hook copied' : 'Copy hook'}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[4px] border border-white/10 text-muted transition-colors hover:border-cyan/50 hover:text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>

          <div className="mb-2">
            <span className="inline-flex rounded-[3px] border border-amber/30 bg-amber/10 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-amber">
              {viralityAiExample.framework}
            </span>
          </div>

          <h3 className="pr-2 font-display text-[clamp(1.15rem,3vw,1.45rem)] font-semibold leading-[1.12] text-primary">
            {viralityAiExample.text}
          </h3>
          <p className="mt-3 text-sm italic leading-6 text-muted">
            <span className="font-semibold text-primary/80">Why it works:</span>{' '}
            {viralityAiExample.why}
          </p>

          <div className="mt-5">
            <GradeBreakdown scores={viralityAiExample.scores} />
          </div>
        </article>
      </div>
    </section>
  );
}
