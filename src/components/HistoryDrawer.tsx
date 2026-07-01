import { Trash2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import type { HistoryEntry } from '../types/hooks';

interface HistoryDrawerProps {
  isOpen: boolean;
  entries: HistoryEntry[];
  onClose: () => void;
  onRestore: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

const formatRelativeTime = (timestamp: number): string => {
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};

export function HistoryDrawer({
  isOpen,
  entries,
  onClose,
  onRestore,
  onDelete,
  onClear,
}: HistoryDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-black/55"
      onMouseDown={(event) => {
        if (
          panelRef.current &&
          !panelRef.current.contains(event.target as Node)
        ) {
          onClose();
        }
      }}
    >
      <aside
        ref={panelRef}
        className="ml-auto flex h-full w-full max-w-md flex-col border-l border-white/10 bg-surface shadow-panel"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-amber">
              History
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-primary">
              Previous Cuts
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close history"
            className="grid h-10 w-10 place-items-center rounded-[4px] border border-white/10 text-muted transition-colors hover:text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {entries.length > 0 ? (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-[1fr_auto] gap-3 rounded-md border border-white/10 bg-black/15 p-3"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onRestore(entry);
                      onClose();
                    }}
                    className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                        {formatRelativeTime(entry.timestamp)}
                      </span>
                      <span className="rounded-[3px] border border-amber/30 bg-amber/10 px-1.5 py-0.5 font-mono text-[10px] text-amber">
                        {entry.platform}
                      </span>
                      {entry.mode === 'roast' ? (
                        <span className="rounded-[3px] border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 font-mono text-[10px] text-red-400">
                          Roast
                        </span>
                      ) : entry.mode === 'compare' ? (
                        <span className="rounded-[3px] border border-cyan/30 bg-cyan/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan">
                          Compare
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-5 text-primary">
                      {entry.mode === 'compare' ? 'A/B Test: ' : ''}
                      {entry.script.slice(0, 60)}
                      {entry.script.length > 60 ? '...' : ''}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(entry.id)}
                    aria-label="Delete history entry"
                    className="grid h-9 w-9 place-items-center rounded-[4px] border border-white/10 text-muted transition-colors hover:border-amber/60 hover:text-amber focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-white/10 p-5 font-mono text-sm text-muted">
              Cuts you generate will appear here.
            </p>
          )}
        </div>

        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            disabled={entries.length === 0}
            onClick={onClear}
            className="w-full rounded-[4px] border border-white/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-amber/60 hover:text-amber focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear All
          </button>
        </div>
      </aside>
    </div>
  );
}
