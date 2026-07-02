# Virality AI

Virality AI is an AI-powered tool that rewrites the first five seconds of a video idea into 10 proven hook frameworks.

## Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables:
   Copy `.env.example` to `.env.local` and add your Gemini API key:

   ```bash
   cp .env.example .env.local
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment Instructions

Virality AI is a full-stack application. The frontend is a React application built with Vite, and the backend relies on serverless functions to securely interact with the Gemini API without leaking your API key to the client.

### Option 1: Vercel (Recommended)

Vercel is the easiest way to deploy this application because it natively supports both the Vite frontend and the `/api` serverless functions.

1. Push your code to a GitHub repository.
2. Go to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your repository.
4. **Environment Variables**: Add `GEMINI_API_KEY` in the Environment Variables section.
5. Vercel will automatically detect the Vite build settings (`npm run build`, `dist` output directory) and the Serverless Functions in the `/api` directory.
6. Click **Deploy**.

### Option 2: Netlify (Frontend) + Render/Railway (Backend)

If you prefer to decouple the frontend and backend, you must split the application. The current repository structure relies on Vercel Serverless Functions (`@vercel/node`), so deploying the `/api` directory natively on Render requires converting those handlers to a standard Express server.

**Step 1: Frontend (Netlify)**

1. Connect your repository to Netlify.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. _Important:_ You must update `src/services/hooksApi.ts` to point to your new backend URL instead of relative `/api/...` paths.

**Step 2: Backend (Render / Railway / Heroku)**

1. You will need to create a dedicated Express `server.js` file that imports the logic from `src/server/hookGeneration.ts` and creates `/api/generate-hooks` and `/api/rewrite-hook` endpoints.
2. Ensure you set the `GEMINI_API_KEY` securely in the dashboard of your chosen backend provider.
3. Configure CORS to allow requests from your Netlify frontend URL.
