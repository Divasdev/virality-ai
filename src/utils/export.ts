import type { GenerateHooksRequest, HookResult } from '../types/hooks';

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
): string => {
  const bestPick = hooks.find((hook) => hook.best_pick) ?? hooks[0];
  const allHooks = hooks
    .map((hook, index) => `${index + 1}. [${hook.framework}] ${hook.text}`)
    .join('\n');

  return `HOOK LAB EXPORT
Script: ${request.script.slice(0, 100)}${request.script.length > 100 ? '...' : ''}
Platform: ${request.platform} | Tone: ${request.tone} | Audience: ${request.audience}
Generated: ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ BEST PICK
[${bestPick?.framework ?? 'BEST PICK'}]
${bestPick?.text ?? ''}
Why: ${bestPick?.why ?? ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━
ALL HOOKS
${allHooks}
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
