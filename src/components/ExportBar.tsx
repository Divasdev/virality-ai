import { useEffect, useState } from 'react';

import type {
  GenerateHooksRequest,
  HookResult,
  RoastCritique,
  CompareHooksResponse,
} from '../types/hooks';
import {
  buildHooksCsv,
  buildHooksPlainText,
  buildScriptNotes,
  downloadTextFile,
} from '../utils/export';

interface ExportBarProps {
  hooks: HookResult[];
  request: GenerateHooksRequest;
  roast?: RoastCritique;
  compare?: CompareHooksResponse;
}

export function ExportBar({ hooks, request, roast, compare }: ExportBarProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1500);

    return () => window.clearTimeout(timeout);
  }, [copied]);

  const copyAll = async (): Promise<void> => {
    if (compare) {
      await navigator.clipboard.writeText(compare.improvedHook);
    } else {
      await navigator.clipboard.writeText(buildHooksPlainText(hooks));
    }
    setCopied(true);
  };

  const downloadCsv = (): void => {
    downloadTextFile('hook-lab-hooks.csv', buildHooksCsv(hooks), 'text/csv');
  };

  const downloadNotes = (): void => {
    downloadTextFile(
      'hook-lab-script-notes.txt',
      buildScriptNotes(request, hooks, roast, compare),
      'text/plain',
    );
  };

  return (
    <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
      <button
        type="button"
        onClick={() => {
          void copyAll();
        }}
        className="rounded-[4px] border border-white/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan/60 hover:text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
      >
        {copied ? 'Copied ✓' : compare ? 'Copy Improved Hook' : 'Copy All'}
      </button>
      {!compare ? (
        <button
          type="button"
          onClick={downloadCsv}
          className="rounded-[4px] border border-white/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan/60 hover:text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
        >
          Download CSV
        </button>
      ) : null}
      <button
        type="button"
        onClick={downloadNotes}
        className="rounded-[4px] border border-white/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan/60 hover:text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
      >
        Export as Script Notes
      </button>
    </div>
  );
}
