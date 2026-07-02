import type {
  GenerateHooksRequest,
  GenerateHooksResponse,
  HookResult,
  HookScores,
  RewriteHookRequest,
  RewriteHookResponse,
  RoastCritique,
  CompareHooksResponse,
  CompareAnalysis,
} from '../types/hooks';

export class ViralityAiApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ViralityAiApiError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isHookScores = (value: unknown): value is HookScores => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isScore(value.curiosity) &&
    isScore(value.clarity) &&
    isScore(value.scroll_stop) &&
    isScore(value.platform_fit)
  );
};

const isHookResult = (value: unknown): value is HookResult => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.framework === 'string' &&
    typeof value.text === 'string' &&
    typeof value.why === 'string' &&
    (value.timecode === '00:00–00:05' || value.timecode === '00:00–00:08') &&
    isHookScores(value.scores) &&
    typeof value.best_pick === 'boolean'
  );
};

const isRewriteHookResponse = (
  value: unknown,
): value is RewriteHookResponse => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.text === 'string' &&
    typeof value.why === 'string' &&
    isHookScores(value.scores)
  );
};

const isRoastCritique = (value: unknown): value is RoastCritique => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.grade === 'string' &&
    Array.isArray(value.bullets) &&
    value.bullets.length >= 4 &&
    value.bullets.length <= 6 &&
    value.bullets.every(
      (bullet: unknown) => typeof bullet === 'string' && bullet.length > 0,
    ) &&
    typeof value.biggest_fix === 'string' &&
    value.biggest_fix.length > 0
  );
};

const isCompareAnalysis = (value: unknown): value is CompareAnalysis => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.winner === 'A' || value.winner === 'B') &&
    typeof value.reason === 'string' &&
    value.reason.length > 0
  );
};

const isCompareHooksResponse = (
  value: unknown,
): value is CompareHooksResponse => {
  if (!isRecord(value)) {
    return false;
  }

  if (value.winner !== 'A' && value.winner !== 'B') {
    return false;
  }

  if (!isRecord(value.analysis)) {
    return false;
  }

  return (
    typeof value.confidence === 'number' &&
    typeof value.summary === 'string' &&
    typeof value.improvedHook === 'string' &&
    isCompareAnalysis(value.analysis.clarity) &&
    isCompareAnalysis(value.analysis.curiosity) &&
    isCompareAnalysis(value.analysis.emotion) &&
    isCompareAnalysis(value.analysis.retention)
  );
};

const parseGenerateHooksResponse = (value: unknown): GenerateHooksResponse => {
  if (!isRecord(value)) {
    throw new Error('Invalid response shape.');
  }

  if (value.mode === 'compare') {
    if (isCompareHooksResponse(value.compare)) {
      return { mode: 'compare', compare: value.compare };
    }
    throw new Error('Invalid compare payload.');
  }

  if (!Array.isArray(value.hooks) || !value.hooks.every(isHookResult)) {
    throw new Error('Invalid hooks payload.');
  }

  if (value.mode === 'roast') {
    if (value.roast !== undefined && isRoastCritique(value.roast)) {
      return { mode: 'roast', hooks: value.hooks, roast: value.roast };
    }
    throw new Error('Invalid roast payload.');
  }

  return { mode: 'generate', hooks: value.hooks };
};

const parseErrorMessage = (value: unknown): string | null => {
  if (!isRecord(value)) {
    return null;
  }

  const error = value.error;

  return typeof error === 'string' && error.trim().length > 0 ? error : null;
};

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    throw new ViralityAiApiError("Couldn't read the hook cut. Try again.", 500);
  }
};

const throwApiError = (status: number, payload: unknown): never => {
  if (status === 429) {
    throw new ViralityAiApiError(
      "Slow down — you've hit the rate limit. Try again in a bit.",
      status,
    );
  }

  if (status === 400) {
    throw new ViralityAiApiError(
      parseErrorMessage(payload) ?? 'Check the input and try again.',
      status,
    );
  }

  throw new ViralityAiApiError(
    'Something went wrong on our end. Try again.',
    status,
  );
};

export const generateHooks = async (
  request: GenerateHooksRequest,
): Promise<GenerateHooksResponse> => {
  const response = await fetch('/api/generate-hooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const payload = await readJson(response);

  if (!response.ok) {
    throwApiError(response.status, payload);
  }

  return parseGenerateHooksResponse(payload);
};

export const rewriteHook = async (
  request: RewriteHookRequest,
): Promise<RewriteHookResponse> => {
  const response = await fetch('/api/rewrite-hook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const payload = await readJson(response);

  if (!response.ok) {
    throwApiError(response.status, payload);
  }

  if (!isRewriteHookResponse(payload)) {
    throw new ViralityAiApiError(
      'Something went wrong on our end. Try again.',
      500,
    );
  }

  return payload;
};
