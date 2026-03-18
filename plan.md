# Feature Plan — AI Platform

## Current State Summary

The platform has a solid foundation: chat with SSE streaming, scheduled tasks (UI only — execution is placeholder), data triggers (webhook/poll/manual — also placeholder), artifacts (partially integrated), settings (theme only), and a clean Angular 21 + Fastify + SQLite stack. No auth (single-user by design). No real background job execution yet.

---

## Proposed Features — Critical Analysis

### 1. Microsoft Graph API Integration (Email & Calendar)

**What it would do:** Read/send emails, create/manage calendar events, pull contacts — all from within the platform.

**Verdict: Yes, but scope it tightly.**

**Why it's valuable:**
- This is where the platform goes from "chatbot wrapper" to "personal assistant." Email triage and calendar awareness are the highest-leverage automations for a personal tool.
- Graph API is the right choice if you're on Microsoft 365. It's one OAuth flow for mail, calendar, contacts, OneDrive, etc.
- Integrates naturally with existing features: tasks can send email digests, triggers can fire on new emails, chat can draft replies.

**Risks & concerns:**
- **OAuth 2.0 complexity.** Graph requires Azure AD app registration, authorization code flow with PKCE, token refresh, and consent scopes. This is a full auth subsystem to build and maintain. For a single-user app you could use a long-lived refresh token, but it still expires and needs rotation.
- **Scope creep.** "Email integration" can balloon from "read inbox" to "full email client." Define the boundary: read-only triage + AI-drafted replies + send via approval? Or full CRUD?
- **Rate limits & pagination.** Graph API has throttling (429s) and paginated responses. You'll need retry logic and delta queries for efficient syncing.
- **Data storage.** Do you cache emails in SQLite? If yes, you're building a local email index. If no, every action hits the API.

**Recommended scope (Phase 1):**
- Azure AD OAuth flow with token storage in SQLite
- Read recent emails (last 24h / unread) — no full sync
- AI-powered email summarization in chat ("summarize my unread emails")
- Draft reply via chat, send on explicit approval
- Read today's calendar events ("what's on my calendar today?")
- Create calendar events from chat ("schedule a meeting with X at 3pm")
- **Skip for now:** contacts sync, OneDrive, full email search, email rules

**Implementation:**
- New `api/src/services/graph.service.ts` — token management, Graph client
- New `api/src/routes/graph.routes.ts` — OAuth callback, email/calendar endpoints
- New settings UI section for Microsoft account connection
- Extend AI system prompt with tool-use for email/calendar actions
- New DB tables: `oauth_tokens`, optionally `email_cache`

---

### 2. Self-Learning System

**What it would do:** The platform learns from its own execution history — reviewing task/trigger run logs, identifying patterns, and improving prompts or suggesting new automations.

**Verdict: Partially. The log review is valuable; "self-learning" is overpromised.**

**Why it's valuable (the good parts):**
- **Run log review:** Tasks and triggers already store run outputs. An AI pass over recent runs to flag failures, summarize trends, or suggest prompt tweaks is genuinely useful and straightforward to build.
- **Prompt refinement:** If a task consistently produces poor results, the system could suggest prompt improvements. This is achievable with a meta-prompt that reviews output quality.
- **Schedule optimization:** If a task runs hourly but only produces meaningful output twice a day, suggest a better schedule.

**Why "self-learning" is dangerous:**
- **Feedback loops.** An AI modifying its own prompts without human review creates drift. After 10 iterations, the prompt may be unrecognizable. Every change must be human-approved.
- **No ground truth.** What does "better" mean? Without explicit user feedback (thumbs up/down, corrections), the system is guessing. "Self-learning" without a loss function is just mutation.
- **Complexity vs. value.** A system that reviews logs and surfaces insights (dashboard) is 10x simpler and nearly as useful as one that autonomously rewrites its own behavior.

**Recommended scope:**
- **Run analytics dashboard:** Success/failure rates, token usage trends, output length distribution per task/trigger. This is mostly SQL aggregation + charts.
- **AI log review task:** A built-in meta-task that periodically reviews recent runs and produces a summary: "Task X failed 3/10 times this week, common error: rate limit. Suggestion: reduce frequency."
- **Prompt suggestions:** When viewing a task, offer "Analyze & improve prompt" button that sends the prompt + recent outputs to Claude for critique. User reviews and applies manually.
- **Skip:** Autonomous prompt modification, unsupervised learning loops, automatic schedule changes.

