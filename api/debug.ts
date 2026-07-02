// DEBUG ENDPOINT - Remove after issue is resolved.

import type { VercelRequest, VercelResponse } from '@vercel/node';

import { defaultGeminiModel } from '../src/server/hookGeneration.js';

const keyNames = [
  'GEMINI_API_KEY',
  'GEMINI_API_KEY_1',
  'GEMINI_API_KEY_2',
  'GEMINI_API_KEY_3',
  'GEMINI_API_KEY_4',
  'GEMINI_API_KEY_5',
  'GEMINI_MODEL',
] as const;

const runtimeKeyNames = [
  'GEMINI_API_KEY',
  'GEMINI_API_KEY_1',
  'GEMINI_API_KEY_2',
  'GEMINI_API_KEY_3',
  'GEMINI_API_KEY_4',
  'GEMINI_API_KEY_5',
] as const;

const setCorsHeaders = (res: VercelResponse): void => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const maskValue = (value: string): string =>
  `${value.slice(0, 8)}...${value.slice(-4)}`;

const getAvailableKeys = (): Array<{ name: string; value: string }> => {
  const seen = new Set<string>();
  const keys: Array<{ name: string; value: string }> = [];

  for (const name of runtimeKeyNames) {
    const value = process.env[name]?.trim();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    keys.push({ name, value });
  }

  return keys;
};

