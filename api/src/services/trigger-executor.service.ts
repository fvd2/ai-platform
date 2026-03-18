import { randomUUID } from 'crypto';
import { getDb } from '../db/index.js';
import { generateResponse } from './ai.service.js';

interface TriggerRow {
  id: string;
  name: string;
  type: string;
  prompt: string;
  config: string;
  status: string;
}

interface TriggerConfig {
  url?: string;
  interval?: number;
  filter?: string;
  [key: string]: unknown;
}

const pollIntervals = new Map<string, ReturnType<typeof setInterval>>();

/**
 * Execute a trigger: create a run, call AI with prompt + context, update records.
 */
export async function executeTrigger(
  triggerId: string,
  eventSummary: string,
  context?: string,
): Promise<string> {
  const db = getDb();
  const trigger = db
    .prepare('SELECT id, name, type, prompt, config, status FROM triggers WHERE id = ?')
    .get(triggerId) as TriggerRow | undefined;

  if (!trigger) {
    throw new Error(`Trigger not found: ${triggerId}`);
  }

  const runId = randomUUID();

  // Create run record with 'running' status
  db.prepare(
    `INSERT INTO trigger_runs (id, trigger_id, status, event_summary)
     VALUES (?, ?, 'running', ?)`,
  ).run(runId, triggerId, eventSummary);

  try {
    const result = await generateResponse(trigger.prompt, context);

    db.prepare(
      `UPDATE trigger_runs SET status = 'success', output = ?, completed_at = datetime('now')
       WHERE id = ?`,
    ).run(result.text, runId);

    db.prepare(
      `UPDATE triggers SET run_count = run_count + 1, last_fired_at = datetime('now'),
              updated_at = datetime('now') WHERE id = ?`,
    ).run(triggerId);

    return runId;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    db.prepare(
      `UPDATE trigger_runs SET status = 'error', error = ?, completed_at = datetime('now')
       WHERE id = ?`,
    ).run(errorMessage, runId);

    db.prepare(
      `UPDATE triggers SET run_count = run_count + 1, last_fired_at = datetime('now'),
              updated_at = datetime('now') WHERE id = ?`,
    ).run(triggerId);

    return runId;
  }
}

/**
 * Process a webhook payload for a trigger.
 * Checks if trigger is active, applies filter, then executes.
 */
export async function processWebhook(
  triggerId: string,
  payload: unknown,
): Promise<string> {
  const db = getDb();
  const trigger = db
    .prepare('SELECT id, name, type, prompt, config, status FROM triggers WHERE id = ?')
    .get(triggerId) as TriggerRow | undefined;

  if (!trigger) {
    throw new Error(`Trigger not found: ${triggerId}`);
  }

  if (trigger.status !== 'active') {
    throw new Error('Trigger is not active');
  }

  const config = JSON.parse(trigger.config) as TriggerConfig;

  // Apply filter if configured
  if (config.filter && !evaluateFilter(config.filter, payload)) {
    // Filter did not match, skip execution
    return '';
  }

  const payloadStr = JSON.stringify(payload, null, 2);
  const eventSummary = `Webhook received`;

  return executeTrigger(triggerId, eventSummary, payloadStr);
}

/**
 * Evaluate a simple filter expression against a payload.
 * Supports expressions like "body.action == \"opened\"" or "body.status == \"active\""
 */
export function evaluateFilter(filter: string, payload: unknown): boolean {
  try {
    // Parse "path == value" or "path != value"
    const eqMatch = filter.match(/^(.+?)\s*==\s*(.+)$/);
    const neqMatch = filter.match(/^(.+?)\s*!=\s*(.+)$/);

    if (!eqMatch && !neqMatch) {
      // If we can't parse the filter, pass through
      return true;
    }

    const isEqual = !!eqMatch;
    const match = eqMatch ?? neqMatch;
    if (!match) return true;

    const path = match[1].trim();
    const expectedRaw = match[2].trim();

    // Remove surrounding quotes from expected value
    const expected = expectedRaw.replace(/^["']|["']$/g, '');

    // Resolve the path against the payload
    const actual = resolvePath(payload, path);

    return isEqual ? String(actual) === expected : String(actual) !== expected;
  } catch {
    // On any error, pass through
    return true;
  }
}

/**
 * Resolve a dot-separated path on an object.
 * e.g., resolvePath({ body: { action: "opened" } }, "body.action") => "opened"
 */
function resolvePath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Start polling for a single trigger.
 */
export function startPolling(trigger: TriggerRow): void {
  stopPolling(trigger.id);

  if (trigger.status !== 'active' || trigger.type !== 'poll') {
    return;
  }

  const config = JSON.parse(trigger.config) as TriggerConfig;
  if (!config.url) {
    console.warn(`Poll trigger ${trigger.id} has no URL configured`);
    return;
  }

  // Default interval: 60 seconds, minimum 10 seconds
  const intervalMs = Math.max((config.interval ?? 60) * 1000, 10000);

  const interval = setInterval(() => {
    void pollOnce(trigger.id);
  }, intervalMs);

  pollIntervals.set(trigger.id, interval);
}

/**
 * Perform a single poll for a trigger.
 */
async function pollOnce(triggerId: string): Promise<void> {
  const db = getDb();
  const trigger = db
    .prepare('SELECT id, name, type, prompt, config, status FROM triggers WHERE id = ?')
    .get(triggerId) as TriggerRow | undefined;

  if (!trigger || trigger.status !== 'active') {
    stopPolling(triggerId);
    return;
  }

  const config = JSON.parse(trigger.config) as TriggerConfig;
  if (!config.url) return;

  try {
    const response = await fetch(config.url);
    const contentType = response.headers.get('content-type') ?? '';
    let body: unknown;

    if (contentType.includes('application/json')) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    // Check filter condition if configured
    if (config.filter && !evaluateFilter(config.filter, body)) {
      return; // Condition not met, skip
    }

    const context = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
    const eventSummary = `Poll: ${config.url} (status ${response.status})`;

    await executeTrigger(triggerId, eventSummary, context);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`Poll error for trigger ${triggerId}:`, errorMessage);
  }
}

/**
 * Stop polling for a trigger.
 */
export function stopPolling(triggerId: string): void {
  const existing = pollIntervals.get(triggerId);
  if (existing) {
    clearInterval(existing);
    pollIntervals.delete(triggerId);
  }
}

/**
 * Restart polling for a trigger (e.g., after config update). Reloads from DB.
 */
export function restartPolling(triggerId: string): void {
  const db = getDb();
  const trigger = db
    .prepare('SELECT id, name, type, prompt, config, status FROM triggers WHERE id = ?')
    .get(triggerId) as TriggerRow | undefined;

  if (!trigger) {
    stopPolling(triggerId);
    return;
  }

  startPolling(trigger);
}

/**
 * Initialize all active poll triggers.
 */
export function initPollTriggers(): void {
  const db = getDb();
  const triggers = db
    .prepare("SELECT id, name, type, prompt, config, status FROM triggers WHERE type = 'poll' AND status = 'active'")
    .all() as TriggerRow[];

  for (const trigger of triggers) {
    startPolling(trigger);
  }

  console.log(`Poll triggers initialized: ${triggers.length} active poll triggers`);
}

/**
 * Stop all poll intervals.
 */
export function stopAllPolling(): void {
  for (const [id, interval] of pollIntervals) {
    clearInterval(interval);
    pollIntervals.delete(id);
  }
  console.log('All poll triggers stopped');
}

/**
 * Get the number of active poll intervals (useful for testing).
 */
export function getActivePollCount(): number {
  return pollIntervals.size;
}