**Implementation:**
- New `api/src/routes/analytics.routes.ts` — aggregation endpoints
- Dashboard component in settings or as a new top-level feature
- "Analyze prompt" action on task/trigger detail views
- Extend run history to include structured metadata (token count, response time, output hash for dedup)

---

### 3. Dynamically Rendered Components

**What it would do:** AI responses can include structured data (charts, forms, tables, interactive widgets) that render as real Angular components instead of plain markdown.

**Verdict: Yes — this is the artifact system's natural evolution.**

**Why it's valuable:**
- You already have artifact detection (code blocks → artifact panel). Extending this to render actual components (charts, data tables, Mermaid diagrams, forms) makes the platform dramatically more useful for research.
- Differentiates from every other chat UI that just renders markdown.
- Enables AI to produce actionable outputs: a form the user fills out, a chart they can interact with, a table they can sort/filter.

**Risks & concerns:**
- **Security.** If "dynamic components" means executing AI-generated code at runtime, this is an XSS vector. You must use a whitelist of known component types, NOT arbitrary code execution.
- **Complexity.** Angular's AOT compilation means you can't just `eval()` a component. You need a registry of pre-built components that get selected based on structured AI output.
- **AI reliability.** The AI must output valid structured data (JSON schema) to drive these components. Malformed output = broken UI. Need graceful fallback to raw content.

**Recommended approach:**
- Define a component registry: `chart`, `data-table`, `mermaid-diagram`, `form`, `code-editor`, `image-gallery`, `key-value-list`
- AI outputs structured blocks (JSON with `type` + `data` fields) detected during streaming
- `DynamicBlockComponent` uses `@switch` on type to render the appropriate pre-built component
- Each component type has a JSON schema for validation
- Fallback: if data doesn't validate, render as raw JSON in a code block
- **Do NOT:** eval code, use `ComponentFactoryResolver` with runtime compilation, or allow arbitrary HTML injection

**Implementation:**
- Extend artifact model with richer type system
- New shared components: `ChartComponent` (lightweight — Chart.js or similar), `DataTableComponent`, `MermaidComponent`
- Update `MessageBubbleComponent` to detect and render dynamic blocks inline
- Update AI system prompt to describe available output formats
- Add JSON schema validation for each block type

---

### 4. History & Artifacts (Enhancement)

**What it would do:** Full-featured artifact management — browsing, searching, versioning, and exporting artifacts across all sources (chat, tasks, triggers).

**Verdict: Yes — finish what's already started.**

**Why it's valuable:**
- Artifacts already exist in the DB and have basic CRUD routes, but they're barely integrated. Chat detects code blocks but doesn't persist them as artifacts. Tasks/triggers don't produce artifacts at all.
- A unified artifact browser turns the platform from "chat history you scroll through" to "knowledge base you search."
- This is prerequisite infrastructure for the dynamic components feature above.

**What's actually missing:**
- **Artifact persistence from chat:** Currently artifacts are detected client-side but not saved to the DB via the API.
- **Artifact generation from tasks/triggers:** Run outputs should optionally produce artifacts.
- **Browsing UI:** No dedicated artifact browser page exists. You can only see artifacts inline in chat.
- **Search:** No full-text search on artifact content.
- **Versioning:** No version history. If the AI regenerates a response, the old artifact is gone.
- **Export:** No download/copy/share functionality beyond the copy button in the panel.

**Recommended scope:**
- **Persist artifacts from chat:** When AI produces code/structured content, save to artifacts table with `sourceType: 'chat'` and link to conversation.
- **Artifact browser page:** New `/artifacts` route with grid/list view, filtering by type/source, full-text search (SQLite FTS5).
- **Artifact from task/trigger runs:** When a run completes, parse output for artifact-worthy content and save.
- **Export:** Download as file (code → `.py`/`.js`/etc., markdown → `.md`, JSON → `.json`).
- **Version history:** Optional — track artifact updates with a `artifact_versions` table. Only if there's a clear use case.
- **Skip for now:** Sharing, collaboration, artifact-to-artifact linking, tagging.

**Implementation:**
- New feature route `/artifacts` with browse/search UI
- SQLite FTS5 virtual table for artifact search
- Update chat streaming to persist detected artifacts via API
- Update task/trigger execution to parse and save artifacts
- Export endpoint: `GET /api/artifacts/:id/download`

---

### 5. Tracing

