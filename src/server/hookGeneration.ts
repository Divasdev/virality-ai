import {
  audiences,
  hookFrameworks,
  hookWindowTimecodes,
  hookWindows,
  intensities,
  languages,
  modes,
  platforms,
  rewriteDirections,
  tones,
  type Audience,
  type CompareHooksResponse,
  type CompareAnalysis,
  type GenerateHooksRequest,
  type GenerateHooksResponse,
  type HookFramework,
  type HookLanguage,

  type HookResult,
  type HookScores,
  type HookTimecode,
  type HookWindow,
  type Intensity,
  type Mode,
  type Platform,
  type RewriteDirection,
  type RewriteHookRequest,
  type RewriteHookResponse,
  type RoastCritique,
  type Tone,
} from '../types/hooks';
import { extractTopicAnchors, isGenerationGrounded } from './relevance';

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface GenerateHooksHandlerOptions {
  apiKey?: string;
  body: unknown;
  ip?: string;
}

export interface RewriteHookHandlerOptions {
  apiKey?: string;
  body: unknown;
  ip?: string;
}

export interface HandlerResult<TPayload> {
  status: number;
  payload: TPayload | { error: string };
}

const geminiModel = 'gemini-2.5-flash';
const oneHourMs = 60 * 60 * 1000;
const generateRateLimits = new Map<string, RateLimitBucket>();
const rewriteRateLimits = new Map<string, RateLimitBucket>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPlatform = (value: unknown): value is Platform =>
  typeof value === 'string' && platforms.includes(value as Platform);

const isTone = (value: unknown): value is Tone =>
  typeof value === 'string' && tones.includes(value as Tone);

const isAudience = (value: unknown): value is Audience =>
  typeof value === 'string' && audiences.includes(value as Audience);

const isIntensity = (value: unknown): value is Intensity =>
  typeof value === 'string' && intensities.includes(value as Intensity);

const isLanguage = (value: unknown): value is HookLanguage =>
  typeof value === 'string' && languages.includes(value as HookLanguage);

const isHookWindow = (value: unknown): value is HookWindow =>
  typeof value === 'number' && hookWindows.includes(value as HookWindow);

const isMode = (value: unknown): value is Mode =>
  typeof value === 'string' && modes.includes(value as Mode);

const isHookFramework = (value: unknown): value is HookFramework =>
  typeof value === 'string' && hookFrameworks.includes(value as HookFramework);

const isRewriteDirection = (value: unknown): value is RewriteDirection =>
  typeof value === 'string' &&
  rewriteDirections.includes(value as RewriteDirection);

const stripJsonFences = (text: string): string =>
  text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

const normalizeScore = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
};

const parseScores = (value: unknown): HookScores | null => {
  if (!isRecord(value)) {
    return null;
  }

  const curiosity = normalizeScore(value.curiosity);
  const clarity = normalizeScore(value.clarity);
  const scrollStop = normalizeScore(value.scroll_stop);
  const platformFit = normalizeScore(value.platform_fit);

  if (
    curiosity === null ||
    clarity === null ||
    scrollStop === null ||
    platformFit === null
  ) {
    return null;
  }

  return {
    curiosity,
    clarity,
    scroll_stop: scrollStop,
    platform_fit: platformFit,
  };
};

const parseHooksPayload = (
  rawText: string,
  expectedTimecode: HookTimecode,
): { hooks: HookResult[] } | null => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripJsonFences(rawText));
  } catch {
    return null;
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.hooks)) {
    return null;
  }

  const allowedTimecodes: HookTimecode[] = ['00:00–00:05', '00:00–00:08'];
  const seenFrameworks = new Set<HookFramework>();
  const hooks: HookResult[] = [];
  let bestPickCount = 0;

  for (const item of parsed.hooks) {
    if (!isRecord(item)) {
      return null;
    }

    const scores = parseScores(item.scores);

    if (
      !isHookFramework(item.framework) ||
      typeof item.text !== 'string' ||
      item.text.trim().length === 0 ||
      typeof item.why !== 'string' ||
      item.why.trim().length === 0 ||
      !allowedTimecodes.includes(item.timecode as HookTimecode) ||
      scores === null ||
      typeof item.best_pick !== 'boolean' ||
      seenFrameworks.has(item.framework)
    ) {
      return null;
    }

    if (item.best_pick) {
      bestPickCount += 1;
    }

    seenFrameworks.add(item.framework);
    hooks.push({
      framework: item.framework,
      text: item.text.trim(),
      why: item.why.trim(),
      timecode: expectedTimecode,
      scores,
      best_pick: item.best_pick,
    });
  }

  if (
    hooks.length !== hookFrameworks.length ||
    bestPickCount !== 1 ||
    !hookFrameworks.every((framework) => seenFrameworks.has(framework))
  ) {
    return null;
  }

  return { hooks };
};

