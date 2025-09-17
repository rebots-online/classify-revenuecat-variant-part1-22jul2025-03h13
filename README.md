# Video to Learning App

This is an experimental web application that generates interactive learning apps from YouTube videos or topics using AI models. It supports multiple AI providers and models for text generation, with features like educational material generation (lesson plans, handouts, quizzes) and app refinement.

**All rights reserved.** © 2025 Robin L. M. Cheung, MBA. This project is proprietary and not open for public contributions or usage without permission.

## Features
- Generate interactive apps from YouTube URLs or text topics.
- Support for multiple AI models via OpenRouter or native providers (Google Gemini, Anthropic Claude).
- Persist model selections and API keys in localStorage.
- Embed and deploy generated apps.
- Optional educational materials: lesson plans, handouts, and quizzes.

## Architecture Overview
- **Core shell (`App.tsx`)** – coordinates credit tracking, content initiation, modal visibility, and delegates heavy lifting to `ContentContainer` while recording LLM interactions for transparency.
- **Generation pipeline (`components/ContentContainer.tsx`)** – orchestrates spec/code synthesis and optional educational materials through Gemini-powered helpers in `lib/textGeneration.ts`, prompt templates in `lib/prompts.ts`, and parsing utilities in `lib/parse.ts`.
- **Experience layer (`components/*.tsx`)** – provides reusable UI (header/footer chrome, modal surfaces, logging panel, cost indicators) that respond to state changes driven by the shell and content container.
- **Support libraries (`lib/youtube.ts`, `lib/types.ts`, `lib/parse.ts`)** – normalize inputs, convert responses, and enforce typing shared across the app.
- **Context boundary (`context.ts`)** – a placeholder for future global state expansion, currently exposing an optional `DataContext` for components that may need shared data.

Detailed AST abstractions are available in [`docs/architecture/ARCHITECTURES/20240722T0313-ast-abstraction.mmd`](docs/architecture/ARCHITECTURES/20240722T0313-ast-abstraction.mmd) and [`docs/architecture/ARCHITECTURES/20240722T0313-ast-abstraction.uml`](docs/architecture/ARCHITECTURES/20240722T0313-ast-abstraction.uml), accompanied by contextual notes in [`docs/architecture/ARCHITECTURES/20240722T0313-architecture-notes.md`](docs/architecture/ARCHITECTURES/20240722T0313-architecture-notes.md).

## Codebase Commentary
- **Strengths** – Clear separation between orchestration (`App.tsx`) and the generation pipeline (`ContentContainer.tsx`), reusable prompt templates, and modular modal components keep the UI consistent.
- **Technical debt** – `context.ts` still contains placeholder comments and is not leveraged for actual shared state; credit persistence is handled entirely in the browser and lacks backend validation; error handling for Gemini failures mostly logs to console without surfacing actionable feedback to users.
- **Operational gaps** – There is no abstraction for provider selection beyond Gemini flows, making it difficult to toggle models dynamically; streaming support exists but appears underutilized in the UI; input validation relies on regex checks without surfacing guidelines.

## Roadmap to Completion
1. **Stabilize data flows** – Finalize a concrete `DataContext` or alternative state management approach so shared resources (model settings, credits, app drafts) can be accessed outside `App.tsx`.
2. **Abstract provider adapters** – Introduce a strategy interface in `lib/textGeneration.ts` for OpenRouter and Anthropic support, ensuring UI toggles correctly map to backend calls and failure modes.
3. **Persist user assets** – Add a lightweight backend or serverless function to sync credits, generated specs, and deployed embeds; integrate authentication to disambiguate anonymous versus logged-in flows.
4. **Enhance observability** – Expand `LlmLogPanel` with filtering, export, and severity visualization so operators can diagnose prompt/response issues quickly.
5. **Testing & QA** – Layer unit tests around parsing utilities, prompt generation, and credit math; add end-to-end smoke tests that cover YouTube ingestion and material generation.

## UX Enhancement Opportunities
- **Visual hierarchy** – Introduce a split layout with a persistent preview pane, richer typography, and accent colors aligned with educational themes to reduce cognitive load.
- **Onboarding clarity** – Replace the current wallet onboarding modal with a guided carousel that explains credits, privacy, and deployment steps using iconography.
- **Interaction feedback** – Add animated progress indicators and inline status to the content input form so users understand when validation or generation is underway.
- **Material consumption** – Present lesson plans, handouts, and quizzes in card-based sections with quick-export buttons (PDF/Markdown) and collapsible sections for readability.
- **Accessibility & responsiveness** – Audit component contrast, introduce keyboard navigability for tabs and modals, and optimize the layout for tablet/small-screen devices with adaptive grids.

## Run Locally

**Prerequisites:** Node.js (v16+), npm, and API keys for selected providers (e.g., Gemini API key, OpenRouter key).

1. Clone the repository:
   ```
   git clone https://github.com/rebots-online/classify.git
   cd classify
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment:
   - Copy `.env.local.example` to `.env.local` and set your API keys (e.g., `GEMINI_API_KEY` for native Google provider).
   - For OpenRouter, the app uses a default key, but you can override it in the UI.

4. Run the development server:
   ```
   npm run dev
   ```
   - Access the app at `http://localhost:56872` (port configurable in `vite.config.ts`).

5. Usage:
   - Enter a YouTube URL, topic, or app idea in the input field.
   - Select optional materials (lesson plan, handout, quiz).
   - Choose AI model and provider from the dropdowns.
   - Click "Generate App" to create the interactive learning app.
   - Use tabs to view Spec, Code, Render, and Materials.

## Deployment
- Build the app: `npm run build`.
- Deploy the `dist` folder to a static host (e.g., Netlify, Vercel).
- For generated apps, use the "Deploy to Web" button in the UI.

## Development Notes
- The app uses Vite for bundling and React for the frontend.
- Text generation is handled via `lib/textGeneration.ts` with support for streaming responses.
- Customize prompts in `lib/prompts.ts`.

For issues or feedback, contact the repository owner.
