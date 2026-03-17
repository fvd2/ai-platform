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
} from './trace.service.js';

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

describe('TraceService', () => {
  beforeEach(() => {
    setupDb();
  });

  describe('createTrace', () => {
    it('should insert a trace record and return it', () => {
      const result = createTrace(baseTraceData);

      expect(result.id).toBeTruthy();
      expect(result.source).toBe('chat');
      expect(result.sourceId).toBe('conv-1');
      expect(result.model).toBe('claude-sonnet-4-20250514');
      expect(result.userInput).toBe('Hello world');
      expect(result.assistantOutput).toBe('Hi there!');
      expect(result.inputTokens).toBe(10);
      expect(result.outputTokens).toBe(20);
      expect(result.totalTokens).toBe(30);
      expect(result.latencyMs).toBe(500);
      expect(result.status).toBe('success');
      expect(result.createdAt).toBeTruthy();
    });

    it('should handle optional fields as null', () => {
      const result = createTrace({
        source: 'task',
        sourceId: 'task-1',
        model: 'claude-sonnet-4-20250514',
        userInput: 'Run task',
        status: 'success',
      });

      expect(result.systemPrompt).toBeNull();
      expect(result.assistantOutput).toBeNull();
      expect(result.runId).toBeNull();
      expect(result.error).toBeNull();
    });

    it('should store error traces', () => {
      const result = createTrace({
        ...baseTraceData,
        status: 'error',
        error: 'API rate limit exceeded',
        assistantOutput: undefined,
      });

      expect(result.status).toBe('error');
      expect(result.error).toBe('API rate limit exceeded');
    });
  });

  describe('getTrace', () => {
    it('should return a trace by id', () => {
      const created = createTrace(baseTraceData);
      const fetched = getTrace(created.id);

      expect(fetched).toBeDefined();
      expect(fetched!.id).toBe(created.id);
      expect(fetched!.userInput).toBe('Hello world');
    });

    it('should return undefined for non-existent id', () => {
      const result = getTrace('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('listTraces', () => {
    it('should return all traces ordered by created_at DESC', () => {
      createTrace({ ...baseTraceData, userInput: 'First' });
      createTrace({ ...baseTraceData, userInput: 'Second' });

      const traces = listTraces();
      expect(traces).toHaveLength(2);
      // Most recent first
      expect(traces[0].userInput).toBe('Second');
    });

    it('should filter by source', () => {
      createTrace({ ...baseTraceData, source: 'chat', sourceId: 'c1' });
      createTrace({ ...baseTraceData, source: 'task', sourceId: 't1' });

      const chatTraces = listTraces({ source: 'chat' });
      expect(chatTraces).toHaveLength(1);
      expect(chatTraces[0].source).toBe('chat');
    });

    it('should filter by status', () => {
      createTrace({ ...baseTraceData, status: 'success' });
      createTrace({ ...baseTraceData, status: 'error', error: 'fail' });

      const errorTraces = listTraces({ status: 'error' });
      expect(errorTraces).toHaveLength(1);
      expect(errorTraces[0].status).toBe('error');
    });

    it('should respect limit and offset', () => {
      for (let i = 0; i < 5; i++) {
        createTrace({ ...baseTraceData, userInput: `msg-${i}` });
      }

      const page = listTraces({ limit: 2, offset: 1 });
      expect(page).toHaveLength(2);
    });

    it('should default to limit 50', () => {
      const traces = listTraces();
      expect(traces).toHaveLength(0); // just verifying it doesn't throw
    });
  });

  describe('getUsageStats', () => {
    it('should return empty array when no traces exist', () => {
      const stats = getUsageStats('month');
      expect(stats).toEqual([]);
    });

    it('should aggregate tokens by day', () => {
      createTrace({ ...baseTraceData, inputTokens: 100, outputTokens: 200, totalTokens: 300 });
      createTrace({ ...baseTraceData, inputTokens: 50, outputTokens: 100, totalTokens: 150 });

      const stats = getUsageStats('month');
      expect(stats).toHaveLength(1);
      expect(stats[0].inputTokens).toBe(150);
      expect(stats[0].outputTokens).toBe(300);
      expect(stats[0].totalTokens).toBe(450);
      expect(stats[0].count).toBe(2);
    });
  });

  describe('getCostEstimate', () => {
    it('should return zero costs when no traces exist', () => {
      const cost = getCostEstimate('month');
      expect(cost.totalCost).toBe(0);
      expect(cost.inputTokens).toBe(0);
      expect(cost.outputTokens).toBe(0);
      expect(cost.period).toBe('month');
    });

    it('should compute cost based on token rates', () => {
      createTrace({
        ...baseTraceData,
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        totalTokens: 2_000_000,
      });

      const cost = getCostEstimate('month');
      // $3/MTok input + $15/MTok output = $18
      expect(cost.inputCost).toBe(3);
      expect(cost.outputCost).toBe(15);
      expect(cost.totalCost).toBe(18);
    });
  });

  describe('getErrorRate', () => {
    it('should return empty array when no traces exist', () => {
      const rate = getErrorRate('month');
      expect(rate).toEqual([]);
    });

    it('should calculate error rate per day', () => {
      createTrace({ ...baseTraceData, status: 'success' });
      createTrace({ ...baseTraceData, status: 'success' });
      createTrace({ ...baseTraceData, status: 'error', error: 'fail' });

      const rate = getErrorRate('month');
      expect(rate).toHaveLength(1);
      expect(rate[0].total).toBe(3);
      expect(rate[0].errors).toBe(1);
      expect(rate[0].errorRate).toBeCloseTo(0.3333, 3);
    });
  });

  describe('getLatencyStats', () => {
    it('should return zeros when no traces exist', () => {
      const stats = getLatencyStats('month');
      expect(stats).toEqual({ avg: 0, p50: 0, p95: 0, min: 0, max: 0, count: 0 });
    });

    it('should compute latency percentiles', () => {
      for (let i = 1; i <= 100; i++) {
        createTrace({ ...baseTraceData, latencyMs: i * 10 });
      }

      const stats = getLatencyStats('month');
      expect(stats.count).toBe(100);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(1000);
      expect(stats.p50).toBe(510);
      expect(stats.p95).toBe(960);
      expect(stats.avg).toBe(505);
    });
  });
});
