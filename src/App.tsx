import { Clock3, Flame, Scissors } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ComparisonSection } from './components/ComparisonSection';
import { CompareCard } from './components/CompareCard';
import { ControlsPanel } from './components/ControlsPanel';
import { EmptyState } from './components/EmptyState';
import { type ExampleScript } from './components/ExampleScripts';
import { ExportBar } from './components/ExportBar';
import { HistoryDrawer } from './components/HistoryDrawer';
import { HookCard } from './components/HookCard';
import { ModeToggle } from './components/ModeToggle';
import { PlatformSelector } from './components/PlatformSelector';
import { RoastCard } from './components/RoastCard';
import { ScriptInput } from './components/ScriptInput';
import { SkeletonCard } from './components/SkeletonCard';
import { TemplateLibrary } from './components/TemplateLibrary';
import { type ScriptTemplate } from './data/templates';
import { useHistory } from './hooks/useHistory';
import {
  generateHooks,
  HookLabApiError,
  rewriteHook,
} from './services/hooksApi';
import type {
  Audience,
  GenerateHooksRequest,
  HistoryEntry,
  HookLanguage,
  HookResult,
  HookWindow,
  Intensity,
  Mode,
  Platform,
  RewriteDirection,
  RoastCritique,
  Tone,
  CompareHooksResponse,
} from './types/hooks';

const skeletonItems = Array.from({ length: 10 }, (_, index) => index);