const parseRoastCritique = (value: unknown): RoastCritique | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.grade !== 'string' ||
    value.grade.trim().length === 0 ||
    !Array.isArray(value.bullets) ||
    value.bullets.length < 4 ||
    value.bullets.length > 6 ||
    !value.bullets.every(
      (bullet: unknown) =>
        typeof bullet === 'string' && bullet.trim().length > 0,
    ) ||
    typeof value.biggest_fix !== 'string' ||
    value.biggest_fix.trim().length === 0
  ) {
    return null;
  }

  return {
    grade: value.grade.trim(),
    bullets: value.bullets.map((bullet: string) => bullet.trim()),
    biggest_fix: value.biggest_fix.trim(),
  };
};

const parseRoastPayload = (
  rawText: string,
  expectedTimecode: HookTimecode,
): { hooks: HookResult[]; roast: RoastCritique } | null => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripJsonFences(rawText));
  } catch {
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  const roast = parseRoastCritique(parsed.roast);

  if (!roast) {
    return null;
  }

  if (!Array.isArray(parsed.hooks)) {
    return null;
  }

  const hooksResponse = parseHooksPayload(
    JSON.stringify({ hooks: parsed.hooks }),
    expectedTimecode,
  );

  if (!hooksResponse) {
    return null;
  }

  return { hooks: hooksResponse.hooks, roast };
};

const parseRewritePayload = (rawText: string): RewriteHookResponse | null => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripJsonFences(rawText));
  } catch {
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  const scores = parseScores(parsed.scores);

  if (
    typeof parsed.text !== 'string' ||
    parsed.text.trim().length === 0 ||
    typeof parsed.why !== 'string' ||
    parsed.why.trim().length === 0 ||
    scores === null
  ) {
    return null;
  }

  return {
    text: parsed.text.trim(),
    why: parsed.why.trim(),
    scores,
  };
};

const parseCompareAnalysis = (value: unknown): CompareAnalysis | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (
    (value.winner === 'A' || value.winner === 'B') &&
    typeof value.reason === 'string' &&
    value.reason.trim().length > 0
  ) {
    return {
      winner: value.winner,
      reason: value.reason.trim(),
    };
  }

  return null;
};

const parseComparePayload = (rawText: string): CompareHooksResponse | null => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripJsonFences(rawText));
  } catch {
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  if (parsed.winner !== 'A' && parsed.winner !== 'B') {
    return null;
  }

  if (
    typeof parsed.confidence !== 'number' ||
    typeof parsed.summary !== 'string' ||
    typeof parsed.improvedHook !== 'string' ||
    !isRecord(parsed.analysis)
  ) {
    return null;
  }

  const clarity = parseCompareAnalysis(parsed.analysis.clarity);
  const curiosity = parseCompareAnalysis(parsed.analysis.curiosity);
  const emotion = parseCompareAnalysis(parsed.analysis.emotion);
  const retention = parseCompareAnalysis(parsed.analysis.retention);

  if (!clarity || !curiosity || !emotion || !retention) {
    return null;
  }

  return {
    winner: parsed.winner,
    confidence: Math.max(0, Math.min(100, Math.round(parsed.confidence))),
    summary: parsed.summary.trim(),
    improvedHook: parsed.improvedHook.trim(),
    analysis: {
      clarity,
      curiosity,
      emotion,
      retention,
    },
  };
};

