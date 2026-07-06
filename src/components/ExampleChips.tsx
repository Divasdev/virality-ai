import type { Mode } from '../types/hooks';

interface ExampleChipsProps {
  mode: Mode;
  onLoadScript: (script: string) => void;
  onLoadCompare: (hookA: string, hookB: string) => void;
}

const generateExamples = [
  {
    label: 'Fitness transformation',
    script:
      'I trained for 90 days straight and this is what happened to my body and mind.',
  },
  {
    label: 'Business tip',
    script:
      'Stop cold emailing people about your product. Start solving their biggest problem first.',
  },
  {
    label: 'Personal story',
    script:
      'I quit my corporate job with no backup plan and it was the scariest decision I ever made.',
  },
];

const roastExamples = [
  {
    label: 'A generic hook',
    script: 'In this video I will share my top tips for productivity.',
  },
  {
    label: "A hook that starts with 'I'",
    script: "I've been doing this for 5 years and here's what I learned.",
  },
];

const compareExamples = [
  {
    label: 'Story open vs. bold claim',
    hookA: 'It started with a single cold email at 2 AM on a Tuesday.',
    hookB: 'Cold email is dead. Here is what replaced it.',
  },
];

export function ExampleChips({
  mode,
  onLoadScript,
  onLoadCompare,
}: ExampleChipsProps) {
  const chips =
    mode === 'compare'
      ? compareExamples
      : mode === 'roast'
        ? roastExamples
        : generateExamples;

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={() => {
            if (mode === 'compare' && 'hookA' in chip && 'hookB' in chip) {
              onLoadCompare(chip.hookA, chip.hookB);
            } else if ('script' in chip) {
              onLoadScript(chip.script);
            }
          }}
          className="rounded-full border border-white/10 px-3 py-1 font-mono text-[11px] text-muted transition-colors hover:border-amber/50 hover:text-amber focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