**What it would do:** Observability into AI operations — tracking token usage, latency, prompt chains, tool calls, and costs across all AI interactions.

**Verdict: Yes, but build it lean.**

**Why it's valuable:**
- You're running AI calls across chat, tasks, and triggers. Without tracing, you're flying blind on costs, performance, and failure modes.
- Essential for the "self-learning" log review feature — you need structured trace data to analyze.
- Debugging AI issues ("why did the task produce garbage?") requires seeing the full prompt, response, and any tool calls.

**Why not to over-build:**
- Full distributed tracing (OpenTelemetry, Jaeger) is overkill for a single-user SQLite app. You don't have microservices.
- Third-party tracing platforms (LangSmith, Langfuse) add external dependencies and costs. For a personal tool, local is better.

**Recommended scope:**
- **Trace table in SQLite:** Each AI call gets a trace record: `id`, `source` (chat/task/trigger), `sourceId`, `model`, `inputTokens`, `outputTokens`, `latencyMs`, `status`, `error`, `createdAt`.
- **Trace detail:** Store the full system prompt + user messages + response for debugging. Link to conversation/task/trigger.
- **Dashboard:** Token usage over time (daily/weekly), cost estimation (tokens × rate), latency percentiles, error rate.
- **Inline visibility:** Show token count and latency on each chat message and task/trigger run.
- **Skip:** OpenTelemetry integration, distributed trace IDs, span trees, external exporters.

**Implementation:**
- New DB table: `traces`
- Wrap `AIService.streamChatResponse()` to automatically record traces
- New `api/src/routes/trace.routes.ts` — query endpoints with aggregation
- Dashboard component (could live under settings or as standalone page)
- Extend `MessageBubbleComponent` and `RunHistoryItemComponent` to show trace metadata

---

## Priority Ranking

Ordered by value-to-effort ratio and dependency chain:

| Priority | Feature | Effort | Value | Rationale |
|----------|---------|--------|-------|-----------|
| **P0** | Real task/trigger execution | Medium | Critical | **Everything else is moot if scheduled tasks and triggers don't actually run.** The current placeholder implementations need to be replaced with a real cron runner and webhook processor before adding new features on top. |
| **P1** | History & Artifacts | Medium | High | Finish existing half-built system. Prerequisite for dynamic components. No new external deps. |
| **P2** | Tracing | Low-Med | High | Mostly DB + aggregation. Unlocks cost visibility and debugging. Prerequisite for self-learning log review. |
| **P3** | Dynamic Components | Medium | High | Biggest UX differentiator. Build on completed artifact system. |
| **P4** | Self-Learning (Log Review) | Medium | Medium | Depends on tracing data. Keep scope to insights dashboard + prompt suggestions, not autonomous modification. |
| **P5** | Graph API Integration | High | High | Most complex (OAuth, external API, token management). Highest long-term value but save for last when the foundation is solid. |

---

## What I'd Cut or Defer

- **"Self-learning" as autonomous prompt rewriting** — high risk, low trust, hard to debug. Replace with human-in-the-loop prompt suggestions.
- **Full email client via Graph** — scope to triage + draft + send. Don't rebuild Outlook.
- **Runtime code execution for dynamic components** — security nightmare. Use a component registry with pre-built types.
- **Artifact versioning** — only build if you find yourself regenerating content frequently. YAGNI otherwise.
- **External tracing platforms** — unnecessary for single-user. Local SQLite traces are sufficient.

---

## What's Missing From Your List

Features worth considering that weren't proposed:

1. **Real task/trigger execution engine (P0)** — Tasks and triggers are currently placeholders. Before adding any new features, the existing scheduled execution (cron) and webhook/poll processing need to actually work. This is arguably the most important thing to build next.
2. **Tool use / function calling** — The Vercel AI SDK supports tool definitions. Enabling the AI to call tools (search the web, query APIs, read files) would multiply the platform's usefulness. This is the backbone that makes Graph API integration, email triage, and calendar management possible through natural chat rather than dedicated UI.
3. **Conversation branching / forking** — When exploring research topics, being able to branch a conversation at any point is valuable. Simpler than it sounds: duplicate messages up to branch point into a new conversation.
4. **System prompt management** — Currently hardcoded in `ai.service.ts`. A settings page to customize the AI's personality, knowledge context, and available tools per conversation or globally.
5. **File/document upload** — Drag-and-drop files into chat for analysis. Requires multipart upload endpoint and document parsing (PDF, CSV, etc.).
