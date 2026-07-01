import type {
  GenerateHooksRequest,
  GenerateHooksResponse,
  HookResult,
  HookScores,
  RewriteHookRequest,
  RewriteHookResponse,
} from '../types/hooks';

export class HookLabApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'HookLabApiError';
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
    value.timecode === '00:00–00:05' &&
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

const parseGenerateHooksResponse = (value: unknown): GenerateHooksResponse => {
  if (!isRecord(value)) {
    throw new Error('Invalid response shape.');
  }

  if (!Array.isArray(value.hooks) || !value.hooks.every(isHookResult)) {
    throw new Error('Invalid hooks payload.');
  }

  return { hooks: value.hooks };
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
    throw new HookLabApiError("Couldn't read the hook cut. Try again.", 500);
  }
};

const throwApiError = (status: number, payload: unknown): never => {
  if (status === 429) {
    throw new HookLabApiError(
      "Slow down — you've hit the rate limit. Try again in a bit.",
      status,
    );
  }

  if (status === 400) {
    throw new HookLabApiError(
      parseErrorMessage(payload) ?? 'Check the input and try again.',
      status,
    );
  }

  throw new HookLabApiError(
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
    throw new HookLabApiError(
      'Something went wrong on our end. Try again.',
      500,
    );
  }

  return payload;
};
