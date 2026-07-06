import type {
  GenerateHooksRequest,
  HookResult,
  RoastCritique,
  CompareHooksResponse,
} from '../types/hooks';

const csvEscape = (value: string | number): string =>
  `"${String(value).replace(/"/g, '""')}"`;

export const buildHooksPlainText = (hooks: HookResult[]): string =>
  hooks
    .map(
      (hook) =>
        `[${hook.framework}]\nHook: ${hook.text}\nWhy it works: ${hook.why}`,
    )
    .join('\n\n');

export const buildHooksCsv = (hooks: HookResult[]): string => {
  const header = [
    'Framework',
    'Hook',
    'Why It Works',
    'Curiosity',
    'Clarity',
    'Scroll Stop',
    'Platform Fit',
  ];
  const rows = hooks.map((hook) => [
    hook.framework,
    hook.text,
    hook.why,
    hook.scores.curiosity,
    hook.scores.clarity,
    hook.scores.scroll_stop,
    hook.scores.platform_fit,
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => csvEscape(cell)).join(','))
    .join('\n');
};

export const buildScriptNotes = (
  request: GenerateHooksRequest,
  hooks: HookResult[],
  roast?: RoastCritique,
  compare?: CompareHooksResponse,
): string => {
  const modeLabel =
    request.mode === 'roast'
      ? 'Roast'
      : request.mode === 'compare'
        ? 'Compare'
        : 'Generate';

  let roastBlock = '';

  if (roast) {
    roastBlock = `
━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 ROAST
Grade: ${roast.grade}
${roast.bullets.map((bullet) => `✕ ${bullet}`).join('\n')}
Biggest Fix: ${roast.biggest_fix}
`;
  }

  let compareBlock = '';
  if (compare) {
    compareBlock = `
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚖️ A/B TEST RESULTS
Winner: Hook ${compare.winner}
Confidence: ${compare.confidence}%

Summary: ${compare.summary}

Metric Breakdown:
- Clarity: Winner ${compare.analysis.clarity.winner} (${compare.analysis.clarity.reason})
- Curiosity: Winner ${compare.analysis.curiosity.winner} (${compare.analysis.curiosity.reason})
- Emotion: Winner ${compare.analysis.emotion.winner} (${compare.analysis.emotion.reason})
- Retention: Winner ${compare.analysis.retention.winner} (${compare.analysis.retention.reason})

━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ IMPROVED FINAL HOOK
${compare.improvedHook}
`;
  }

  return `HOOKLAB.AI EXPORT
Mode: ${modeLabel}
Script: ${request.script.slice(0, 100)}${request.script.length > 100 ? '...' : ''}
Platform: ${request.platform} | Hook Window: ${request.hookWindow}s | Tone: ${request.tone} | Audience: ${request.audience}
Generated: ${new Date().toLocaleString()}
${roastBlock}${compareBlock}${
    compare
      ? ''
      : `━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ BEST PICK
[${hooks.find((h) => h.best_pick)?.framework ?? hooks[0]?.framework ?? 'BEST PICK'}]
${hooks.find((h) => h.best_pick)?.text ?? hooks[0]?.text ?? ''}
Why: ${hooks.find((h) => h.best_pick)?.why ?? hooks[0]?.why ?? ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━
ALL HOOKS
${hooks.map((hook, index) => `${index + 1}. [${hook.framework}] ${hook.text}`).join('\n')}`
  }
`;
};

export const downloadTextFile = (
  filename: string,
  contents: string,
  type: string,
): void => {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
