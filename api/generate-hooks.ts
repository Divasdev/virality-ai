import type { VercelRequest, VercelResponse } from '@vercel/node';

import {
  createGenerateHooksResponse,
  defaultGeminiModel,
} from '../src/server/hookGeneration.js';

export const maxDuration = 60;

const setCorsHeaders = (response: VercelResponse): void => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const getRequestIp = (request: VercelRequest): string => {
  const forwardedFor = request.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return request.socket.remoteAddress ?? 'unknown';
};

const getApiKeys = (): string[] =>
  Array.from(
    new Set(
      [
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_API_KEY_1,
        process.env.GEMINI_API_KEY_2,
        process.env.GEMINI_API_KEY_3,
        process.env.GEMINI_API_KEY_4,
        process.env.GEMINI_API_KEY_5,
      ]
        .map((key) => key?.trim())
        .filter(
          (key): key is string => typeof key === 'string' && key.length > 0,
        ),
    ),
  );

const getGeminiModel = (): string =>
  process.env.GEMINI_MODEL?.trim() || defaultGeminiModel;

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
  setCorsHeaders(response);

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const result = await createGenerateHooksResponse({
    apiKeys: getApiKeys(),
    body: request.body,
    ip: getRequestIp(request),
    model: getGeminiModel(),
  });

  response.status(result.status).json(result.payload);
}