const buildGeminiUrl = (model: string, key: string): string =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(key)}`;

const getGeminiModel = (): string =>
  process.env.GEMINI_MODEL?.trim() || defaultGeminiModel;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const report: Record<string, unknown> = {};

  report.env = {};
  for (const name of keyNames) {
    const value = process.env[name]?.trim();
    if (!value) {
      (report.env as Record<string, string>)[name] = 'MISSING';
    } else {
      (report.env as Record<string, string>)[name] =
        `PRESENT (${maskValue(value)}) [length: ${value.length}]`;
    }
  }

  const availableKeys = getAvailableKeys();
  const model = getGeminiModel();

  report.keySourceOrder = availableKeys.map((key, index) => ({
    keyIndex: index + 1,
    envName: key.name,
    maskedKey: maskValue(key.value),
    length: key.value.length,
  }));
  report.keyCount = availableKeys.length;
  report.keyCountStatus =
    availableKeys.length === 0
      ? 'NO KEYS FOUND - this is your problem'
      : `${availableKeys.length} unique key(s) found`;

  report.runtime = {
    nodeVersion: process.version,
    platform: process.platform,
    env: process.env.NODE_ENV ?? 'not set',
    vercelEnv: process.env.VERCEL_ENV ?? 'not set (not on Vercel?)',
    vercelRegion: process.env.VERCEL_REGION ?? 'not set',
  };

  report.model = {
    effectiveModel: model,
    configuredByEnv: Boolean(process.env.GEMINI_MODEL?.trim()),
    defaultModel: defaultGeminiModel,
  };

  if (availableKeys.length === 0) {
    report.geminiTest = {
      status: 'SKIPPED - no keys available',
    };
  } else {
    const testKey = availableKeys[0];
    const url = buildGeminiUrl(model, testKey.value);
    const geminiTest: Record<string, unknown> = {
      model,
      keyEnvName: testKey.name,
      maskedKey: maskValue(testKey.value),
      url: url.replace(encodeURIComponent(testKey.value), '[REDACTED]'),
    };
    report.geminiTest = geminiTest;

    try {
      const startTime = Date.now();

      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: 'Reply with exactly one word: working' }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 10,
            temperature: 0,
          },
        }),
      });

      const elapsed = Date.now() - startTime;
      const responseText = await geminiRes.text();

      geminiTest.httpStatus = geminiRes.status;
      geminiTest.httpStatusText = geminiRes.statusText;
      geminiTest.latencyMs = elapsed;
      geminiTest.rawResponse = responseText.slice(0, 500);

      if (geminiRes.status === 200) {
        try {
          const parsed = JSON.parse(responseText) as Record<string, unknown>;
          const candidates = parsed.candidates;
          const text =
            Array.isArray(candidates) &&
            typeof candidates[0] === 'object' &&
            candidates[0] !== null
              ? (
                  candidates[0] as {
                    content?: { parts?: Array<{ text?: string }> };
                  }
                ).content?.parts?.[0]?.text
              : undefined;

          geminiTest.parseStatus = 'JSON parsed successfully';
          geminiTest.extractedText =
            text ?? 'Could not extract text from response';
          geminiTest.fullStructure = JSON.stringify(parsed, null, 2).slice(
            0,
            800,
          );
        } catch {
          geminiTest.parseStatus =
            'JSON parse FAILED - response is not valid JSON';
        }
      } else if (geminiRes.status === 429) {
        geminiTest.diagnosis =
          'RATE LIMITED on first key - rotation should handle this';
      } else if (geminiRes.status === 400) {
        geminiTest.diagnosis =
          'BAD REQUEST - likely wrong request body shape or model name';
      } else if (geminiRes.status === 401 || geminiRes.status === 403) {
        geminiTest.diagnosis =
          'AUTH FAILED - API key is invalid, expired, or lacks access';
      } else if (geminiRes.status === 404) {
        geminiTest.diagnosis = `MODEL NOT FOUND - '${model}' may not exist or may not be enabled`;
      }
    } catch (fetchErr) {
      geminiTest.fetchError = String(fetchErr);
      geminiTest.diagnosis =
        'NETWORK ERROR - fetch itself failed. DNS issue or Vercel egress blocked?';
    }
  }

  if (availableKeys.length > 1) {
    const allKeyResults = [];

    for (let i = 0; i < availableKeys.length; i += 1) {
      const key = availableKeys[i];
      const url = buildGeminiUrl(model, key.value);

      try {
        const keyStart = Date.now();
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Say: ok' }] }],
            generationConfig: { maxOutputTokens: 5, temperature: 0 },
          }),
        });
        const body = await response.text();

        allKeyResults.push({
          keyIndex: i + 1,
          envName: key.name,
          maskedKey: maskValue(key.value),
          status: response.status,
          latencyMs: Date.now() - keyStart,
          ok:
            response.status === 200 ? 'WORKING' : `FAILED (${response.status})`,
          rawResponse: body.slice(0, 300),
        });
      } catch (error) {
        allKeyResults.push({
          keyIndex: i + 1,
          envName: key.name,
          maskedKey: maskValue(key.value),
          status: 'FETCH_ERROR',
          ok: `NETWORK ERROR: ${String(error)}`,
        });
      }
    }

    report.allKeyResults = allKeyResults;
  }

  report.functionConfig = {
    note: 'Check vercel.json for function timeout settings',
    recommendation:
      'Gemini calls can take 5-10s - ensure maxDuration >= 30 in vercel.json',
  };

  const diagnoses: string[] = [];

  if (availableKeys.length === 0) {
    diagnoses.push(
      'CRITICAL: No API keys found in environment. Vercel env vars are not loaded or are named differently.',
    );
  }

  if (
    availableKeys.length > 0 &&
    typeof report.geminiTest === 'object' &&
    report.geminiTest !== null
  ) {
    const test = report.geminiTest as Record<string, unknown>;

    if (test.httpStatus === 401 || test.httpStatus === 403) {
      diagnoses.push(
        'CRITICAL: API key is invalid or has no Gemini API access.',
      );
    }
    if (test.httpStatus === 404) {
      diagnoses.push(
        `CRITICAL: Model name is wrong or unavailable: ${model}. Try setting GEMINI_MODEL to a known-good model.`,
      );
    }
    if (test.httpStatus === 429) {
      diagnoses.push('WARNING: Rate limited. Key rotation should handle this.');
    }
    if (test.httpStatus === 200) {
      diagnoses.push('Gemini API is reachable and responding correctly.');
    }
    if (test.fetchError) {
      diagnoses.push(
        'CRITICAL: Network fetch failed entirely. Vercel cannot reach Google APIs.',
      );
    }
  }

  if (diagnoses.length === 0) {
    diagnoses.push(
      'No obvious issues found at the env/API level. Bug may be in request body, response parsing, or grounding validation.',
    );
  }

  report.diagnosis = diagnoses;
  report.timestamp = new Date().toISOString();
  report.instructions = 'Share this full JSON output to diagnose the issue.';

  res.status(200).json(report);
}
