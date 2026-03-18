import { describe, it, expect, vi, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

let db: Database.Database;

vi.mock('../db/index.js', () => ({
  getDb: () => db,
  initDb: () => db,
}));

import {
  createTrace,
  getTrace,
  listTraces,
  getUsageStats,
  getCostEstimate,
  getErrorRate,
  getLatencyStats,
  type TraceData,
} from '../services/trace.service.js';

function setupDb(): void {
  db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS traces (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL CHECK (source IN ('chat', 'task', 'trigger')),
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
      status TEXT NOT NULL CHECK (status IN ('success', 'error')) DEFAULT 'success',
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_traces_source ON traces(source, source_id);
    CREATE INDEX IF NOT EXISTS idx_traces_created ON traces(created_at);
  `);
}

const baseTraceData: TraceData = {
  source: 'chat',
  sourceId: 'conv-1',
  model: 'claude-sonnet-4-20250514',
  userInput: 'Hello world',
  assistantOutput: 'Hi there!',
  inputTokens: 10,
  outputTokens: 20,
  totalTokens: 30,
  latencyMs: 500,
  status: 'success',
};

describe('Trace Routes (service layer integration)', () => {
  beforeEach(() => {
    setupDb();
  });

  describe('GET /api/traces', () => {
    it('should list traces with default pagination', () => {
      createTrace(baseTraceData);
      createTrace({ ...baseTraceData, source: 'task', sourceId: 'task-1' });

      const traces = listTraces();
      expect(traces).toHaveLength(2);
    });

    it('should filter traces by source', () => {
      createTrace(baseTraceData);
      createTrace({ ...baseTraceData, source: 'task', sourceId: 'task-1' });
      createTrace({ ...baseTraceData, source: 'trigger', sourceId: 'trig-1' });

      const taskTraces = listTraces({ source: 'task' });
      expect(taskTraces).toHaveLength(1);
      expect(taskTraces[0].source).toBe('task');
    });

    it('should filter by status', () => {
      createTrace(baseTraceData);
      createTrace({ ...baseTraceData, status: 'error', error: 'boom' });

      const errors = listTraces({ status: 'error' });
      expect(errors).toHaveLength(1);
      expect(errors[0].status).toBe('error');
    });

    it('should paginate with limit and offset', () => {
      for (let i = 0; i < 10; i++) {
        createTrace({ ...baseTraceData, userInput: `msg-${i}` });
      }

      const page1 = listTraces({ limit: 3, offset: 0 });
      const page2 = listTraces({ limit: 3, offset: 3 });

      expect(page1).toHaveLength(3);
      expect(page2).toHaveLength(3);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });

  describe('GET /api/traces/:id', () => {
    it('should return a trace with full details', () => {
      const created = createTrace({
        ...baseTraceData,
        systemPrompt: 'You are a helpful assistant.',
      });

      const trace = getTrace(created.id);
      expect(trace).toBeDefined();
      expect(trace!.systemPrompt).toBe('You are a helpful assistant.');
      expect(trace!.userInput).toBe('Hello world');
      expect(trace!.assistantOutput).toBe('Hi there!');
    });

    it('should return undefined for non-existent trace', () => {
      const trace = getTrace('non-existent');
      expect(trace).toBeUndefined();
    });
  });

  describe('GET /api/traces/stats/usage', () => {
    it('should return daily usage buckets', () => {
      createTrace({ ...baseTraceData, inputTokens: 100, outputTokens: 200, totalTokens: 300 });

      const stats = getUsageStats('month');
      expect(stats.length).toBeGreaterThanOrEqual(1);
      expect(stats[0].inputTokens).toBe(100);
      expect(stats[0].outputTokens).toBe(200);
    });
  });

  describe('GET /api/traces/stats/cost', () => {
    it('should compute cost estimates', () => {
      createTrace({
        ...baseTraceData,
        inputTokens: 500_000,
        outputTokens: 100_000,
        totalTokens: 600_000,
      });

      const cost = getCostEstimate('month');
      expect(cost.inputCost).toBeCloseTo(1.5, 2);
      expect(cost.outputCost).toBeCloseTo(1.5, 2);
      expect(cost.totalCost).toBeCloseTo(3.0, 2);
    });
  });

  describe('GET /api/traces/stats/errors', () => {
    it('should return error rate buckets', () => {
      createTrace(baseTraceData);
      createTrace({ ...baseTraceData, status: 'error', error: 'fail' });

      const errors = getErrorRate('month');
      expect(errors).toHaveLength(1);
      expect(errors[0].total).toBe(2);
      expect(errors[0].errors).toBe(1);
      expect(errors[0].errorRate).toBeCloseTo(0.5, 2);
    });
  });

  describe('GET /api/traces/stats/latency', () => {
    it('should return latency statistics', () => {
      createTrace({ ...baseTraceData, latencyMs: 100 });
      createTrace({ ...baseTraceData, latencyMs: 200 });
      createTrace({ ...baseTraceData, latencyMs: 300 });

      const stats = getLatencyStats('month');
      expect(stats.count).toBe(3);
      expect(stats.avg).toBe(200);
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(300);
    });
  });
});