const validateGenerateBody = (
  body: unknown,
): GenerateHooksRequest | { error: string } => {
  if (!isRecord(body)) {
    return { error: 'Invalid request body.' };
  }

  const script = body.script;
  const mode = isMode(body.mode) ? body.mode : 'generate';
  const minLength = mode === 'roast' ? 5 : 20;

  if (typeof script !== 'string') {
    return {
      error: `Script must be between ${minLength} and 3000 characters.`,
    };
  }

  const trimmedScript = script.trim();

  if (trimmedScript.length < minLength || trimmedScript.length > 3000) {
    return {
      error: `Script must be between ${minLength} and 3000 characters.`,
    };
  }

  let hookBData: string | undefined;

  if (mode === 'compare') {
    if (typeof body.hookB !== 'string') {
      return {
        error: 'Hook B is required for comparison.',
      };
    }
    const trimmedHookB = body.hookB.trim();
    if (trimmedHookB.length < minLength || trimmedHookB.length > 3000) {
      return {
        error: `Hook B must be between ${minLength} and 3000 characters.`,
      };
    }
    hookBData = trimmedHookB;
  }

  if (
    !isPlatform(body.platform) ||
    !isTone(body.tone) ||
    !isAudience(body.audience) ||
    !isIntensity(body.intensity) ||
    !isLanguage(body.language) ||
    !isHookWindow(body.hookWindow)
  ) {
    return { error: 'One or more controls are invalid.' };
  }

  return {
    script: trimmedScript,
    hookB: hookBData,
    platform: body.platform,
    tone: body.tone,
    audience: body.audience,
    intensity: body.intensity,
    language: body.language,
    hookWindow: body.hookWindow,
    mode,
  };
};

const validateRewriteBody = (
  body: unknown,
): RewriteHookRequest | { error: string } => {
  if (!isRecord(body)) {
    return { error: 'Invalid request body.' };
  }

  if (
    typeof body.hook !== 'string' ||
    body.hook.trim().length === 0 ||
    body.hook.trim().length > 600
  ) {
    return { error: 'Hook is invalid.' };
  }

  if (
    !isHookFramework(body.framework) ||
    !isRewriteDirection(body.direction) ||
    !isPlatform(body.platform) ||
    !isHookWindow(body.hookWindow)
  ) {
    return { error: 'One or more controls are invalid.' };
  }

  return {
    hook: body.hook.trim(),
    framework: body.framework,
    direction: body.direction,
    platform: body.platform,
    hookWindow: body.hookWindow,
  };
};

const checkRateLimit = (
  buckets: Map<string, RateLimitBucket>,
  ip: string,
  maxRequests: number,
): boolean => {
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + oneHourMs });
    return true;
  }

  if (bucket.count >= maxRequests) {
    return false;
  }

  bucket.count += 1;
  return true;
};

const platformDirections: Record<Platform, string> = {
  'YouTube Shorts':
    'Use clear setup, fast context, and a broad curiosity engine for Shorts viewers who decide in under two seconds.',
  'Instagram Reels':
    'Use polished creator language, visual-first pacing, and emotionally legible hooks suited to Reels discovery.',
  TikTok:
    'Use direct, conversational phrasing with punchy pattern breaks and native-feeling urgency for TikTok pacing.',
};

const toneDirections: Record<Tone, string> = {
  Punchy:
    'Make the writing tight, fast, and high-impact. Prefer short clauses and hard turns.',
  Clean:
    'Make the writing clear, useful, and credible. Avoid hype and keep the promise precise.',
  Controversial:
    'Create productive tension or contrarian framing without making false claims.',
  Story:
    'Open through a specific moment, transformation, or narrative setup that makes viewers want the next beat.',
};

const audienceDirections: Record<Audience, string> = {
  Beginners:
    'Assume low context. Make the hook instantly understandable and avoid insider jargon.',
  Creators:
    'Speak to people making content, editing videos, and watching retention curves.',
  Business:
    'Frame the hook around revenue, offers, systems, customer behavior, or practical leverage.',
  Fitness:
    'Frame the hook around visible progress, consistency, mistakes, body change, or discipline.',
  Finance:
    'Frame the hook around money behavior, savings, investing mistakes, or measurable outcomes.',
};

