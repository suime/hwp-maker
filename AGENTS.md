<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Project Summary

`hwp-maker` is a self-hostable web app for creating and editing Korean HWP/HWPX documents with AI assistance.

- Primary workflow: natural-language prompt -> AI-generated content -> rhwp editor preview/editing -> local HWP/HWPX download.
- Target deployment: Vercel/self-hosted web deployment.
- Authentication: none. The app is intended to be immediately usable by anyone.
- Document processing should happen in the browser through rhwp/@rhwp/editor whenever possible.
- Server code should stay minimal and focused on proxying or listing static resources.

## Current Stack

- Next.js `16.2.4` with App Router.
- React `19.2.4`.
- TypeScript with strict project settings.
- Tailwind CSS v4 syntax via `@import "tailwindcss"` and CSS custom properties in `app/globals.css`.
- `@rhwp/editor` for the client-side HWP editor, using static studio assets under `public/rhwp-studio/`.
- AI SDK packages: `ai`, `@ai-sdk/react`, `@ai-sdk/openai`.
- OpenAI-compatible chat endpoints, including Ollama-compatible local endpoints.

## Repository Map

- `app/page.tsx`: main page; renders the editor shell.
- `app/layout.tsx`: root layout and global providers/scripts.
- `app/api/chat/route.ts`: server-side AI chat streaming proxy.
- `app/api/templates/route.ts`: lists built-in templates from `public/templates/`.
- `components/editor/`: editor shell, preview, templates, settings, profiles.
- `components/chat/`: AI chat panel, attachments, session UI.
- `components/ui/`: shared top bar, theme controls, modal/rail UI.
- `lib/ai/`: AI config, profiles, client/service abstractions.
- `lib/rhwp/loader.ts`: editor instance bridge and high-level rhwp actions.
- `lib/session/`: editor session persistence utilities.
- `lib/chat/`: chat session persistence utilities.
- `lib/attachment/`: file reading and attachment processing.
- `types/`: shared HWP and attachment types.
- `public/rhwp-studio/`: bundled rhwp editor assets, WASM, fonts, and samples.
- `public/templates/`: built-in HWP/HWPX template files.

## Development Commands

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

Run lint/build after meaningful code changes when feasible.

## Next.js Rules

- Before editing Next.js code, read the relevant guide under `node_modules/next/dist/docs/`.
- Use App Router conventions for routes, layouts, metadata, server components, and client components.
- Add `'use client'` only to files that need browser APIs, state, effects, refs, or event handlers.
- Keep server routes small. Prefer client-side document processing; use API routes only for AI proxying or server-only filesystem access.
- Do not assume older Next.js APIs or file conventions are still valid.

## Architecture Guidelines

- Keep HWP/HWPX parsing, rendering, editing, and export client-side through rhwp/@rhwp/editor.
- Use `lib/rhwp/loader.ts` as the bridge for editor instance access and document actions.
- Use `lib/ai/` for AI-related config, profiles, service calls, and response parsing.
- Avoid direct AI `fetch` calls from components; route through the existing AI abstraction or `/api/chat` where appropriate.
- Preserve OpenAI-compatible behavior. Ollama/local endpoints should continue to work.
- Treat the AI as a content generator inside an existing template/style, not as the owner of document form unless a feature explicitly requires that.
- Store per-browser UI/config state with existing storage helpers and project keys. Do not introduce global backend state unless the product direction changes.

## UI And Styling Guidelines

- Follow the existing editor-first layout: icon rail, resizable side panel, and full-height document preview.
- Prefer compact operational UI over marketing-page patterns.
- Use existing CSS semantic tokens in `app/globals.css` such as `--color-bg-panel`, `--color-brand`, and `--color-text-muted`.
- Keep theme support compatible with the current Latte/Mocha token system and `ThemeScript`.
- Tailwind is v4 in this repo; do not add v3-only configuration assumptions without checking the current setup.
- Keep text readable in Korean UI. Existing user-facing copy is primarily Korean.

## State And Persistence

- AI config is currently stored in localStorage via `lib/ai/config.ts`.
- Editor session helpers live in `lib/session/`.
- Chat session helpers live in `lib/chat/`.
- Guard browser storage and browser-only APIs with `typeof window !== 'undefined'` or client components.
- Avoid persisting API keys to a server unless explicitly requested.

## HWP/rhwp Notes

- `PreviewPanel` initializes `@rhwp/editor` dynamically on the client.
- Static studio files are served from `/rhwp-studio/index.html`.
- WASM, fonts, and sample files are under `public/rhwp-studio/`.
- Prefer adding high-level document operations to `lib/rhwp/loader.ts` before wiring them into UI or AI flows.
- If changing editor API usage, verify against the installed package behavior instead of guessing method names.
- LLM-facing rhwp document editing skills and `hwp-actions` are defined in `SKILLS.md`; keep that file in sync with `lib/ai/rhwpCommands.ts`.

## AI And Attachments

- Chat uses `@ai-sdk/react` on the client and `/api/chat` for streaming responses.
- Text attachments should be injected as bounded context; image attachments should stay compatible with vision-capable OpenAI-style APIs.
- Keep attachment size and context limits explicit.
- User-facing AI errors should be clear and recoverable.

## Code Conventions

- TypeScript first. Keep types in `types/` when they are shared across modules.
- Prefer existing folder boundaries and naming patterns.
- Keep components focused; move reusable behavior into `lib/` only when it is shared.
- Avoid broad refactors while implementing focused product changes.
- Do not silently change public template assets or rhwp bundled assets unless the task is specifically about them.
- Keep comments useful and sparse. Korean comments are acceptable where the surrounding code already uses Korean.

## Known Product TODOs

- Define AI template/style handling.
- Define profile behavior more fully.
- Implement robust editor-AI command translation.
- Decide i18n scope.
- Decide template management model for built-in and user-provided templates.
