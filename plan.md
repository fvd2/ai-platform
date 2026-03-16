# UI Design Plan: Interaction Types + Artifacts

## Design Philosophy

All three features share one pattern: **you give AI instructions, it produces output**. The only difference is *when* it runs:

| Type | Trigger | Interaction Style |
|------|---------|-------------------|
| **Chat** | User sends a message | Real-time, conversational, back-and-forth |
| **Tasks** | A schedule fires (cron/interval) | Autonomous, runs in background, produces reports |
| **Triggers** | A condition is met (webhook, data change) | Reactive, event-driven, produces alerts/actions |

**Artifacts** are the structured outputs any of these can produce — code, documents, tables, summaries — displayed in a dedicated panel rather than inlined in text.

---

## 1. Global Layout Evolution

### Current Layout
```
┌──────────┬───────────────────────────────────────┐
│ NAV (260)│  CONTENT                               │
│          │                                        │
│ Chat     │  (full width page)                     │
│ Tasks    │                                        │
│ Triggers │                                        │
│ Settings │                                        │
└──────────┴───────────────────────────────────────┘
```

### New Layout — with Artifact Panel
```
┌──────────┬──────────────────────────┬─────────────┐
│ NAV (64) │  CONTENT                 │  ARTIFACT   │
│          │                          │  PANEL      │
│  💬      │  Sub-sidebar │ Main area │  (slide-in, │
│  📋      │  (contextual)│           │   420px)    │
│  ⚡      │              │           │             │
│          │              │           │             │
│  ──      │              │           │             │
│  ⚙️      │              │           │             │
└──────────┴──────────────┴───────────┴─────────────┘
```

**Key change**: The main nav sidebar collapses to an **icon rail** (64px). This gives more horizontal space for the three-panel layout (sub-sidebar + main + artifacts). Each feature provides its own contextual sub-sidebar. The nav rail shows icons with tooltips, with labels revealed on hover/focus.

---

## 2. Chat Feature (Enhanced)

### Layout
```
┌──────┬─────────────┬─────────────────────┬──────────────┐
│ Rail │ Conversations│    Messages          │  Artifact    │
│      │ (240px)     │                      │  Panel       │
│  💬  │             │  ┌─────────────────┐ │  (optional)  │
│  📋  │ + New Chat  │  │ User message    │ │              │
│  ⚡  │             │  └─────────────────┘ │  ┌────────┐  │
│      │ Today       │  ┌─────────────────┐ │  │ Code   │  │
│  ──  │  > Conv 1   │  │ AI response     │ │  │ block  │  │
│  ⚙️  │  > Conv 2   │  │                 │ │  │        │  │
│      │             │  │  [View artifact]│ │  └────────┘  │
│      │ Yesterday   │  └─────────────────┘ │              │
│      │  > Conv 3   │                      │              │
│      │             │  ┌─────────────────┐ │              │
│      │             │  │ [Input area   ] │ │              │
│      │             │  └─────────────────┘ │              │
└──────┴─────────────┴─────────────────────┴──────────────┘
```

### What Changes
- Conversations sub-sidebar gains **date grouping** (Today, Yesterday, Previous 7 days, Older)
- AI messages that contain structured content (code blocks, markdown docs, tables) render an **artifact card** — a compact preview with a "View" button
- Clicking an artifact card opens/updates the **Artifact Panel** on the right
- When no artifact is open, the messages area takes full remaining width
- Artifact panel slides in from the right with a smooth 300ms ease transition

### Artifact Detection
The AI response is parsed for artifact-worthy content:
- Fenced code blocks (```language ... ```) longer than ~5 lines
- Markdown tables
- Structured data / JSON blocks
- Explicitly tagged artifacts (future: tool-use output)

Short inline code stays in the message. Only substantial blocks get promoted to artifacts.

---

## 3. Tasks Feature (Recurring/Scheduled)