const intensityDirections: Record<Intensity, string> = {
  Safe: 'Keep the hook credible and restrained. No manufactured drama.',
  Sharp:
    'Use stronger tension and more decisive language while staying believable.',
  Aggressive:
    'Push the hook harder with urgency, stakes, and blunt contrast. Do not invent facts.',
};

const languageDirections: Record<HookLanguage, string> = {
  English:
    'Write in natural English for short-form creators. Keep phrasing crisp and conversational.',
  Hinglish:
    'Write authentic Indian internet Hinglish in Roman script, mixing Hindi and English naturally the way Indian YouTube/Instagram creators speak. Do not sound translated or formal.',
  Hindi:
    'Write pure Devanagari Hindi. Use proper Hindi grammar. Do not use Roman script.',
};

const buildGenerateSystemPrompt = (request: GenerateHooksRequest): string =>
  `
You are Hook Lab, a senior short-form video editor and retention strategist.
Your job is to help the creator decide which first-${request.hookWindow}-seconds hook to use.

CRITICAL SOURCE-GROUNDING RULE:
You are rewriting the user's SOURCE SCRIPT. The SOURCE SCRIPT is the only source of truth.
Every hook must preserve the script's exact topic, niche, facts, intent, and core claim.
Never switch to generic creator advice, social media advice, editing advice, or another niche unless that is explicitly what the SOURCE SCRIPT is about.
If the SOURCE SCRIPT is about aviation, every output must stay about aviation.
If the SOURCE SCRIPT is about engine failure and pilots, every output must remain about engine failure, pilots, passenger fear, or airliner safety.
Do not invent new subject matter, fake statistics, fake outcomes, or unrelated examples.
Do not add numbers, percentages, time spans, certifications, rankings, or measurable claims that are not in the SOURCE SCRIPT.
If a framework such as STAT SHOCK needs a statistic but the SOURCE SCRIPT has no statistic, use the most concrete factual contrast already present instead.
Do not write hooks about Reels, TikTok, creators, posting, views, editing, or content unless those ideas appear in the SOURCE SCRIPT.

Platform: ${request.platform}
Tone: ${request.tone}
Audience: ${request.audience}
Intensity: ${request.intensity}
Language: ${request.language}
Hook window: ${request.hookWindow} seconds

Platform direction: ${platformDirections[request.platform]}
Tone direction: ${toneDirections[request.tone]}
Audience direction: ${audienceDirections[request.audience]}
Intensity direction: ${intensityDirections[request.intensity]}
Language direction: ${languageDirections[request.language]}
Source-topic anchors to preserve where natural: ${extractTopicAnchors(request.script).join(', ')}

Return strict JSON only. No markdown fences, no preamble, no commentary.
Return exactly this shape:
{
  "hooks": [
    {
      "framework": "CURIOSITY GAP",
      "text": "...",
      "why": "...",
      "timecode": "${hookWindowTimecodes[request.hookWindow]}",
      "scores": {
        "curiosity": 88,
        "clarity": 72,
        "scroll_stop": 91,
        "platform_fit": 85
      },
      "best_pick": false
    }
  ]
}

Rules:
- Return exactly 10 items.
- Use each framework exactly once: ${hookFrameworks.join(', ')}.
- Set exactly one item to "best_pick": true. Pick the strongest default choice for ${request.platform}.
- Keep every hook short enough to say inside ${request.hookWindow} seconds.
- Every hook must clearly be a rewrite of the SOURCE SCRIPT, not a generic hook template.
- Every hook should include at least one concrete source-specific noun, entity, or fact when natural.
- Do not add unsupported numeric claims. Reuse only numbers/facts already present in the SOURCE SCRIPT.
- The timecode must always be "${hookWindowTimecodes[request.hookWindow]}".
- "why" must be 1-2 short sentences explaining the attention mechanism, not generic praise.
- Scores must be integers from 0 to 100.
- Score curiosity by unanswered tension, clarity by instant understanding, scroll_stop by pause power, and platform_fit by pacing match.
- Do not include quotation marks around the spoken hook unless the line itself needs them.
`.trim();

