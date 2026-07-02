import { BookTemplate } from 'lucide-react';

import {
  templateCategories,
  templates,
  type ScriptTemplate,
  type TemplateCategory,
} from '../data/templates';

interface TemplateLibraryProps {
  onSelect: (template: ScriptTemplate) => void;
  disabled?: boolean;
}

export function TemplateLibrary({
  onSelect,
  disabled = false,
}: TemplateLibraryProps) {
  // Group templates by category
  const groupedTemplates = templateCategories.reduce(
    (acc, category) => {
      acc[category] = templates.filter((t) => t.category === category);
      return acc;
    },
    {} as Record<TemplateCategory, ScriptTemplate[]>,
  );

  return (
    <section className="mt-8 rounded-xl border border-white/5 bg-surface/50 p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-cyan/10 text-cyan">
          <BookTemplate size={20} />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-primary">
            Template Library
          </h2>
          <p className="text-sm text-muted">
            Try Virality AI instantly with realistic creator scripts.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {templateCategories.map((category) => {
          const categoryTemplates = groupedTemplates[category];
          if (!categoryTemplates || categoryTemplates.length === 0) return null;

          return (
            <div key={category}>
              <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.1em] text-muted">
                {category}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {categoryTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(template)}
                    className="flex flex-col items-start gap-2 rounded-lg border border-white/5 bg-black/20 p-4 text-left transition-all hover:border-cyan/30 hover:bg-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="font-semibold text-primary">
                      {template.title}
                    </span>
                    <span className="line-clamp-2 text-sm text-muted">
                      "{template.script}"
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