### Layout
```
┌──────┬─────────────┬──────────────────────────────────────┐
│ Rail │ Task List    │    Task Detail                       │
│      │ (280px)     │                                      │
│  💬  │             │  ┌──────────────────────────────────┐│
│  📋  │ + New Task  │  │ Task Name            [ON] toggle ││
│  ⚡  │             │  │ Every day at 9:00 AM             ││
│      │ ● Active(3) │  ├──────────────────────────────────┤│
│  ──  │  > Daily    │  │ PROMPT                           ││
│  ⚙️  │    digest   │  │ "Summarize my RSS feeds and..."  ││
│      │  > Weekly   │  │                          [Edit]  ││
│      │    report   │  ├──────────────────────────────────┤│
│      │  > Health   │  │ RUN HISTORY                      ││
│      │    check    │  │                                  ││
│      │             │  │ ✓ Mar 16, 9:00 AM  [View output] ││
│      │ ○ Paused(1) │  │ ✓ Mar 15, 9:00 AM  [View output] ││
│      │  > Old task │  │ ✗ Mar 14, 9:00 AM  [View error]  ││
│      │             │  │                                  ││
│      │             │  └──────────────────────────────────┘│
└──────┴─────────────┴──────────────────────────────────────┘
```

### Task List (Sub-sidebar)
- **"+ New Task"** button at top (primary style)
- Tasks grouped by status: **Active** (green dot) / **Paused** (gray dot)
- Each item shows: task name, next run time (muted), status indicator
- Active task highlighted with left border accent

### Task Detail (Main Area)
Split into clear sections:

**Header**
- Task name (editable inline)
- Schedule description in human-readable form ("Every weekday at 9:00 AM")
- ON/OFF toggle switch (enables/disables the schedule)
- Actions: Edit, Duplicate, Delete

**Prompt Section**
- Displays the task's AI instructions
- Expandable textarea for editing
- Optional: model selector, max tokens

**Schedule Section**
- Visual schedule picker with presets:
  - Every N minutes/hours
  - Daily at [time]
  - Weekly on [days] at [time]
  - Custom cron expression (advanced toggle)
- Shows next 3 upcoming runs

**Run History**
- Reverse-chronological list of past executions
- Each run shows: timestamp, duration, status (success/failure), token usage
- Click a run to expand and see:
  - The full AI output
  - Any artifacts produced
  - Error details (if failed)
- "View output" opens the artifact panel with that run's full output

### New Task Flow
1. Click "+ New Task"
2. **Step 1**: Name + Prompt (large textarea, placeholder: "What should the AI do?")
3. **Step 2**: Schedule picker (presets + custom cron)
4. **Step 3**: Review & Create
- Single-page form, no wizard/stepper needed — just well-organized sections with a sticky "Create Task" button at bottom

---

## 4. Triggers Feature (Event-Driven)

### Layout
```
┌──────┬─────────────┬──────────────────────────────────────┐
│ Rail │ Trigger List │    Trigger Detail                    │
│      │ (280px)     │                                      │
│  💬  │             │  ┌──────────────────────────────────┐│
│  📋  │ + New       │  │ Trigger Name         [ON] toggle ││
│  ⚡  │   Trigger   │  │ ⚡ Webhook · 12 runs              ││
│      │             │  ├──────────────────────────────────┤│
│  ──  │ ● Active(2) │  │ CONDITION                        ││
│  ⚙️  │  > New PR   │  │ Type: Webhook                    ││
│      │    review   │  │ URL: /api/triggers/abc123/fire   ││
│      │  > Error    │  │ Filter: body.action == "opened"  ││
│      │    alert    │  ├──────────────────────────────────┤│
│      │             │  │ PROMPT                           ││
│      │ ○ Paused(1) │  │ "Review the PR diff and..."      ││
│      │  > Old one  │  │                          [Edit]  ││
│      │             │  ├──────────────────────────────────┤│
│      │             │  │ RECENT RUNS                      ││
│      │             │  │                                  ││
│      │             │  │ ✓ Mar 16, 2:14 PM  PR #42 rev.. ││
│      │             │  │ ✓ Mar 15, 11:02 AM PR #41 rev.. ││
│      │             │  └──────────────────────────────────┘│
└──────┴─────────────┴──────────────────────────────────────┘
```

