import type { Audience, HookLanguage, Intensity, Tone } from '../types/hooks';

export interface ExampleScript {
  category: 'FITNESS' | 'BUSINESS' | 'PERSONAL STORY';
  script: string;
  defaults: {
    tone: Tone;
    audience: Audience;
    intensity: Intensity;
    language: HookLanguage;
  };
}

const exampleScripts: ExampleScript[] = [
  {
    category: 'FITNESS',
    script:
      "I trained every day for 90 days without missing once. By day 60, I wanted to quit. Here's what happened to my body — and what nobody tells you about consistency.",
    defaults: {
      tone: 'Story',
      audience: 'Fitness',
      intensity: 'Sharp',
      language: 'English',
    },
  },
  {
    category: 'BUSINESS',
    script:
      "I made ₹2 lakh in one month selling a digital product. I had zero followers, zero email list, and I spent ₹0 on ads. Here's the exact system, step by step.",
    defaults: {
      tone: 'Punchy',
      audience: 'Business',
      intensity: 'Sharp',
      language: 'Hinglish',
    },
  },
  {
    category: 'PERSONAL STORY',
    script:
      "Six months ago I was failing my exams, sleeping 4 hours a night, and genuinely thought I wasn't smart enough. Then I changed one thing. Just one.",
    defaults: {
      tone: 'Story',
      audience: 'Beginners',
      intensity: 'Safe',
      language: 'Hinglish',
    },
  },
];

interface ExampleScriptsProps {
  onSelect: (example: ExampleScript) => void;
}

export function ExampleScripts({ onSelect }: ExampleScriptsProps) {
  return (
    <div className="mt-7 grid gap-3 md:grid-cols-3">
      {exampleScripts.map((example) => (
        <button
          key={example.category}
          type="button"
          onClick={() => onSelect(example)}
          className="rounded-md border border-white/10 bg-black/15 p-4 text-left transition-colors hover:border-amber/60 hover:bg-amber/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
        >
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-amber">
            {example.category}
          </span>
          <span className="mt-2 block text-sm leading-6 text-primary">
            {example.script.slice(0, 80)}...
          </span>
        </button>
      ))}
    </div>
  );
}