const buildGenerateUserPrompt = (
  request: GenerateHooksRequest,
  retry = false,
): string =>
  `
${retry ? 'The previous output drifted off-topic and was rejected. Regenerate from the source only.' : ''}
SOURCE SCRIPT:
"""
${request.script}
"""

Task:
Rewrite the opening ${request.hookWindow} seconds of this exact SOURCE SCRIPT into the 10 required hook frameworks.
Preserve the same topic and facts. Do not change the niche.
`.trim();

const buildRewriteSystemPrompt = (request: RewriteHookRequest): string =>
  `
You are Hook Lab, a senior short-form video editor and retention strategist.
Rewrite one existing ${request.framework} hook for ${request.platform}.

Direction: ${request.direction}
Hook window: ${request.hookWindow} seconds
Platform direction: ${platformDirections[request.platform]}

Return strict JSON only. No markdown fences, no preamble, no commentary.
Return exactly this shape:
{
  "text": "...",
  "why": "...",
  "scores": {
    "curiosity": 84,
    "clarity": 90,
    "scroll_stop": 79,
    "platform_fit": 88
  }
}

Rules:
- Preserve the original hook's language and audience cues.
- Keep the hook short enough to say inside ${request.hookWindow} seconds.
- Apply the direction clearly without changing the framework.
- "why" must be 1-2 short sentences explaining the attention mechanism.
- Scores must be integers from 0 to 100.
`.trim();

const buildRoastSystemPrompt = (request: GenerateHooksRequest): string =>
  `
You are Hook Lab, a senior short-form video editor and retention strategist.
You are in ROAST mode. The user has pasted an existing hook that they want critiqued.

First, produce a brutally honest but constructive critique of their hook.
Be specific about what fails and why. Do not be vague or generic.
Grade on an A+ to F scale. Be honest — most hooks deserve a C or lower.

Then generate 10 improved hook alternatives using the standard frameworks.

CRITICAL SOURCE-GROUNDING RULE:
The user's EXISTING HOOK is the source of truth for the topic.
Every generated alternative must preserve the hook's exact topic, niche, facts, intent, and core claim.
Do not switch to generic creator advice, social media advice, editing advice, or another niche.
Do not invent new subject matter, fake statistics, fake outcomes, or unrelated examples.
Do not add numbers, percentages, time spans, certifications, rankings, or measurable claims that are not in the EXISTING HOOK.
Do not write hooks about Reels, TikTok, creators, posting, views, editing, or content unless those ideas appear in the EXISTING HOOK.

Platform: ${request.platform}
Tone: ${request.tone}
Audience: ${request.audience}
Intensity: ${request.intensity}
Language: ${request.language}
Hook window: ${request.hookWindow} seconds

Platform direction: ${platformDirections[request.platform]}
Tone direction: ${toneDirections[request.tone]}
Audience direction: ${audienceDirections[request.audience]}
Intensity direction: ${intensityDirections[request.intensity]}
Language direction: ${languageDirections[request.language]}

Return strict JSON only. No markdown fences, no preamble, no commentary.
Return exactly this shape:
{
  "roast": {
    "grade": "C-",
    "bullets": [
      "Opens with 'I' — the viewer does not care about you yet.",
      "No curiosity gap. Nothing makes the viewer need to keep watching.",
      "The benefit arrives too late.",
      "Feels like a diary entry instead of a hook."
    ],
    "biggest_fix": "Lead with the outcome or tension, not yourself."
  },
  "hooks": [
    {
      "framework": "CURIOSITY GAP",
      "text": "...",
      "why": "...",
      "timecode": "${hookWindowTimecodes[request.hookWindow]}",
      "scores": {
        "curiosity": 88,
        "clarity": 72,
        "scroll_stop": 91,
        "platform_fit": 85
      },
      "best_pick": false
    }
  ]
}

Roast rules:
- "bullets" must have 4 to 6 items.
- Each bullet must be a specific, actionable critique of the EXISTING HOOK.
- Do not use generic phrases like "could be better" or "needs improvement".
- "biggest_fix" must be one clear sentence describing the single most impactful change.
- "grade" must be a single letter grade (A+ through F).

Hooks rules:
- Return exactly 10 items.
- Use each framework exactly once: ${hookFrameworks.join(', ')}.
- Set exactly one item to "best_pick": true. Pick the strongest default choice for ${request.platform}.
- Keep every hook short enough to say inside ${request.hookWindow} seconds.
- Every hook must clearly be a rewrite of the EXISTING HOOK, not a generic hook template.
- Every hook should include at least one concrete source-specific noun, entity, or fact when natural.
- Do not add unsupported numeric claims. Reuse only numbers/facts already present in the EXISTING HOOK.
- The timecode must always be "${hookWindowTimecodes[request.hookWindow]}".
- "why" must be 1-2 short sentences explaining the attention mechanism, not generic praise.
- Scores must be integers from 0 to 100.
- Score curiosity by unanswered tension, clarity by instant understanding, scroll_stop by pause power, and platform_fit by pacing match.
- Do not include quotation marks around the spoken hook unless the line itself needs them.
`.trim();