### Trigger Types (initial set)
1. **Webhook** — receives an HTTP POST, runs AI with the payload as context
2. **Schedule + Condition** — polls a URL/API on a schedule, runs AI only when data changes
3. **Manual** — fire-and-forget button (useful for testing or one-off runs with a saved prompt)

### Trigger List (Sub-sidebar)
- Same pattern as Tasks: grouped by Active/Paused
- Each item: name, type icon, last fired time
- Color-coded type badges (webhook = purple, poll = amber, manual = gray)

### Trigger Detail (Main Area)

**Header**
- Trigger name + type badge
- ON/OFF toggle
- Run count / last run time
- Actions: Edit, Test Fire, Duplicate, Delete

**Condition Section** (varies by type)
- *Webhook*: Shows the unique webhook URL (copy button), optional JSON path filter
- *Schedule + Condition*: URL to poll, polling interval, JSONPath condition expression
- *Manual*: Just a "Fire Now" button

**Prompt Section**
- Same as Tasks — the AI instructions
- Template variables available: `{{payload}}`, `{{timestamp}}`, `{{previous_result}}`
- Syntax-highlighted preview of the rendered prompt with sample data

**Run History**
- Same pattern as Tasks
- Each run shows: trigger event summary, AI output preview, status
- Expandable to full output + artifacts

### New Trigger Flow
- Similar to Tasks: single-page form
- Type selector at top (three cards: Webhook, Poll, Manual)
- Config fields change based on selected type
- Prompt editor + "Create Trigger" button

---

## 5. Artifact Panel

This is the most cross-cutting new feature. It's a **slide-over panel** that appears on the right side of any page.

### Layout
```
┌──────────────────────────────────────────┐
│  ┌─ Artifact Panel ─────────────────┐    │
│  │ [×]  artifact-name.py    [⤓] [📋]│    │
│  │──────────────────────────────────│    │
│  │ ┌──────────────────────────────┐ │    │
│  │ │                              │ │    │
│  │ │  def hello():               │ │    │
│  │ │      print("Hello world")   │ │    │
│  │ │                              │ │    │
│  │ │                              │ │    │
│  │ │                              │ │    │
│  │ └──────────────────────────────┘ │    │
│  │                                  │    │
│  │  Created from: Daily Digest      │    │
│  │  Mar 16, 2026 · 2.4 KB          │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

### Artifact Types & Rendering
| Type | Rendering |
|------|-----------|
| **Code** | Syntax-highlighted block with language tag, line numbers |
| **Markdown** | Rendered HTML (headings, lists, links, etc.) |
| **Table/CSV** | Formatted table with sortable columns |
| **JSON** | Collapsible tree view with syntax highlighting |
| **Plain text** | Monospace with preserved whitespace |

### Panel Behavior
- **Width**: 420px (CSS variable `--artifact-panel-width`)
- **Appears**: Slides in from right with `transform: translateX` animation (300ms ease)
- **Disappears**: Close button (×) or clicking outside, slides back out
- **Resizable**: Drag handle on left edge (stretch to 50% max viewport)
- **Stacks**: Only one artifact open at a time; clicking another replaces it
- **Toolbar**: Close, copy to clipboard, download as file, open fullscreen

### Artifact in Messages
Inside a chat message, an artifact renders as a compact card:
```
┌─────────────────────────────────────┐
│ 📄 daily-summary.md                 │
│ Markdown · 1.2 KB                   │
│                                     │
│ > Here's your daily summary for     │
│ > March 16th. The key highlights... │
│                              [View] │
└─────────────────────────────────────┘
```
- Shows: icon, filename/title, type, size, 2-3 line preview
- "View" button opens the artifact panel

---

## 6. Artifact Model (Data)

```typescript
interface Artifact {
  id: string;
  title: string;                      // e.g. "daily-summary.md"
  type: 'code' | 'markdown' | 'table' | 'json' | 'text';
  language?: string;                  // for code: 'python', 'typescript', etc.
  content: string;                    // raw content
  sourceType: 'chat' | 'task' | 'trigger';
  sourceId: string;                   // conversation_id, task_id, or trigger_id
  runId?: string;                     // for task/trigger: which run produced it
  createdAt: string;
}
```

### DB Schema Addition
```sql
CREATE TABLE artifacts (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('code', 'markdown', 'table', 'json', 'text')),
  language    TEXT,
  content     TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('chat', 'task', 'trigger')),
  source_id   TEXT NOT NULL,
  run_id      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 7. Design System Additions

