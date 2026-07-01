import type { HookLanguage, Mode } from '../types/hooks';

interface ScriptInputProps {
  value: string;
  onChange: (value: string) => void;
  hookB?: string;
  onHookBChange?: (value: string) => void;
  language: HookLanguage;
  mode?: Mode;
  disabled?: boolean;
}

const placeholders: Record<HookLanguage, string> = {
  English: 'Paste your video script or describe your idea...',
  Hinglish: 'Apna video script ya idea yahan paste karo...',
  Hindi: 'अपनी वीडियो स्क्रिप्ट या आइडिया यहाँ लिखें...',
};

const roastPlaceholders: Record<HookLanguage, string> = {
  English: 'Paste your existing hook here...',
  Hinglish: 'Apna existing hook yahan paste karo...',
  Hindi: 'अपना मौजूदा हुक यहाँ पेस्ट करें...',
};

const labels: Record<Mode, string> = {
  generate: 'Script Slate',
  roast: 'Your Hook',
  compare: 'Hook A',
};

export function ScriptInput({
  value,
  onChange,
  hookB = '',
  onHookBChange,
  language,
  mode = 'generate',
  disabled = false,
}: ScriptInputProps) {
  const placeholder =
    mode === 'roast' ? roastPlaceholders[language] : placeholders[language];
  const minLength = mode === 'roast' ? 5 : 20;

  if (mode === 'compare') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-3 block font-mono text-xs uppercase tracking-[0.18em] text-muted">
            {labels.compare}
          </span>
          <textarea
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            minLength={minLength}
            rows={6}
            className="w-full resize-y rounded-md border border-white/10 border-t-2 border-t-cyan bg-surface px-5 py-5 font-mono text-sm leading-7 text-primary shadow-panel outline-none transition-colors placeholder:text-muted/70 focus:border-cyan focus:ring-2 focus:ring-cyan/30 disabled:cursor-not-allowed disabled:opacity-70 min-h-[160px]"
          />
        </label>
        <label className="block">
          <span className="mb-3 block font-mono text-xs uppercase tracking-[0.18em] text-muted">
            Hook B
          </span>
          <textarea
            value={hookB}
            disabled={disabled}
            onChange={(event) => onHookBChange?.(event.target.value)}
            placeholder={placeholder}
            minLength={minLength}
            rows={6}
            className="w-full resize-y rounded-md border border-white/10 border-t-2 border-t-cyan bg-surface px-5 py-5 font-mono text-sm leading-7 text-primary shadow-panel outline-none transition-colors placeholder:text-muted/70 focus:border-cyan focus:ring-2 focus:ring-cyan/30 disabled:cursor-not-allowed disabled:opacity-70 min-h-[160px]"
          />
        </label>
      </div>
    );
  }

  return (
    <label className="block">
      <span className="mb-3 block font-mono text-xs uppercase tracking-[0.18em] text-muted">
        {labels[mode]}
      </span>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        minLength={minLength}
        rows={mode === 'roast' ? 4 : 10}
        className={`w-full resize-y rounded-md border border-white/10 border-t-2 bg-surface px-5 py-5 font-mono text-sm leading-7 text-primary shadow-panel outline-none transition-colors placeholder:text-muted/70 focus:border-cyan focus:ring-2 focus:ring-cyan/30 disabled:cursor-not-allowed disabled:opacity-70 ${
          mode === 'roast'
            ? 'min-h-[120px] border-t-red focus:border-t-red'
            : 'min-h-[250px] border-t-amber focus:border-t-amber'
        }`}
      />
    </label>
  );
}
