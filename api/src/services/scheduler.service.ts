import cron, { type ScheduledTask } from 'node-cron';
import { randomUUID } from 'crypto';
import { getDb } from '../db/index.js';
import { generateResponse } from './ai.service.js';

interface TaskRow {
  id: string;
  name: string;
  prompt: string;
  schedule: string;
  status: string;
}

const scheduledJobs = new Map<string, ScheduledTask>();

/**
 * Execute a task: create a run, call AI, update records.
 * Returns the run ID.
 */
export async function executeTask(taskId: string): Promise<string> {
  const db = getDb();
  const task = db
    .prepare('SELECT id, name, prompt, schedule, status FROM tasks WHERE id = ?')
    .get(taskId) as TaskRow | undefined;

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const runId = randomUUID();

  // Create a run record with status 'running'
  db.prepare(
    `INSERT INTO task_runs (id, task_id, status) VALUES (?, ?, 'running')`,
  ).run(runId, taskId);

  try {
    const result = await generateResponse(task.prompt);

    // Update run with success
    db.prepare(
      `UPDATE task_runs SET status = 'success', output = ?, token_usage = ?, completed_at = datetime('now')
       WHERE id = ?`,
    ).run(result.text, result.tokenUsage, runId);

    // Update task timestamps
    const nextRun = getNextCronDate(task.schedule);
    db.prepare(
      `UPDATE tasks SET last_run_at = datetime('now'), next_run_at = ?, updated_at = datetime('now')
       WHERE id = ?`,
    ).run(nextRun, taskId);

    return runId;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    db.prepare(
      `UPDATE task_runs SET status = 'error', error = ?, completed_at = datetime('now')
       WHERE id = ?`,
    ).run(errorMessage, runId);

    // Still update last_run_at even on error
    db.prepare(
      `UPDATE tasks SET last_run_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`,
    ).run(taskId);

    return runId;
  }
}

/**
 * Schedule a single task by creating a cron job.
 */
export function scheduleTask(task: TaskRow): void {
  // Remove existing job if present
  unscheduleTask(task.id);

  if (task.status !== 'active') {
    return;
  }

  if (!cron.validate(task.schedule)) {
    console.warn(`Invalid cron expression for task ${task.id}: ${task.schedule}`);
    return;
  }

  const job = cron.schedule(task.schedule, () => {
    executeTask(task.id).catch((err) => {
      console.error(`Error executing scheduled task ${task.id}:`, err);
    });
  });

  scheduledJobs.set(task.id, job);

  // Update next_run_at
  const nextRun = getNextCronDate(task.schedule);
  if (nextRun) {
    const db = getDb();
    db.prepare('UPDATE tasks SET next_run_at = ? WHERE id = ?').run(nextRun, task.id);
  }
}

/**
 * Remove a task from the scheduler.
 */
export function unscheduleTask(taskId: string): void {
  const existing = scheduledJobs.get(taskId);
  if (existing) {
    existing.stop();
    scheduledJobs.delete(taskId);
  }
}

/**
 * Reschedule a task (e.g., after update). Reloads from DB.
 */
export function rescheduleTask(taskId: string): void {
  const db = getDb();
  const task = db
    .prepare('SELECT id, name, prompt, schedule, status FROM tasks WHERE id = ?')
    .get(taskId) as TaskRow | undefined;

  if (!task) {
    unscheduleTask(taskId);
    return;
  }

  scheduleTask(task);
}

/**
 * Load all active tasks from DB and schedule them.
 */
export function initScheduler(): void {
  const db = getDb();
  const tasks = db
    .prepare("SELECT id, name, prompt, schedule, status FROM tasks WHERE status = 'active'")
    .all() as TaskRow[];

  for (const task of tasks) {
    scheduleTask(task);
  }

  console.log(`Scheduler initialized: ${tasks.length} active tasks scheduled`);
}

/**
 * Stop all cron jobs.
 */
export function stopScheduler(): void {
  for (const [id, job] of scheduledJobs) {
    job.stop();
    scheduledJobs.delete(id);
  }
  console.log('Scheduler stopped');
}

/**
 * Get the number of currently scheduled jobs (useful for testing).
 */
export function getScheduledJobCount(): number {
  return scheduledJobs.size;
}

/**
 * Compute the next run date for a cron expression.
 * Returns an ISO string or null if invalid.
 */
function getNextCronDate(cronExpression: string): string | null {
  if (!cron.validate(cronExpression)) {
    return null;
  }

  // node-cron doesn't have a built-in "next run" calculator,
  // so we do a simple approximation: parse the cron fields and find the next match.
  // For simplicity, we'll use a brute-force check over the next 48 hours in 1-minute increments.
  const now = new Date();
  const end = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const candidate = new Date(now);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  while (candidate <= end) {
    if (matchesCron(cronExpression, candidate)) {
      return candidate.toISOString().replace('T', ' ').substring(0, 19);
    }
    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  return null;
}

/**
 * Check if a date matches a cron expression.
 * Supports standard 5-field cron: minute hour day-of-month month day-of-week
 */
function matchesCron(expression: string, date: Date): boolean {
  const fields = expression.trim().split(/\s+/);
  if (fields.length < 5) return false;

  const minute = date.getMinutes();
  const hour = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;
  const dayOfWeek = date.getDay(); // 0 = Sunday

  return (
    matchesField(fields[0], minute, 0, 59) &&
    matchesField(fields[1], hour, 0, 23) &&
    matchesField(fields[2], dayOfMonth, 1, 31) &&
    matchesField(fields[3], month, 1, 12) &&
    matchesField(fields[4], dayOfWeek, 0, 7)
  );
}

/**
 * Check if a value matches a single cron field (supports *, numbers, ranges, steps, lists).
 */
function matchesField(field: string, value: number, min: number, max: number): boolean {
  // Handle lists (e.g., "1,3,5")
  const parts = field.split(',');
  return parts.some((part) => matchesSinglePart(part.trim(), value, min, max));
}

function matchesSinglePart(part: string, value: number, min: number, max: number): boolean {
  // Handle step (e.g., "*/5" or "1-10/2")
  const stepParts = part.split('/');
  const step = stepParts.length === 2 ? parseInt(stepParts[1], 10) : 1;
  const rangePart = stepParts[0];

  let rangeMin: number;
  let rangeMax: number;

  if (rangePart === '*') {
    rangeMin = min;
    rangeMax = max;
  } else if (rangePart.includes('-')) {
    const [lo, hi] = rangePart.split('-').map(Number);
    rangeMin = lo;
    rangeMax = hi;
  } else {
    // Single number
    const num = parseInt(rangePart, 10);
    if (step === 1) {
      return value === num;
    }
    rangeMin = num;
    rangeMax = max;
  }

  if (value < rangeMin || value > rangeMax) return false;
  return (value - rangeMin) % step === 0;
}
