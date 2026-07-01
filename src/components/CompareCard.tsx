import { Check, Copy, Trophy } from 'lucide-react';
import { useState } from 'react';

import type { CompareHooksResponse } from '../types/hooks';

interface CompareCardProps {
  compare: CompareHooksResponse;
}

export function CompareCard({ compare }: CompareCardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(compare.improvedHook);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy errors
    }
  };

  const metrics = [
    { name: 'Clarity', data: compare.analysis.clarity },
    { name: 'Curiosity', data: compare.analysis.curiosity },
    { name: 'Emotion', data: compare.analysis.emotion },
    { name: 'Retention', data: compare.analysis.retention },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 p-8 text-center shadow-[0_0_40px_-15px_rgba(34,211,238,0.2)]">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan/20 text-cyan">
          <Trophy size={32} />
        </div>
        <div className="mb-2 font-mono text-sm tracking-widest text-cyan uppercase">
          Winner: Hook {compare.winner}
        </div>
        <div className="mb-4 font-display text-4xl font-bold text-primary">
          {compare.confidence}% Confidence
        </div>
        <p className="max-w-md text-lg text-primary/90">{compare.summary}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-surface">
        <div className="border-b border-white/5 bg-black/20 px-6 py-4">
          <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-muted">
            Metric Breakdown
          </h3>
        </div>
        <div className="divide-y divide-white/5">
          {metrics.map((metric) => (
            <div
              key={metric.name}
              className="grid gap-4 p-6 sm:grid-cols-[120px_60px_1fr] sm:items-center"
            >
              <div className="font-semibold text-primary">{metric.name}</div>
              <div className="flex justify-center">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-bold ${
                    metric.data.winner === compare.winner
                      ? 'bg-cyan/20 text-cyan'
                      : 'bg-white/10 text-muted'
                  }`}
                >
                  {metric.data.winner}
                </span>
              </div>
              <div className="text-sm text-muted">{metric.data.reason}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-cyan/30 bg-black/40 p-6 shadow-inner">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-cyan">
            Improved Final Hook
          </h3>
          <button
            type="button"
            onClick={() => {
              void copyToClipboard();
            }}
            className="flex items-center gap-2 rounded text-xs font-semibold text-cyan/70 transition-colors hover:text-cyan"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="font-display text-xl leading-relaxed text-primary">
          {compare.improvedHook}
        </p>
      </div>
    </div>
  );
}