function App() {
  const [script, setScript] = useState('');
  const [platform, setPlatform] = useState<Platform>('YouTube Shorts');
  const [tone, setTone] = useState<Tone>('Punchy');
  const [audience, setAudience] = useState<Audience>('Creators');
  const [intensity, setIntensity] = useState<Intensity>('Sharp');
  const [language, setLanguage] = useState<HookLanguage>('English');
  const [hookWindow, setHookWindow] = useState<HookWindow>(5);
  const [mode, setMode] = useState<Mode>('generate');
  const [hookB, setHookB] = useState('');
  const [hooks, setHooks] = useState<HookResult[]>([]);
  const [roast, setRoast] = useState<RoastCritique | null>(null);
  const [compareResult, setCompareResult] = useState<CompareHooksResponse | null>(null);
  const [roastOriginalHook, setRoastOriginalHook] = useState('');
  const [previousHooks, setPreviousHooks] = useState<
    Partial<Record<HookResult['framework'], HookResult>>
  >({});
  const [currentRequest, setCurrentRequest] =
    useState<GenerateHooksRequest | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [surfaceError, setSurfaceError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rewritingFramework, setRewritingFramework] = useState<
    HookResult['framework'] | null
  >(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { entries, saveEntry, deleteEntry, clearEntries } = useHistory();

  const minLength = mode === 'roast' ? 5 : 20;

  const canSubmit = useMemo(() => {
    if (isLoading) return false;

    const isHookAValid = script.trim().length >= minLength && script.trim().length <= 3000;
    if (mode === 'compare') {
      const isHookBValid = hookB.trim().length >= minLength && hookB.trim().length <= 3000;
      return isHookAValid && isHookBValid;
    }
    return isHookAValid;
  }, [script, hookB, isLoading, minLength, mode]);

  const sortedHooks = useMemo(
    () =>
      [...hooks].sort((first, second) => {
        if (first.best_pick === second.best_pick) {
          return 0;
        }

        return first.best_pick ? -1 : 1;
      }),
    [hooks],
  );

  const buildRequest = (): GenerateHooksRequest => ({
    script: script.trim(),
    hookB: mode === 'compare' ? hookB.trim() : undefined,
    platform,
    tone,
    audience,
    intensity,
    language,
    hookWindow,
    mode,
  });

  const handleError = (caughtError: unknown): void => {
    if (caughtError instanceof HookLabApiError) {
      if (caughtError.status === 400) {
        setInputError(caughtError.message);
        return;
      }

      setSurfaceError(caughtError.message);
      return;
    }

    setSurfaceError('Something went wrong on our end. Try again.');
  };

  const cutHooks = async (): Promise<void> => {
    const request = buildRequest();

    if (!canSubmit) {
      setInputError(`Script must be between ${minLength} and 3000 characters.`);
      return;
    }

    setIsLoading(true);
    setInputError(null);
    setSurfaceError(null);
    setPreviousHooks({});

    try {
      const response = await generateHooks(request);

      if (response.mode === 'compare') {
        setHooks([]);
        setRoast(null);
        setRoastOriginalHook('');
        setCompareResult(response.compare);
        setCurrentRequest(request);
        saveEntry(request, undefined, undefined, response.compare);
      } else if (response.mode === 'roast') {
        setHooks(response.hooks);
        setRoast(response.roast);
        setRoastOriginalHook(request.script);
        setCompareResult(null);
        setCurrentRequest(request);
        saveEntry(request, response.hooks, response.roast);
      } else {
        setHooks(response.hooks);
        setRoast(null);
        setRoastOriginalHook('');
        setCompareResult(null);
        setCurrentRequest(request);
        saveEntry(request, response.hooks);
      }
    } catch (caughtError) {
      setHooks([]);
      setRoast(null);
      setCompareResult(null);
      setRoastOriginalHook('');
      handleError(caughtError);
    } finally {
      setIsLoading(false);
    }
  };

  const rewriteCard = async (
    hook: HookResult,
    direction: RewriteDirection,
  ): Promise<void> => {
    setSurfaceError(null);
    setRewritingFramework(hook.framework);

    try {
      const rewritten = await rewriteHook({
        hook: hook.text,
        framework: hook.framework,
        direction,
        platform,
        hookWindow,
      });

      setPreviousHooks((currentPreviousHooks) => ({
        ...currentPreviousHooks,
        [hook.framework]: currentPreviousHooks[hook.framework] ?? hook,
      }));
      setHooks((currentHooks) =>
        currentHooks.map((currentHook) =>
          currentHook.framework === hook.framework
            ? {
                ...currentHook,
                text: rewritten.text,
                why: rewritten.why,
                scores: rewritten.scores,
              }
            : currentHook,
        ),
      );
    } catch (caughtError) {
      handleError(caughtError);
    } finally {
      setRewritingFramework(null);
    }
  };

  const undoRewrite = (hook: HookResult): void => {
    const previousHook = previousHooks[hook.framework];

    if (!previousHook) {
      return;
    }

    setHooks((currentHooks) =>
      currentHooks.map((currentHook) =>
        currentHook.framework === hook.framework ? previousHook : currentHook,
      ),
    );
    setPreviousHooks((currentPreviousHooks) => {
      const nextPreviousHooks = { ...currentPreviousHooks };

      delete nextPreviousHooks[hook.framework];
      return nextPreviousHooks;
    });
  };

  const restoreHistoryEntry = (entry: HistoryEntry): void => {
    setScript(entry.script);
    setHookB(entry.hookB ?? '');
    setPlatform(entry.platform);
    setTone(entry.tone);
    setAudience(entry.audience);
    setIntensity(entry.intensity);
    setLanguage(entry.language);
    setHookWindow(entry.hookWindow);
    setMode(entry.mode);
    setHooks(entry.hooks ?? []);
    setRoast(entry.roast ?? null);
    setCompareResult(entry.compare ?? null);
    setRoastOriginalHook(entry.roast ? entry.script : '');
    setCurrentRequest({
      script: entry.script,
      hookB: entry.hookB,
      platform: entry.platform,
      tone: entry.tone,
      audience: entry.audience,
      intensity: entry.intensity,
      language: entry.language,
      hookWindow: entry.hookWindow,
      mode: entry.mode,
    });
    setInputError(null);
    setSurfaceError(null);
    setPreviousHooks({});
  };

  const selectExample = (example: ExampleScript): void => {
    setScript(example.script);
    setTone(example.defaults.tone);
    setAudience(example.defaults.audience);
    setIntensity(example.defaults.intensity);
    setLanguage(example.defaults.language);
    setHookWindow(example.defaults.hookWindow);
    setMode('generate');
    setInputError(null);
  };

  const selectTemplate = (template: ScriptTemplate): void => {
    setScript(template.script);
    setPlatform(template.defaults.platform);
    setTone(template.defaults.tone);
    setAudience(template.defaults.audience);
    setLanguage(template.defaults.language);
    setHookWindow(template.defaults.hookWindow);
    setMode('generate');
    setInputError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleModeChange = (nextMode: Mode): void => {
    setMode(nextMode);
    setInputError(null);
  };

  return (
    <main className="min-h-screen bg-bg text-primary">
      <div className="mx-auto flex min-h-screen w-full max-w-[1720px] flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="grid gap-6 border-b border-white/10 pb-6 lg:grid-cols-[1fr_auto_auto] lg:items-end">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-amber">
              00:00 Hook Lab
            </p>
            <h1 className="max-w-4xl font-display text-[clamp(2.75rem,8vw,6.75rem)] font-semibold leading-[0.9] tracking-normal">
              Cut the first few seconds before the edit.
            </h1>
          </div>
          <div className="max-w-sm border-l-2 border-cyan/50 pl-4 font-mono text-sm leading-6 text-muted">
            Ten frameworks. One opening beat. Built for creators tuning
            retention before the timeline gets crowded.
          </div>
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            aria-label="Open history"
            className="grid h-11 w-11 place-items-center rounded-[4px] border border-white/10 text-muted transition-colors hover:border-cyan/50 hover:text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan lg:self-start"
          >
            <Clock3 size={19} />
          </button>
        </header>

        <section className="grid flex-1 gap-6 py-6 xl:grid-cols-[minmax(380px,0.82fr)_minmax(0,1.18fr)]">
          <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void cutHooks();
              }}
            >
              <ModeToggle
                mode={mode}
                disabled={isLoading}
                onChange={handleModeChange}
              />
              <div>
                <ScriptInput
                  value={script}
                  onChange={setScript}
                  hookB={hookB}
                  onHookBChange={setHookB}
                  language={language}
                  mode={mode}
                  disabled={isLoading}
                />
                {inputError ? (
                  <p className="mt-2 font-mono text-xs text-amber">
                    {inputError}
                  </p>
                ) : null}
              </div>
              <PlatformSelector
                selectedPlatform={platform}
                onChange={setPlatform}
                disabled={isLoading}
              />
              <ControlsPanel
                tone={tone}
                audience={audience}
                intensity={intensity}
                language={language}
                hookWindow={hookWindow}
                disabled={isLoading}
                onToneChange={setTone}
                onAudienceChange={setAudience}
                onIntensityChange={setIntensity}
                onLanguageChange={setLanguage}
                onHookWindowChange={setHookWindow}
              />
              <button
                type="submit"
                disabled={!canSubmit}
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-5 py-3 font-display text-base font-semibold text-bg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-muted sm:w-auto ${
                  mode === 'roast'
                    ? 'bg-red hover:bg-[#dc2626]'
                    : mode === 'compare'
                      ? 'bg-cyan hover:bg-[#06b6d4]'
                      : 'bg-amber hover:bg-[#ff9a57]'
                }`}
              >
                {mode === 'roast' ? (
                  <>
                    <Flame size={18} aria-hidden="true" />
                    Roast My Hook
                  </>
                ) : mode === 'compare' ? (
                  <>
                    <Scissors size={18} aria-hidden="true" />
                    Compare Hooks
                  </>
                ) : (
                  <>
                    <Scissors size={18} aria-hidden="true" />
                    Cut 10 Hooks
                  </>
                )}
              </button>
            </form>

            <ComparisonSection />
            <TemplateLibrary onSelect={selectTemplate} disabled={isLoading} />
          </div>

          <section aria-live="polite" aria-busy={isLoading}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                Timeline Cuts
              </h2>
              <span className="font-mono text-xs text-muted">
                {isLoading
                  ? mode === 'roast'
                    ? 'Roasting'
                    : mode === 'compare'
                      ? 'Comparing'
                      : 'Cutting'
                  : compareResult
                    ? 'Comparison complete'
                    : hooks.length > 0
                      ? `${hooks.length}/10`
                      : 'Standby'}
              </span>
            </div>

            {surfaceError ? (
              <div
                role="alert"
                className="mb-5 rounded-md border border-amber/35 bg-amber/10 px-4 py-3 font-mono text-sm text-amber"
              >
                {surfaceError}
              </div>
            ) : null}

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {skeletonItems.map((item) => (
                  <SkeletonCard key={item} />
                ))}
              </div>
            ) : compareResult ? (
              <>
                <CompareCard compare={compareResult} />
                {currentRequest ? (
                  <ExportBar
                    hooks={[]}
                    request={currentRequest}
                    compare={compareResult}
                  />
                ) : null}
              </>
            ) : sortedHooks.length > 0 ? (
              <>
                {roast ? (
                  <RoastCard roast={roast} originalHook={roastOriginalHook} />
                ) : null}
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {sortedHooks.map((hook, index) => (
                    <HookCard
                      key={hook.framework}
                      hook={hook}
                      index={index}
                      platform={platform}
                      canUndo={Boolean(previousHooks[hook.framework])}
                      isRewriting={rewritingFramework === hook.framework}
                      onRewrite={(direction) => {
                        void rewriteCard(hook, direction);
                      }}
                      onUndo={() => undoRewrite(hook)}
                    />
                  ))}
                </div>
                {currentRequest ? (
                  <ExportBar
                    hooks={sortedHooks}
                    request={currentRequest}
                    roast={roast ?? undefined}
                  />
                ) : null}
              </>
            ) : (
              <EmptyState onSelectExample={selectExample} />
            )}
          </section>
        </section>
      </div>

      <HistoryDrawer
        isOpen={isHistoryOpen}
        entries={entries}
        onClose={() => setIsHistoryOpen(false)}
        onRestore={restoreHistoryEntry}
        onDelete={deleteEntry}
        onClear={clearEntries}
      />
    </main>
  );
}

export default App;