const buildRoastUserPrompt = (
  request: GenerateHooksRequest,
  retry = false,
): string =>
  `
${retry ? 'The previous output drifted off-topic and was rejected. Regenerate from the source only.' : ''}
EXISTING HOOK:
"""
${request.script}
"""

Task:
1. Roast this hook honestly. Be specific about what fails.
2. Then rewrite it into the 10 required hook frameworks for ${request.platform}.
Preserve the same topic and facts. Do not change the niche.
`.trim();

const buildCompareSystemPrompt = (request: GenerateHooksRequest): string =>
  `
You are Hook Lab, a senior short-form video editor and retention strategist.
You are in COMPARE mode. The user has provided two hooks: Hook A and Hook B.
Your job is to objectively analyze them and declare a winner.

Judge like an experienced short-form content strategist.
Prioritize:
- Curiosity gap
- Retention mechanics
- Specificity
- Emotional pull
- Stopping power
Avoid generic motivational advice.

CRITICAL RULES:
1. You MUST pick a winner ("A" or "B"). Do not hedge. Do not say "both are good". If confidence is low, still pick one and explain why.
2. The "improvedHook" MUST be an original, superior hook that combines the best parts of both or uses a stronger framework. It must preserve the exact topic and facts.

Platform: ${request.platform}
Tone: ${request.tone}
Audience: ${request.audience}
Intensity: ${request.intensity}
Language: ${request.language}

Return strict JSON only. No markdown fences, no preamble, no commentary.
Return exactly this shape:
{
  "winner": "A",
  "confidence": 92,
  "summary": "Hook A creates a stronger curiosity gap and avoids the slow setup found in Hook B.",
  "analysis": {
    "clarity": {
      "winner": "A",
      "reason": "Gets to the point immediately without unnecessary filler."
    },
    "curiosity": {
      "winner": "B",
      "reason": "Teases the outcome slightly better by withholding the specific tool name."
    },
    "emotion": {
      "winner": "A",
      "reason": "Uses stronger stakes that resonate directly with the target audience."
    },
    "retention": {
      "winner": "A",
      "reason": "The pacing naturally forces the viewer to wait for the resolution."
    }
  },
  "improvedHook": "..."
}
`.trim();

const buildCompareUserPrompt = (
  request: GenerateHooksRequest,
  retry = false,
): string =>
  `
${retry ? 'The previous output drifted off-topic and was rejected. Regenerate from the source only.' : ''}
HOOK A:
"""
${request.script}
"""

HOOK B:
"""
${request.hookB}
"""

Task:
Compare Hook A and Hook B. Pick a clear winner, analyze the four metrics, and provide one ultimately improved hook.
`.trim();

const extractGeminiText = (
  payload: GeminiGenerateContentResponse,
): string | null => {
  const text =
    payload.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text?.trim() ?? '')
      .join('\n')
      .trim() ?? '';

  return text.length > 0 ? text : null;
};

