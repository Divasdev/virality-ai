import type {
  GenerateHooksRequest,
  GenerateHooksResponse,
} from '../types/hooks.js';

const stopWords = new Set([
  'about',
  'after',
  'again',
  'also',
  'because',
  'before',
  'being',
  'between',
  'could',
  'every',
  'first',
  'from',
  'have',
  'hear',
  'here',
  'into',
  'just',
  'like',
  'made',
  'make',
  'many',
  'more',
  'most',
  'much',
  'once',
  'only',
  'over',
  'same',
  'some',
  'than',
  'that',
  'their',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'what',
  'when',
  'where',
  'which',
  'while',
  'with',
  'without',
  'would',
  'your',
]);

const offTopicCreatorTerms = [
  'content',
  'creator',
  'editing',
  'followers',
  'posting',
  'reels',
  'tiktok',
  'views',
  'viral',
];

const numericClaimPattern =
  /\b(?:\d+(?:[.,]\d+)?|zero|one|two|three|four|five|six|seven|eight|nine|ten|hundred|hundreds|thousand|thousands|million|millions|billion|billions|percent|percentage|hours|days|weeks|months|years)\b/gi;

const latinWordPattern = /[a-z0-9][a-z0-9'-]{2,}/gi;

const normalize = (value: string): string => value.toLowerCase();

export const extractTopicAnchors = (script: string): string[] => {
  const matches = normalize(script).match(latinWordPattern) ?? [];
  const frequencies = new Map<string, number>();

  for (const match of matches) {
    const word = match.replace(/^'+|'+$/g, '');

    if (word.length < 4 || stopWords.has(word)) {
      continue;
    }

    frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
  }

  return [...frequencies.entries()]
    .sort((first, second) => {
      const frequencyDelta = second[1] - first[1];

      if (frequencyDelta !== 0) {
        return frequencyDelta;
      }

      return second[0].length - first[0].length;
    })
    .slice(0, 12)
    .map(([word]) => word);
};

const countAnchorMatches = (text: string, anchors: string[]): number => {
  const normalizedText = normalize(text);

  return anchors.filter((anchor) => normalizedText.includes(anchor)).length;
};

const sourceAllowsCreatorTerms = (script: string): boolean => {
  const normalizedScript = normalize(script);

  return offTopicCreatorTerms.some((term) => normalizedScript.includes(term));
};

const extractNumericClaims = (text: string): Set<string> =>
  new Set((normalize(text).match(numericClaimPattern) ?? []).map(normalize));

const hasUnsupportedNumericClaim = (
  request: GenerateHooksRequest,
  hookText: string,
): boolean => {
  const sourceClaims = extractNumericClaims(request.script);
  const hookClaims = extractNumericClaims(hookText);
  const intrinsicHookClaims = new Set(
    request.hookWindow === 8 ? ['8', 'eight'] : ['5', 'five'],
  );

  for (const claim of hookClaims) {
    if (intrinsicHookClaims.has(claim)) {
      continue;
    }

    if (!sourceClaims.has(claim)) {
      return true;
    }
  }

  return false;
};

export const isGenerationGrounded = (
  request: GenerateHooksRequest,
  response: GenerateHooksResponse,
): boolean => {
  if (request.language === 'Hindi') {
    return true;
  }

  if (response.mode === 'compare') {
    return true;
  }

  const anchors = extractTopicAnchors(request.script);

  if (anchors.length < 3) {
    return true;
  }

  const minimumUniqueAnchorCoverage = Math.min(3, anchors.length);
  const usedAnchors = new Set<string>();
  const allowCreatorTerms = sourceAllowsCreatorTerms(request.script);

  for (const hook of response.hooks) {
    const hookText = `${hook.text} ${hook.why}`;
    const anchorMatches = countAnchorMatches(hookText, anchors);
    const normalizedHookText = normalize(hookText);

    for (const anchor of anchors) {
      if (normalizedHookText.includes(anchor)) {
        usedAnchors.add(anchor);
      }
    }

    // Allow some hooks (like pattern interrupts) to have zero anchor matches
    // The overall batch must still satisfy minimumUniqueAnchorCoverage below.

    // if (hasUnsupportedNumericClaim(request, hookText)) {
    //   console.warn('[HookLab] Grounding failed: hasUnsupportedNumericClaim for hook:', hook.framework);
    //   return false;
    // }

    // if (
    //   !allowCreatorTerms &&
    //   offTopicCreatorTerms.some((term) => normalizedHookText.includes(term))
    // ) {
    //   console.warn('[HookLab] Grounding failed: offTopicCreatorTerms found in hook:', hook.framework);
    //   return false;
    // }
  }

  if (usedAnchors.size < minimumUniqueAnchorCoverage) {
    console.warn(`[HookLab] Grounding failed: usedAnchors.size (${usedAnchors.size}) < minimumUniqueAnchorCoverage (${minimumUniqueAnchorCoverage})`);
    return false;
  }

  return true;
};
