# Repository Guidelines

## Project Structure & Module Organization
Next.js App Router pages live in `src/app`, grouped by route so UI, server actions, and styles stay co-located. Shared UI such as `achievement-modal.tsx` and `auth-panel.tsx` live in `src/components`, custom hooks in `src/hooks`, and Supabase/browser helpers in `src/lib`. Assets that do not require bundling (icons, OG images, fonts) belong in `public`.

## Build, Test, and Development Commands
- `npm install` – install dependencies after cloning or pulling a large change.
- `npm run dev` – launch the local dev server with hot reload at http://localhost:3000; `/game` hosts the location mini-game mock.
- `npm run build` – compile the production bundle and surface type/env regressions.
- `npm start` – serve the built app to reproduce production behavior.
- `npm run lint` – run ESLint (Next.js preset) to enforce hooks rules, import order, and Tailwind usage.

## Coding Style & Naming Conventions
All code is TypeScript with `strict` enabled, so prefer explicit props and discriminated unions over `any`. Use functional components; mark browser-only modules with `'use client'`, and reference shared modules via the `@/*` alias. Components/hooks are PascalCase, helpers camelCase, and files should match their exports (e.g., `footer-status.tsx`). Keep Tailwind classes ordered by layout → spacing → color to simplify diffs, and avoid inline styles unless dynamic logic is required. Run `npm run lint` before pushing; no auto-formatter is configured.

## Testing Guidelines
There is no bundled test runner today, so linting plus manual verification of `/` and `/game` is the minimum bar. When adding automated coverage, follow the Next.js recommendation of Vitest + Testing Library, store specs as `*.test.ts(x)` next to the component or under `src/__tests__`, and stub navigator geolocation/Supabase calls. Mention estimated coverage or known blind spots in the PR description.

## Commit & Pull Request Guidelines
Git history favors short imperative summaries (`location commit`), so keep commits scoped and descriptive, referencing issues when relevant. Every PR should include: overview, testing notes (e.g., `npm run lint`), screenshots for UI deltas, and callouts for schema or `.env.local` changes. Request review before merging; once CI exists, wait for it to pass before deploys.

## Security & Configuration Tips
Never commit `.env.local`; copy from `.env.local.example` and inject Supabase keys locally. Only expose values that the browser must read via `NEXT_PUBLIC_*`. Because Supabase runs client-side, enable row-level security in the remote project and avoid shipping admin operations inside client components.