const callGemini = async (
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 2600,
          temperature: 0.7,
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as GeminiGenerateContentResponse;
  return extractGeminiText(payload);
};

export const createGenerateHooksResponse = async ({
  apiKey,
  body,
  ip = 'unknown',
}: GenerateHooksHandlerOptions): Promise<
  HandlerResult<GenerateHooksResponse>
> => {
  const request = validateGenerateBody(body);

  if ('error' in request) {
    return { status: 400, payload: { error: request.error } };
  }

  if (!checkRateLimit(generateRateLimits, ip, 10)) {
    return {
      status: 429,
      payload: { error: 'Too many requests. Try again in a bit.' },
    };
  }

  if (!apiKey) {
    return {
      status: 500,
      payload: { error: 'Server is missing the Gemini API key.' },
    };
  }

  try {
    let generatedHooks: GenerateHooksResponse | null = null;

    if (request.mode === 'compare') {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const text = await callGemini(
          apiKey,
          buildCompareSystemPrompt(request),
          buildCompareUserPrompt(request, attempt > 0),
        );
        const parsedCompare = text ? parseComparePayload(text) : null;

        if (parsedCompare) {
          // Compare doesn't rewrite 10 hooks or need the strict topic extraction grounding check in the same way,
          // but the improved hook should ideally be on topic. Since there is no "hooks" array, we skip `isGenerationGrounded`.
          generatedHooks = { mode: 'compare', compare: parsedCompare };
          break;
        }
      }
    } else if (request.mode === 'roast') {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const text = await callGemini(
          apiKey,
          buildRoastSystemPrompt(request),
          buildRoastUserPrompt(request, attempt > 0),
        );
        const parsedRoast = text
          ? parseRoastPayload(text, hookWindowTimecodes[request.hookWindow])
          : null;

        if (parsedRoast && isGenerationGrounded(request, { mode: 'roast', hooks: parsedRoast.hooks, roast: parsedRoast.roast })) {
          generatedHooks = { mode: 'roast', hooks: parsedRoast.hooks, roast: parsedRoast.roast };
          break;
        }
      }
    } else {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const text = await callGemini(
          apiKey,
          buildGenerateSystemPrompt(request),
          buildGenerateUserPrompt(request, attempt > 0),
        );
        const parsedHooks = text
          ? parseHooksPayload(text, hookWindowTimecodes[request.hookWindow])
          : null;

        if (parsedHooks && isGenerationGrounded(request, { mode: 'generate', hooks: parsedHooks.hooks })) {
          generatedHooks = { mode: 'generate', hooks: parsedHooks.hooks };
          break;
        }
      }
    }

    if (!generatedHooks) {
      return {
        status: 502,
        payload: { error: 'Something went wrong on our end. Try again.' },
      };
    }

    return { status: 200, payload: generatedHooks };
  } catch {
    return {
      status: 502,
      payload: { error: 'Something went wrong on our end. Try again.' },
    };
  }
};

export const createRewriteHookResponse = async ({
  apiKey,
  body,
  ip = 'unknown',
}: RewriteHookHandlerOptions): Promise<HandlerResult<RewriteHookResponse>> => {
  const request = validateRewriteBody(body);

  if ('error' in request) {
    return { status: 400, payload: { error: request.error } };
  }

  if (!checkRateLimit(rewriteRateLimits, ip, 20)) {
    return {
      status: 429,
      payload: { error: 'Too many requests. Try again in a bit.' },
    };
  }

  if (!apiKey) {
    return {
      status: 500,
      payload: { error: 'Server is missing the Gemini API key.' },
    };
  }

  try {
    const text = await callGemini(
      apiKey,
      buildRewriteSystemPrompt(request),
      request.hook,
    );
    const rewrittenHook = text ? parseRewritePayload(text) : null;

    if (!rewrittenHook) {
      return {
        status: 502,
        payload: { error: 'Something went wrong on our end. Try again.' },
      };
    }

    return { status: 200, payload: rewrittenHook };
  } catch {
    return {
      status: 502,
      payload: { error: 'Something went wrong on our end. Try again.' },
    };
  }
};
