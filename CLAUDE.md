# AI Platform

Personal AI research platform with chat, scheduled tasks, and data triggers.

## Project setup

- **Framework**: Angular 21 (standalone components, no NgModules)
- **Language**: TypeScript (strict mode)
- **Styling**: SCSS
- **Package manager**: pnpm
- **Test framework**: Vitest (unit), Playwright (E2E)
- **Backend**: Fastify 5 + SQLite (in `api/`)
- **AI**: Vercel AI SDK with Anthropic provider
- **Prefix**: `app`

### Commands

- `pnpm start` — serve frontend locally (dev mode)
- `pnpm start:api` — serve API locally (dev mode)
- `pnpm dev` — serve both frontend and API concurrently
- `pnpm build` — production build (frontend)
- `pnpm test` — run unit tests
- `pnpm e2e` — run all E2E tests (headless Chromium)

### API commands

- `cd api && pnpm dev` — start API dev server with auto-reload
- `cd api && pnpm build` — compile API TypeScript
- `cd api && pnpm start` — run compiled API

## Architecture

- Frontend source in `src/` (Angular 21)
- Backend source in `api/src/` (Fastify, separate package.json)
- Routes defined in `src/app/app.routes.ts` (lazy-load feature routes)
- Global styles in `src/styles.scss`, design tokens in `src/styles/_variables.scss`
- Component styles import variables via `@use 'styles/variables' as *`
- Core models in `src/app/core/models/`, services in `src/app/core/services/`
- Feature pages in `src/app/features/` (chat, tasks, triggers, settings)
- Database: SQLite file at `api/data/platform.db` (gitignored)
- Dev proxy: Angular dev server proxies `/api/*` to Fastify on port 3000

See `docs/ANGULAR.md` for Angular coding conventions.
See `docs/ARCHITECTURE.md` for full architecture details.

## Coding conventions

### Angular

- Always use standalone components (do NOT set `standalone: true` — it's the default in Angular v20+)
- Use `ChangeDetectionStrategy.OnPush` on all components
- Use `input()` and `output()` functions, not decorators
- Use `inject()` instead of constructor injection
- Use signals for local state; `computed()` for derived state
- Use native control flow (`@if`, `@for`, `@switch`), not structural directives
- Use `class` bindings instead of `ngClass`; `style` bindings instead of `ngStyle`
- Do NOT use `@HostBinding` / `@HostListener` — use the `host` property in `@Component` / `@Directive`
- Prefer inline templates for small components
- Prefer reactive forms over template-driven forms
- Services: single responsibility, `providedIn: 'root'` for singletons

### TypeScript

- Strict type checking enabled
- Prefer type inference when the type is obvious
- Never use `any`; use `unknown` when uncertain
- Do NOT use `mutate` on signals — use `update` or `set`

### Formatting

- Prettier configured in `package.json`: `printWidth: 100`, `singleQuote: true`

## Pre-commit checks

- **Always run `pnpm build` and `pnpm test` before committing** to catch compilation and unit test errors early
- Fix any build errors or test failures before creating a commit

## Testing

- **Every new feature, service, or component must have accompanying Vitest tests**
- Tests live next to the source file: `foo.ts` → `foo.spec.ts`
- Use `describe` / `it` blocks with clear, behaviour-focused descriptions
- Run `pnpm test` to verify all tests pass before considering work complete

## E2E / UI testing (Playwright)

E2E tests live in `e2e/` and run headless Chromium via Playwright.

### Running E2E tests

```bash
pnpm e2e
```

## Environment variables

- `ANTHROPIC_API_KEY` — required for AI chat functionality (set in `api/.env`)
