import { randomUUID } from 'crypto';
import { getDb } from '../db/index.js';

export interface TraceData {
  source: 'chat' | 'task' | 'trigger';
  sourceId: string;
  runId?: string;
  model: string;
  systemPrompt?: string;
  userInput: string;
  assistantOutput?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  status: 'success' | 'error';
  error?: string;
}

export interface TraceRow {
  id: string;
  source: 'chat' | 'task' | 'trigger';
  sourceId: string;
  runId: string | null;
  model: string;
  systemPrompt: string | null;
  userInput: string;
  assistantOutput: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  latencyMs: number | null;
  status: 'success' | 'error';
  error: string | null;
  createdAt: string;
}

export interface TraceFilters {
  source?: 'chat' | 'task' | 'trigger';
  from?: string;
  to?: string;
  status?: 'success' | 'error';
  limit?: number;
  offset?: number;
}

export interface UsageBucket {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  count: number;
}

export interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  period: string;
}

export interface ErrorRateBucket {
  date: string;
  total: number;
  errors: number;
  errorRate: number;
}

export interface LatencyStats {
  avg: number;
  p50: number;
  p95: number;
  min: number;
  max: number;
  count: number;
}

// Cost rates per million tokens (Claude Sonnet)
const INPUT_RATE_PER_MTOK = 3;
const OUTPUT_RATE_PER_MTOK = 15;

export function createTrace(data: TraceData): TraceRow {
  const db = getDb();
  const id = randomUUID();

  db.prepare(
    `INSERT INTO traces (id, source, source_id, run_id, model, system_prompt, user_input,
       assistant_output, input_tokens, output_tokens, total_tokens, latency_ms, status, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    data.source,
    data.sourceId,
    data.runId ?? null,
    data.model,
    data.systemPrompt ?? null,
    data.userInput,
    data.assistantOutput ?? null,
    data.inputTokens ?? null,
    data.outputTokens ?? null,
    data.totalTokens ?? null,
    data.latencyMs ?? null,
    data.status,
    data.error ?? null,
  );

  return getTrace(id)!;
}

export function getTrace(id: string): TraceRow | undefined {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, source, source_id as sourceId, run_id as runId, model,
              system_prompt as systemPrompt, user_input as userInput,
              assistant_output as assistantOutput, input_tokens as inputTokens,
              output_tokens as outputTokens, total_tokens as totalTokens,
              latency_ms as latencyMs, status, error, created_at as createdAt
       FROM traces WHERE id = ?`,
    )
    .get(id) as TraceRow | undefined;
}

export function listTraces(filters: TraceFilters = {}): TraceRow[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.source) {
    conditions.push('source = ?');
    params.push(filters.source);
  }
  if (filters.from) {
    conditions.push('created_at >= ?');
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push('created_at <= ?');
    params.push(filters.to);
  }
  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  return db
    .prepare(
      `SELECT id, source, source_id as sourceId, run_id as runId, model,
              system_prompt as systemPrompt, user_input as userInput,
              assistant_output as assistantOutput, input_tokens as inputTokens,
              output_tokens as outputTokens, total_tokens as totalTokens,
              latency_ms as latencyMs, status, error, created_at as createdAt
       FROM traces ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as TraceRow[];
}

function getPeriodStart(period: 'day' | 'week' | 'month'): string {
  const now = new Date();
  if (period === 'day') {
    now.setDate(now.getDate() - 1);
  } else if (period === 'week') {
    now.setDate(now.getDate() - 7);
  } else {
    now.setMonth(now.getMonth() - 1);
  }
  return now.toISOString().replace('T', ' ').substring(0, 19);
}

export function getUsageStats(period: 'day' | 'week' | 'month' = 'month'): UsageBucket[] {
  const db = getDb();
  const periodStart = getPeriodStart(period);

  return db
    .prepare(
      `SELECT date(created_at) as date,
              COALESCE(SUM(input_tokens), 0) as inputTokens,
              COALESCE(SUM(output_tokens), 0) as outputTokens,
              COALESCE(SUM(total_tokens), 0) as totalTokens,
              COUNT(*) as count
       FROM traces
       WHERE created_at >= ?
       GROUP BY date(created_at)
       ORDER BY date(created_at) ASC`,
    )
    .all(periodStart) as UsageBucket[];
}

export function getCostEstimate(period: 'day' | 'week' | 'month' = 'month'): CostEstimate {
  const db = getDb();
  const periodStart = getPeriodStart(period);

  const row = db
    .prepare(
      `SELECT COALESCE(SUM(input_tokens), 0) as inputTokens,
              COALESCE(SUM(output_tokens), 0) as outputTokens,
              COALESCE(SUM(total_tokens), 0) as totalTokens
       FROM traces
       WHERE created_at >= ?`,
    )
    .get(periodStart) as { inputTokens: number; outputTokens: number; totalTokens: number };

  const inputCost = (row.inputTokens / 1_000_000) * INPUT_RATE_PER_MTOK;
  const outputCost = (row.outputTokens / 1_000_000) * OUTPUT_RATE_PER_MTOK;

  return {
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    totalTokens: row.totalTokens,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    period,
  };
}

export function getErrorRate(period: 'day' | 'week' | 'month' = 'month'): ErrorRateBucket[] {
  const db = getDb();
  const periodStart = getPeriodStart(period);

  return db
    .prepare(
      `SELECT date(created_at) as date,
              COUNT(*) as total,
              SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
              ROUND(CAST(SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS REAL) / COUNT(*), 4) as errorRate
       FROM traces
       WHERE created_at >= ?
       GROUP BY date(created_at)
       ORDER BY date(created_at) ASC`,
    )
    .all(periodStart) as ErrorRateBucket[];
}

export function getLatencyStats(period: 'day' | 'week' | 'month' = 'month'): LatencyStats {
  const db = getDb();
  const periodStart = getPeriodStart(period);

  const rows = db
    .prepare(
      `SELECT latency_ms as latencyMs
       FROM traces
       WHERE created_at >= ? AND latency_ms IS NOT NULL
       ORDER BY latency_ms ASC`,
    )
    .all(periodStart) as { latencyMs: number }[];

  if (rows.length === 0) {
    return { avg: 0, p50: 0, p95: 0, min: 0, max: 0, count: 0 };
  }

  const values = rows.map((r) => r.latencyMs);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = Math.round(sum / values.length);
  const p50 = values[Math.floor(values.length * 0.5)];
  const p95 = values[Math.floor(values.length * 0.95)];

  return {
    avg,
    p50,
    p95,
    min: values[0],
    max: values[values.length - 1],
    count: values.length,
  };
}
