import { modes, type Mode } from '../types/hooks';

interface ModeToggleProps {
  mode: Mode;
  disabled?: boolean;
  onChange: (mode: Mode) => void;
}

const modeLabels: Record<Mode, string> = {
  generate: 'Generate Hooks',
  roast: 'Roast My Hook',
  compare: 'Compare Hooks',
};

export function ModeToggle({
  mode,
  disabled = false,
  onChange,
}: ModeToggleProps) {
  return (
    <div className="flex rounded-md border border-white/10 bg-black/20 p-1">
      {modes.map((value) => {
        const isSelected = value === mode;

        let selectedClasses = '';
        if (value === 'roast') {
          selectedClasses = 'bg-red text-bg shadow-amber';
        } else if (value === 'compare') {
          selectedClasses = 'bg-cyan text-bg shadow-cyan';
        } else {
          selectedClasses = 'bg-amber text-bg shadow-amber';
        }

        return (
          <button
            key={value}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            onClick={() => onChange(value)}
            className={`flex-1 rounded-[4px] px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:opacity-60 ${
              isSelected
                ? selectedClasses
                : 'text-muted hover:bg-white/5 hover:text-cyan'
            }`}
          >
            {modeLabels[value]}
          </button>
        );
      })}
    </div>
  );
}
