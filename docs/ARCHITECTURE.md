# Architecture

## Overview

The AI Platform is a personal AI research assistant with three interaction modes:
1. **Chat** — conversational AI for questions, research, and analysis
2. **Scheduled Tasks** — recurring AI tasks with cron schedules (Phase 2)
3. **Data Triggers** — event-driven AI workflows (Phase 3)

## Project Structure

```
ai-platform/
├── src/                    # Angular 21 frontend
│   ├── app/
│   │   ├── core/           # Models, services, guards
│   │   ├── features/       # Feature pages (chat, tasks, triggers, settings)
│   │   ├── layout/         # App shell with sidebar nav
│   │   └── shared/         # Shared components and pipes
│   ├── environments/       # Environment configs
│   └── styles/             # Design tokens
├── api/                    # Fastify backend (separate package)
│   └── src/
│       ├── db/             # SQLite setup and schema
│       ├── routes/         # API route handlers
│       └── services/       # Business logic
└── e2e/                    # Playwright E2E tests
```

## Frontend Architecture

### Routing
- Lazy-loaded feature routes via `loadComponent()`
- App shell wraps all routes with sidebar navigation
- Chat supports `/chat` (list) and `/chat/:conversationId` (active)

### State Management
- Signal-based state in injectable services
- `ChatService` manages conversation state and SSE streaming
- No external state management library needed

### Styling
- SCSS with design tokens in `_variables.scss`
- CSS custom properties for theming
- System font stack (no external font dependencies)

## Backend Architecture

### API Server (Fastify)
- Single Fastify instance on port 3000
- Routes registered as plugins with `/api` prefix
- CORS enabled for dev proxy

### Database (SQLite)
- Single `platform.db` file in `api/data/` (gitignored)
- WAL mode for concurrent reads
- Foreign keys enforced
- Schema applied on startup

### AI Integration
- Vercel AI SDK (`ai` + `@ai-sdk/anthropic`)
- SSE streaming for chat responses
- System prompt configurable per service

## Dev Architecture
- Angular dev server (port 4200) proxies `/api/*` to Fastify (port 3000)
- `concurrently` runs both servers in dev mode
- SQLite requires no external services

## Production Architecture
- Multi-stage Docker build
- Fastify serves Angular static files via `@fastify/static`
- SQLite file persisted via Docker volume
- Traefik handles TLS termination and routing
