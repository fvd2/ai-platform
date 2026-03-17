import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';

// Mock AI service
const mockGenerateResponse = vi.fn();
vi.mock('./ai.service.js', () => ({
  generateResponse: (...args: unknown[]) => mockGenerateResponse(...args),
}));

// Set up in-memory DB before importing the module under test
let db: Database.Database;

vi.mock('../db/index.js', () => ({
  getDb: () => db,
  initDb: () => db,
}));

// Mock global fetch for poll triggers
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  executeTrigger,
  processWebhook,
  evaluateFilter,
  initPollTriggers,
  stopAllPolling,
  getActivePollCount,
  stopPolling,
  restartPolling,
} from './trigger-executor.service.js';

function setupDb(): void {
  db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE triggers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('webhook', 'poll', 'manual')),
      prompt TEXT NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'active',
      run_count INTEGER NOT NULL DEFAULT 0,
      last_fired_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE trigger_runs (
      id TEXT PRIMARY KEY,
      trigger_id TEXT NOT NULL REFERENCES triggers(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'running',
      event_summary TEXT NOT NULL DEFAULT '',
      output TEXT,
      error TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );
  `);
}

describe('TriggerExecutorService', () => {
  beforeEach(() => {
    setupDb();
    mockGenerateResponse.mockClear();
    mockFetch.mockClear();
  });

  afterEach(() => {
    stopAllPolling();
  });

  describe('executeTrigger', () => {
    it('should create a run, call AI, and update records on success', async () => {
      db.prepare(
        `INSERT INTO triggers (id, name, type, prompt, config, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('trigger-1', 'Test Trigger', 'manual', 'Analyze this data', '{}', 'active');

      mockGenerateResponse.mockResolvedValue({
        text: 'Analysis complete.',
        tokenUsage: 100,
      });

      const runId = await executeTrigger('trigger-1', 'Manual fire');

      expect(runId).toBeTruthy();
      expect(mockGenerateResponse).toHaveBeenCalledWith('Analyze this data', undefined);

      const run = db.prepare('SELECT * FROM trigger_runs WHERE id = ?').get(runId) as Record<string, unknown>;
      expect(run['status']).toBe('success');
      expect(run['output']).toBe('Analysis complete.');
      expect(run['event_summary']).toBe('Manual fire');
      expect(run['completed_at']).toBeTruthy();

      const trigger = db.prepare('SELECT * FROM triggers WHERE id = ?').get('trigger-1') as Record<string, unknown>;
      expect(trigger['run_count']).toBe(1);
      expect(trigger['last_fired_at']).toBeTruthy();
    });

    it('should pass context to AI when provided', async () => {
      db.prepare(
        `INSERT INTO triggers (id, name, type, prompt, config, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('trigger-1', 'Test Trigger', 'webhook', 'Process this webhook', '{}', 'active');

      mockGenerateResponse.mockResolvedValue({
        text: 'Processed.',
        tokenUsage: 50,
      });

      await executeTrigger('trigger-1', 'Webhook received', '{"action": "opened"}');

      expect(mockGenerateResponse).toHaveBeenCalledWith(
        'Process this webhook',
        '{"action": "opened"}',
      );
    });

    it('should handle AI errors gracefully', async () => {
      db.prepare(
        `INSERT INTO triggers (id, name, type, prompt, config, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('trigger-1', 'Test Trigger', 'manual', 'Analyze data', '{}', 'active');

      mockGenerateResponse.mockRejectedValue(new Error('AI service unavailable'));

      const runId = await executeTrigger('trigger-1', 'Manual fire');

      const run = db.prepare('SELECT * FROM trigger_runs WHERE id = ?').get(runId) as Record<string, unknown>;
      expect(run['status']).toBe('error');
      expect(run['error']).toBe('AI service unavailable');

      const trigger = db.prepare('SELECT * FROM triggers WHERE id = ?').get('trigger-1') as Record<string, unknown>;
      expect(trigger['run_count']).toBe(1);
    });

    it('should throw if trigger does not exist', async () => {
      await expect(executeTrigger('non-existent', 'test')).rejects.toThrow('Trigger not found');
    });
  });

  describe('processWebhook', () => {
    it('should execute when no filter is configured', async () => {
      db.prepare(
        `INSERT INTO triggers (id, name, type, prompt, config, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('trigger-1', 'Webhook Trigger', 'webhook', 'Process webhook', '{}', 'active');

      mockGenerateResponse.mockResolvedValue({ text: 'Done', tokenUsage: 10 });

      const runId = await processWebhook('trigger-1', { action: 'opened' });
      expect(runId).toBeTruthy();
    });

    it('should execute when filter matches', async () => {
      db.prepare(
        `INSERT INTO triggers (id, name, type, prompt, config, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        'trigger-1',
        'Webhook Trigger',
        'webhook',
        'Process webhook',
        JSON.stringify({ filter: 'action == "opened"' }),
        'active',
      );

      mockGenerateResponse.mockResolvedValue({ text: 'Done', tokenUsage: 10 });

      const runId = await processWebhook('trigger-1', { action: 'opened' });
      expect(runId).toBeTruthy();
    });

    it('should skip execution when filter does not match', async () => {
      db.prepare(
        `INSERT INTO triggers (id, name, type, prompt, config, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        'trigger-1',
        'Webhook Trigger',
        'webhook',
        'Process webhook',
        JSON.stringify({ filter: 'action == "closed"' }),
        'active',
      );

      const runId = await processWebhook('trigger-1', { action: 'opened' });
      expect(runId).toBe('');
      expect(mockGenerateResponse).not.toHaveBeenCalled();
    });

    it('should throw if trigger is not active', async () => {
      db.prepare(
        `INSERT INTO triggers (id, name, type, prompt, config, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('trigger-1', 'Webhook Trigger', 'webhook', 'Process webhook', '{}', 'paused');

      await expect(processWebhook('trigger-1', {})).rejects.toThrow('Trigger is not active');
    });
  });

  describe('evaluateFilter', () => {
    it('should match equality filter', () => {
      expect(evaluateFilter('action == "opened"', { action: 'opened' })).toBe(true);
    });

    it('should reject non-matching equality filter', () => {
      expect(evaluateFilter('action == "closed"', { action: 'opened' })).toBe(false);
    });

    it('should match inequality filter', () => {
      expect(evaluateFilter('action != "closed"', { action: 'opened' })).toBe(true);
    });

    it('should handle nested paths', () => {
      expect(
        evaluateFilter('data.status == "active"', { data: { status: 'active' } }),
      ).toBe(true);
    });

    it('should handle missing paths gracefully', () => {
      expect(evaluateFilter('missing.path == "value"', { other: 'data' })).toBe(false);
    });

    it('should pass through on unparseable filters', () => {
      expect(evaluateFilter('just some text', { action: 'opened' })).toBe(true);
    });

    it('should handle single-quoted values', () => {
      expect(evaluateFilter("action == 'opened'", { action: 'opened' })).toBe(true);
    });
  });

  describe('initPollTriggers', () => {
    it('should start polling for all active poll triggers', () => {
      db.prepare(
        `INSERT INTO triggers (id, name, type, prompt, config, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('poll-1', 'Poll Trigger', 'poll', 'Check status', JSON.stringify({ url: 'https://example.com/api', interval: 60 }), 'active');
      db.prepare(
        `INSERT INTO triggers (id, name, type, prompt, config, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('poll-2', 'Paused Poll', 'poll', 'Check status', JSON.stringify({ url: 'https://example.com/api' }), 'paused');
      db.prepare(
        `INSERT INTO triggers (id, name, type, prompt, config, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('webhook-1', 'Webhook Trigger', 'webhook', 'Process webhook', '{}', 'active');

      initPollTriggers();

      // Only the active poll trigger should be started
      expect(getActivePollCount()).toBe(1);
    });
  });

  describe('stopPolling / restartPolling', () => {
    it('should stop polling for a specific trigger', () => {
      db.prepare(
        `INSERT INTO triggers (id, name, type, prompt, config, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('poll-1', 'Poll Trigger', 'poll', 'Check status', JSON.stringify({ url: 'https://example.com/api' }), 'active');

      initPollTriggers();
      expect(getActivePollCount()).toBe(1);

      stopPolling('poll-1');
      expect(getActivePollCount()).toBe(0);
    });

    it('should restart polling from DB state', () => {
      db.prepare(
        `INSERT INTO triggers (id, name, type, prompt, config, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('poll-1', 'Poll Trigger', 'poll', 'Check status', JSON.stringify({ url: 'https://example.com/api' }), 'active');

      restartPolling('poll-1');
      expect(getActivePollCount()).toBe(1);
    });

    it('should stop polling when trigger is paused', () => {
      db.prepare(
        `INSERT INTO triggers (id, name, type, prompt, config, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('poll-1', 'Poll Trigger', 'poll', 'Check status', JSON.stringify({ url: 'https://example.com/api' }), 'active');

      initPollTriggers();
      expect(getActivePollCount()).toBe(1);

      // Update status to paused
      db.prepare("UPDATE triggers SET status = 'paused' WHERE id = ?").run('poll-1');
      restartPolling('poll-1');
      expect(getActivePollCount()).toBe(0);
    });
  });

  describe('stopAllPolling', () => {
    it('should stop all poll intervals', () => {
      db.prepare(
        `INSERT INTO triggers (id, name, type, prompt, config, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('poll-1', 'Poll 1', 'poll', 'Check 1', JSON.stringify({ url: 'https://example.com/api' }), 'active');
      db.prepare(
        `INSERT INTO triggers (id, name, type, prompt, config, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('poll-2', 'Poll 2', 'poll', 'Check 2', JSON.stringify({ url: 'https://example.com/api2' }), 'active');

      initPollTriggers();
      expect(getActivePollCount()).toBe(2);

      stopAllPolling();
      expect(getActivePollCount()).toBe(0);
    });
  });
});