### New CSS Variables Needed
```scss
// Layout
--nav-rail-width: 64px;         // collapsed nav
--sub-sidebar-width: 280px;     // contextual sidebar
--artifact-panel-width: 420px;  // artifact slide-over

// New semantic colors
--color-success: #{$green-600};
--color-success-light: #{$green-50};
--color-warning: #{$amber-600};
--color-warning-light: #{$amber-50};
--color-purple: #7c3aed;        // for webhook badges
--color-purple-light: #f5f3ff;

// Status indicators
--color-status-active: #{$green-500};
--color-status-paused: #{$gray-400};
--color-status-error: #{$red-500};
--color-status-running: #{$blue-500};
```

### Shared Components Needed
1. **`StatusBadge`** — colored dot + label (Active, Paused, Error, Running)
2. **`Toggle`** — on/off switch for enabling tasks/triggers
3. **`ArtifactCard`** — compact preview card for inline display
4. **`ArtifactPanel`** — the slide-over viewer
5. **`EmptyState`** — reusable empty state with icon, title, description, CTA
6. **`RunHistoryItem`** — expandable row for task/trigger run history
7. **`SchedulePicker`** — visual cron/interval selector
8. **`PromptEditor`** — textarea with template variable support

---

## 8. Navigation Redesign: Icon Rail

The current 260px text sidebar becomes a 64px icon rail:

```
┌──────┐
│  🔷  │  ← Logo (small mark)
│      │
│  💬  │  ← Chat (tooltip: "Chat")
│  📋  │  ← Tasks (tooltip: "Tasks")
│  ⚡  │  ← Triggers (tooltip: "Triggers")
│      │
│      │
│      │
│  ⚙️  │  ← Settings (pushed to bottom)
└──────┘
```

- Icons centered, 40×40px hit target
- Active state: icon gets primary color bg pill
- Tooltip on hover shows label
- Settings pushed to bottom with separator
- Frees up ~200px of horizontal space for content

---

## 9. Implementation Phases

### Phase A: Layout Refactor + Artifact Panel Shell
1. Convert nav sidebar to icon rail
2. Create `ArtifactPanel` component (empty shell, slide-in/out)
3. Add CSS variables for new layout widths
4. Adjust chat feature to work with new layout

### Phase B: Chat Artifacts
1. Add artifact detection logic (parse AI responses for code blocks, tables, etc.)
2. Create `ArtifactCard` component for inline display in messages
3. Wire artifact cards to open the artifact panel
4. Create artifact renderers (code with highlighting, markdown, table, JSON)
5. Add artifact model + API endpoints + DB table

### Phase C: Tasks Feature
1. Create task model, service, API endpoints, DB tables
2. Build task list sub-sidebar component
3. Build task detail view (header, prompt, schedule, run history)
4. Build new task form with schedule picker
5. Implement task execution engine (backend cron runner)
6. Wire task runs to produce artifacts

### Phase D: Triggers Feature
1. Create trigger model, service, API endpoints, DB tables
2. Build trigger list sub-sidebar component
3. Build trigger detail view (header, condition, prompt, run history)
4. Build new trigger form with type selector
5. Implement webhook receiver endpoint
6. Implement poll-based trigger engine
7. Wire trigger runs to produce artifacts

### Phase E: Polish
1. Empty states for all features
2. Loading skeletons
3. Error states and retry
4. Keyboard shortcuts
5. Responsive behavior (collapse sub-sidebar on smaller screens)
6. Animation polish (panel transitions, list reordering)
