import { Check, Copy, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { HookResult, Platform, RewriteDirection } from '../types/hooks';
import { GradeBreakdown } from './GradeBreakdown';
import { RewriteChips } from './RewriteChips';

interface HookCardProps {
  hook: HookResult;
  index: number;
  platform: Platform;
  canUndo: boolean;
  isRewriting: boolean;
  onRewrite: (direction: RewriteDirection) => void;
  onUndo: () => void;
}

export function HookCard({
  hook,
  index,
  platform,
  canUndo,
  isRewriting,
  onRewrite,
  onUndo,
}: HookCardProps) {
  const [copied, setCopied] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);
  const previousTextRef = useRef(hook.text);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1500);

    return () => window.clearTimeout(timeout);
  }, [copied]);

  useEffect(() => {
    if (previousTextRef.current === hook.text) {
      return;
    }

    setContentVisible(false);
    previousTextRef.current = hook.text;

    const timeout = window.setTimeout(() => setContentVisible(true), 80);

    return () => window.clearTimeout(timeout);
  }, [hook.text]);

  const copyHook = async (): Promise<void> => {
    await navigator.clipboard.writeText(hook.text);
    setCopied(true);
  };

  const cardStyle = hook.best_pick
    ? {
        boxShadow:
          '0 0 0 1.5px var(--accent-amber), 0 0 12px rgba(255,138,61,0.15)',
      }
    : undefined;

  return (
    <article
      className="relative flex min-h-[360px] flex-col rounded-md border border-white/10 bg-surface p-5 shadow-panel opacity-0 motion-safe:animate-cardIn"
      style={{ animationDelay: `${index * 40}ms`, ...cardStyle }}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          {hook.best_pick ? (
            <p className="mb-2 inline-flex rounded-[3px] border border-amber/40 bg-amber/15 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-amber">
              Best for {platform}
            </p>
          ) : null}
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-amber">
            {hook.framework}
          </p>
          <p className="mt-2 inline-flex rounded-[3px] border border-amber/30 bg-amber/10 px-2 py-1 font-mono text-[11px] text-amber">
            {hook.timecode}
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

      <div
        className={`transition-opacity duration-200 ${
          contentVisible && !isRewriting ? 'opacity-100' : 'opacity-45'
        }`}
      >
        <h2 className="pr-2 font-display text-[clamp(1.35rem,4.2vw,1.8rem)] font-semibold leading-[1.08] text-primary">
          {hook.text}
        </h2>
        <p className="mt-4 text-sm italic leading-6 text-muted">
          <span className="font-semibold text-primary/80">Why it works:</span>{' '}
          {hook.why}
        </p>
      </div>

      <div className="mt-6">
        <GradeBreakdown scores={hook.scores} />
      </div>

      <div className="mt-auto pt-6">
        <div className="mb-3 flex min-h-6 items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            Rewrite This One
          </p>
          {canUndo ? (
            <button
              type="button"
              onClick={onUndo}
              className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-amber transition-colors hover:text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
            >
              <RotateCcw size={12} />
              Undo
            </button>
          ) : null}
        </div>
        <RewriteChips disabled={isRewriting} onRewrite={onRewrite} />
      </div>
    </article>
  );
}
