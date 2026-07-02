import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';

import {
  createGenerateHooksResponse,
  createRewriteHookResponse,
} from './src/server/hookGeneration';

const readRequestBody = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Uint8Array[] = [];

  for await (const chunk of request) {
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk));
    } else if (chunk instanceof Uint8Array) {
      chunks.push(chunk);
    }
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');

  if (!rawBody) {
    return {};
  }

  return JSON.parse(rawBody) as unknown;
};

const sendJson = (
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
): void => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(payload));
};

const localApiPlugin = (geminiApiKey?: string): Plugin => ({
  name: 'virality-ai-local-api',
  configureServer(server) {
    const handleLocalApiRequest = async (
      request: IncomingMessage,
      response: ServerResponse,
    ): Promise<void> => {
      if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        sendJson(response, 405, { error: 'Method not allowed.' });
        return;
      }

      try {
        const body = await readRequestBody(request);
        const result = await createGenerateHooksResponse({
          apiKey: geminiApiKey ?? process.env.GEMINI_API_KEY,
          body,
          ip: request.socket.remoteAddress ?? 'unknown',
        });

        sendJson(response, result.status, result.payload);
      } catch (error) {
        sendJson(response, 500, {
          error:
            error instanceof SyntaxError
              ? 'Invalid JSON body.'
              : 'Could not cut those hooks.',
        });
      }
    };

    const handleLocalRewriteRequest = async (
      request: IncomingMessage,
      response: ServerResponse,
    ): Promise<void> => {
      if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        sendJson(response, 405, { error: 'Method not allowed.' });
        return;
      }

      try {
        const body = await readRequestBody(request);
        const result = await createRewriteHookResponse({
          apiKey: geminiApiKey ?? process.env.GEMINI_API_KEY,
          body,
          ip: request.socket.remoteAddress ?? 'unknown',
        });

        sendJson(response, result.status, result.payload);
      } catch (error) {
        sendJson(response, 500, {
          error:
            error instanceof SyntaxError
              ? 'Invalid JSON body.'
              : 'Could not rewrite that hook.',
        });
      }
    };

    server.middlewares.use('/api/generate-hooks', (request, response) => {
      void handleLocalApiRequest(request, response);
    });

    server.middlewares.use('/api/rewrite-hook', (request, response) => {
      void handleLocalRewriteRequest(request, response);
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), localApiPlugin(env.GEMINI_API_KEY)],
  };
});
