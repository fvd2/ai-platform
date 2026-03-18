import { describe, it, expect, vi, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

let db: Database.Database;

vi.mock('../db/index.js', () => ({
  getDb: () => db,
  initDb: () => db,
}));

vi.mock('./ai.service.js', () => ({
  generateResponse: vi.fn().mockResolvedValue({
    text: JSON.stringify({
      analysis: 'The prompt is clear but could be more specific.',
      suggestions: ['Add output format', 'Include examples'],
      revisedPrompt: 'Improved prompt text',
    }),
    tokenUsage: 100,
  }),
}));

import {
  getTaskStats,
  getTriggerStats,
  getOverallStats,
  getFailurePatterns,
  getRunTrends,
  analyzePrompt,
} from './analytics.service.js';

function setupDb(): void {
  db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      prompt TEXT NOT NULL,
      schedule TEXT NOT NULL,
      schedule_description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      last_run_at TEXT,
      next_run_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_runs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      output TEXT,
      error TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      token_usage INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_task_runs_task ON task_runs(task_id, started_at);

    CREATE TABLE IF NOT EXISTS triggers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'active',
      run_count INTEGER NOT NULL DEFAULT 0,
      last_fired_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trigger_runs (
      id TEXT PRIMARY KEY,
      trigger_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      event_summary TEXT NOT NULL DEFAULT '',
      output TEXT,
      error TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_trigger_runs_trigger ON trigger_runs(trigger_id, started_at);

    CREATE TABLE IF NOT EXISTS traces (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      run_id TEXT,
      model TEXT NOT NULL,
      system_prompt TEXT,
      user_input TEXT NOT NULL,
      assistant_output TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      total_tokens INTEGER,
      latency_ms INTEGER,
      status TEXT NOT NULL DEFAULT 'success',
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_traces_source ON traces(source, source_id);
    CREATE INDEX IF NOT EXISTS idx_traces_created ON traces(created_at);
  `);
}

function insertTaskRun(
  id: string,
  taskId: string,
  status: string,
  output?: string,
  error?: string,
): void {
  db.prepare(
    `INSERT INTO task_runs (id, task_id, status, output, error, started_at, completed_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
  ).run(id, taskId, status, output ?? null, error ?? null);
}

function insertTriggerRun(
  id: string,
  triggerId: string,
  status: string,
  output?: string,
  error?: string,
): void {
  db.prepare(
    `INSERT INTO trigger_runs (id, trigger_id, status, output, error, started_at, completed_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
  ).run(id, triggerId, status, output ?? null, error ?? null);
}

function insertTrace(
  id: string,
  source: string,
  sourceId: string,
  runId: string,
  totalTokens: number,
  latencyMs: number,
  inputTokens?: number,
  outputTokens?: number,
): void {
  db.prepare(
    `INSERT INTO traces (id, source, source_id, run_id, model, user_input, total_tokens, latency_ms, input_tokens, output_tokens, status)
     VALUES (?, ?, ?, ?, 'claude-sonnet-4-20250514', 'test', ?, ?, ?, ?, 'success')`,
  ).run(id, source, sourceId, runId, totalTokens, latencyMs, inputTokens ?? 0, outputTokens ?? 0);
}

describe('Analytics Service', () => {
  beforeEach(() => {
    setupDb();
  });

  describe('getTaskStats', () => {
    it('should return empty stats when no runs exist', () => {
      const stats = getTaskStats('task-1');
      expect(stats.runCount).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.avgTokens).toBe(0);
      expect(stats.avgLatencyMs).toBe(0);
    });

    it('should return correct stats for a specific task', () => {
      insertTaskRun('r1', 'task-1', 'success', 'output 1');
      insertTaskRun('r2', 'task-1', 'success', 'output 2');
      insertTaskRun('r3', 'task-1', 'error', undefined, 'failed');
      insertTrace('t1', 'task', 'task-1', 'r1', 100, 500);
      insertTrace('t2', 'task', 'task-1', 'r2', 200, 600);

      const stats = getTaskStats('task-1');
      expect(stats.runCount).toBe(3);
      expect(stats.successCount).toBe(2);
      expect(stats.errorCount).toBe(1);
      expect(stats.successRate).toBeCloseTo(2 / 3, 2);
    });

    it('should return aggregate stats when no taskId is provided', () => {
      insertTaskRun('r1', 'task-1', 'success');
      insertTaskRun('r2', 'task-2', 'error', undefined, 'fail');

      const stats = getTaskStats();
      expect(stats.runCount).toBe(2);
      expect(stats.successCount).toBe(1);
      expect(stats.errorCount).toBe(1);
    });

    it('should ignore running tasks', () => {
      insertTaskRun('r1', 'task-1', 'running');
      insertTaskRun('r2', 'task-1', 'success');

      const stats = getTaskStats('task-1');
      expect(stats.runCount).toBe(1);
    });
  });

  describe('getTriggerStats', () => {
    it('should return empty stats when no runs exist', () => {
      const stats = getTriggerStats('trig-1');
      expect(stats.runCount).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('should return correct stats for a specific trigger', () => {
      insertTriggerRun('r1', 'trig-1', 'success', 'output');
      insertTriggerRun('r2', 'trig-1', 'error', undefined, 'failed');
      insertTrace('t1', 'trigger', 'trig-1', 'r1', 150, 400);

      const stats = getTriggerStats('trig-1');
      expect(stats.runCount).toBe(2);
      expect(stats.successCount).toBe(1);
      expect(stats.errorCount).toBe(1);
      expect(stats.successRate).toBeCloseTo(0.5, 2);
    });

    it('should return aggregate stats when no triggerId is provided', () => {
      insertTriggerRun('r1', 'trig-1', 'success');
      insertTriggerRun('r2', 'trig-2', 'success');

      const stats = getTriggerStats();
      expect(stats.runCount).toBe(2);
      expect(stats.successCount).toBe(2);
    });
  });

  describe('getOverallStats', () => {
    it('should return combined stats from tasks and triggers', () => {
      insertTaskRun('r1', 'task-1', 'success');
      insertTriggerRun('r2', 'trig-1', 'success');
      insertTrace('t1', 'task', 'task-1', 'r1', 100, 500, 40, 60);
      insertTrace('t2', 'trigger', 'trig-1', 'r2', 200, 300, 80, 120);

      const stats = getOverallStats('month');
      expect(stats.totalRuns).toBe(2);
      expect(stats.successRate).toBe(1);
      expect(stats.totalTokens).toBe(300);
      expect(stats.period).toBe('month');
    });

    it('should return zeros when no runs exist', () => {
      const stats = getOverallStats('week');
      expect(stats.totalRuns).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.estimatedCost).toBe(0);
    });
  });

  describe('getFailurePatterns', () => {
    it('should group errors by message for tasks', () => {
      insertTaskRun('r1', 'task-1', 'error', undefined, 'Timeout error');
      insertTaskRun('r2', 'task-1', 'error', undefined, 'Timeout error');
      insertTaskRun('r3', 'task-1', 'error', undefined, 'Rate limit');

      const patterns = getFailurePatterns('task', 'task-1');
      expect(patterns).toHaveLength(2);
      expect(patterns[0].errorMessage).toBe('Timeout error');
      expect(patterns[0].count).toBe(2);
      expect(patterns[1].errorMessage).toBe('Rate limit');
      expect(patterns[1].count).toBe(1);
    });

    it('should group errors by message for triggers', () => {
      insertTriggerRun('r1', 'trig-1', 'error', undefined, 'Connection refused');
      insertTriggerRun('r2', 'trig-1', 'error', undefined, 'Connection refused');

      const patterns = getFailurePatterns('trigger', 'trig-1');
      expect(patterns).toHaveLength(1);
      expect(patterns[0].errorMessage).toBe('Connection refused');
      expect(patterns[0].count).toBe(2);
    });

    it('should return empty array when no failures exist', () => {
      insertTaskRun('r1', 'task-1', 'success', 'ok');
      const patterns = getFailurePatterns('task', 'task-1');
      expect(patterns).toHaveLength(0);
    });
  });

  describe('getRunTrends', () => {
    it('should return daily buckets for task runs', () => {
      insertTaskRun('r1', 'task-1', 'success', 'output');
      insertTaskRun('r2', 'task-1', 'error', undefined, 'fail');
      insertTrace('t1', 'task', 'task-1', 'r1', 100, 500);

      const trends = getRunTrends('task', 'task-1', 'month');
      expect(trends.length).toBeGreaterThanOrEqual(1);
      expect(trends[0].runCount).toBe(2);
      expect(trends[0].successCount).toBe(1);
    });

    it('should return daily buckets for trigger runs', () => {
      insertTriggerRun('r1', 'trig-1', 'success', 'output');
      insertTrace('t1', 'trigger', 'trig-1', 'r1', 200, 300);

      const trends = getRunTrends('trigger', 'trig-1', 'month');
      expect(trends.length).toBeGreaterThanOrEqual(1);
      expect(trends[0].runCount).toBe(1);
      expect(trends[0].successCount).toBe(1);
    });

    it('should return empty array when no runs exist', () => {
      const trends = getRunTrends('task', 'task-nonexistent', 'week');
      expect(trends).toHaveLength(0);
    });
  });

  describe('analyzePrompt', () => {
    it('should return analysis result from AI', async () => {
      insertTaskRun('r1', 'task-1', 'success', 'some output');
      insertTaskRun('r2', 'task-1', 'error', undefined, 'some error');

      const result = await analyzePrompt('Summarize the news', 'task', 'task-1');
      expect(result.analysis).toBe('The prompt is clear but could be more specific.');
      expect(result.suggestions).toEqual(['Add output format', 'Include examples']);
      expect(result.revisedPrompt).toBe('Improved prompt text');
    });

    it('should work even with no recent runs', async () => {
      const result = await analyzePrompt('Summarize the news', 'task', 'task-empty');
      expect(result.analysis).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });
  });
});
