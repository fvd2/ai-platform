import { getDb } from '../db/index.js';
import { generateResponse } from './ai.service.js';

export interface SourceStats {
  runCount: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  avgTokens: number;
  avgLatencyMs: number;
}

export interface OverviewStats {
  totalRuns: number;
  successRate: number;
  totalTokens: number;
  estimatedCost: number;
  period: 'day' | 'week' | 'month';
}

export interface FailurePattern {
  errorMessage: string;
  count: number;
  lastOccurrence: string;
}

export interface RunTrend {
  date: string;
  runCount: number;
  successCount: number;
  tokenUsage: number;
}

export interface PromptAnalysisResult {
  analysis: string;
  suggestions: string[];
  revisedPrompt?: string;
}

// Cost rates per million tokens (Claude Sonnet)
const INPUT_RATE_PER_MTOK = 3;
const OUTPUT_RATE_PER_MTOK = 15;

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

export function getTaskStats(taskId?: string): SourceStats {
  const db = getDb();

  if (taskId) {
    const row = db
      .prepare(
        `SELECT
          COUNT(*) as runCount,
          SUM(CASE WHEN tr.status = 'success' THEN 1 ELSE 0 END) as successCount,
          SUM(CASE WHEN tr.status = 'error' THEN 1 ELSE 0 END) as errorCount,
          COALESCE(AVG(t.total_tokens), 0) as avgTokens,
          COALESCE(AVG(t.latency_ms), 0) as avgLatencyMs
        FROM task_runs tr
        LEFT JOIN traces t ON t.run_id = tr.id AND t.source = 'task'
        WHERE tr.task_id = ? AND tr.status != 'running'`,
      )
      .get(taskId) as {
      runCount: number;
      successCount: number;
      errorCount: number;
      avgTokens: number;
      avgLatencyMs: number;
    };

    return {
      runCount: row.runCount,
      successCount: row.successCount,
      errorCount: row.errorCount,
      successRate: row.runCount > 0 ? row.successCount / row.runCount : 0,
      avgTokens: Math.round(row.avgTokens),
      avgLatencyMs: Math.round(row.avgLatencyMs),
    };
  }

  const row = db
    .prepare(
      `SELECT
        COUNT(*) as runCount,
        SUM(CASE WHEN tr.status = 'success' THEN 1 ELSE 0 END) as successCount,
        SUM(CASE WHEN tr.status = 'error' THEN 1 ELSE 0 END) as errorCount,
        COALESCE(AVG(t.total_tokens), 0) as avgTokens,
        COALESCE(AVG(t.latency_ms), 0) as avgLatencyMs
      FROM task_runs tr
      LEFT JOIN traces t ON t.run_id = tr.id AND t.source = 'task'
      WHERE tr.status != 'running'`,
    )
    .get() as {
    runCount: number;
    successCount: number;
    errorCount: number;
    avgTokens: number;
    avgLatencyMs: number;
  };

  return {
    runCount: row.runCount,
    successCount: row.successCount,
    errorCount: row.errorCount,
    successRate: row.runCount > 0 ? row.successCount / row.runCount : 0,
    avgTokens: Math.round(row.avgTokens),
    avgLatencyMs: Math.round(row.avgLatencyMs),
  };
}

export function getTriggerStats(triggerId?: string): SourceStats {
  const db = getDb();

  if (triggerId) {
    const row = db
      .prepare(
        `SELECT
          COUNT(*) as runCount,
          SUM(CASE WHEN tr.status = 'success' THEN 1 ELSE 0 END) as successCount,
          SUM(CASE WHEN tr.status = 'error' THEN 1 ELSE 0 END) as errorCount,
          COALESCE(AVG(t.total_tokens), 0) as avgTokens,
          COALESCE(AVG(t.latency_ms), 0) as avgLatencyMs
        FROM trigger_runs tr
        LEFT JOIN traces t ON t.run_id = tr.id AND t.source = 'trigger'
        WHERE tr.trigger_id = ? AND tr.status != 'running'`,
      )
      .get(triggerId) as {
      runCount: number;
      successCount: number;
      errorCount: number;
      avgTokens: number;
      avgLatencyMs: number;
    };

    return {
      runCount: row.runCount,
      successCount: row.successCount,
      errorCount: row.errorCount,
      successRate: row.runCount > 0 ? row.successCount / row.runCount : 0,
      avgTokens: Math.round(row.avgTokens),
      avgLatencyMs: Math.round(row.avgLatencyMs),
    };
  }

  const row = db
    .prepare(
      `SELECT
        COUNT(*) as runCount,
        SUM(CASE WHEN tr.status = 'success' THEN 1 ELSE 0 END) as successCount,
        SUM(CASE WHEN tr.status = 'error' THEN 1 ELSE 0 END) as errorCount,
        COALESCE(AVG(t.total_tokens), 0) as avgTokens,
        COALESCE(AVG(t.latency_ms), 0) as avgLatencyMs
      FROM trigger_runs tr
      LEFT JOIN traces t ON t.run_id = tr.id AND t.source = 'trigger'
      WHERE tr.status != 'running'`,
    )
    .get() as {
    runCount: number;
    successCount: number;
    errorCount: number;
    avgTokens: number;
    avgLatencyMs: number;
  };

  return {
    runCount: row.runCount,
    successCount: row.successCount,
    errorCount: row.errorCount,
    successRate: row.runCount > 0 ? row.successCount / row.runCount : 0,
    avgTokens: Math.round(row.avgTokens),
    avgLatencyMs: Math.round(row.avgLatencyMs),
  };
}

export function getOverallStats(period: 'day' | 'week' | 'month'): OverviewStats {
  const db = getDb();
  const periodStart = getPeriodStart(period);

  const taskRow = db
    .prepare(
      `SELECT
        COUNT(*) as runCount,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successCount
      FROM task_runs
      WHERE started_at >= ? AND status != 'running'`,
    )
    .get(periodStart) as { runCount: number; successCount: number };

  const triggerRow = db
    .prepare(
      `SELECT
        COUNT(*) as runCount,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successCount
      FROM trigger_runs
      WHERE started_at >= ? AND status != 'running'`,
    )
    .get(periodStart) as { runCount: number; successCount: number };

  const tokenRow = db
    .prepare(
      `SELECT
        COALESCE(SUM(input_tokens), 0) as inputTokens,
        COALESCE(SUM(output_tokens), 0) as outputTokens,
        COALESCE(SUM(total_tokens), 0) as totalTokens
      FROM traces
      WHERE created_at >= ? AND source IN ('task', 'trigger')`,
    )
    .get(periodStart) as { inputTokens: number; outputTokens: number; totalTokens: number };

  const totalRuns = taskRow.runCount + triggerRow.runCount;
  const totalSuccess = taskRow.successCount + triggerRow.successCount;
  const estimatedCost =
    (tokenRow.inputTokens / 1_000_000) * INPUT_RATE_PER_MTOK +
    (tokenRow.outputTokens / 1_000_000) * OUTPUT_RATE_PER_MTOK;

  return {
    totalRuns,
    successRate: totalRuns > 0 ? totalSuccess / totalRuns : 0,
    totalTokens: tokenRow.totalTokens,
    estimatedCost,
    period,
  };
}

export function getFailurePatterns(
  sourceType: 'task' | 'trigger',
  sourceId: string,
): FailurePattern[] {
  const db = getDb();
  const table = sourceType === 'task' ? 'task_runs' : 'trigger_runs';
  const idColumn = sourceType === 'task' ? 'task_id' : 'trigger_id';

  return db
    .prepare(
      `SELECT
        error as errorMessage,
        COUNT(*) as count,
        MAX(started_at) as lastOccurrence
      FROM ${table}
      WHERE ${idColumn} = ? AND status = 'error' AND error IS NOT NULL
      GROUP BY error
      ORDER BY count DESC`,
    )
    .all(sourceId) as FailurePattern[];
}

export function getRunTrends(
  sourceType: 'task' | 'trigger',
  sourceId: string,
  period: 'day' | 'week' | 'month',
): RunTrend[] {
  const db = getDb();
  const periodStart = getPeriodStart(period);
  const table = sourceType === 'task' ? 'task_runs' : 'trigger_runs';
  const idColumn = sourceType === 'task' ? 'task_id' : 'trigger_id';

  return db
    .prepare(
      `SELECT
        date(r.started_at) as date,
        COUNT(*) as runCount,
        SUM(CASE WHEN r.status = 'success' THEN 1 ELSE 0 END) as successCount,
        COALESCE(SUM(t.total_tokens), 0) as tokenUsage
      FROM ${table} r
      LEFT JOIN traces t ON t.run_id = r.id AND t.source = ?
      WHERE r.${idColumn} = ? AND r.started_at >= ? AND r.status != 'running'
      GROUP BY date(r.started_at)
      ORDER BY date(r.started_at) ASC`,
    )
    .all(sourceType, sourceId, periodStart) as RunTrend[];
}

interface RecentRun {
  status: string;
  output: string | null;
  error: string | null;
  started_at: string;
}

export async function analyzePrompt(
  prompt: string,
  sourceType: 'task' | 'trigger',
  sourceId: string,
): Promise<PromptAnalysisResult> {
  const db = getDb();
  const table = sourceType === 'task' ? 'task_runs' : 'trigger_runs';
  const idColumn = sourceType === 'task' ? 'task_id' : 'trigger_id';

  const recentRuns = db
    .prepare(
      `SELECT status, output, error, started_at
       FROM ${table}
       WHERE ${idColumn} = ?
       ORDER BY started_at DESC
       LIMIT 10`,
    )
    .all(sourceId) as RecentRun[];

  const runsContext = recentRuns
    .map((run, i) => {
      const parts = [`Run ${i + 1} (${run.status}, ${run.started_at}):`];
      if (run.output) parts.push(`Output: ${run.output.substring(0, 500)}`);
      if (run.error) parts.push(`Error: ${run.error}`);
      return parts.join('\n');
    })
    .join('\n\n');

  const metaPrompt = `You are an AI prompt engineer. Analyze the following prompt and its recent execution results. Identify issues and suggest improvements.

## Current Prompt
${prompt}

## Recent Runs (${recentRuns.length} most recent)
${runsContext || 'No runs available yet.'}

## Instructions
1. Analyze the prompt for clarity, specificity, and effectiveness
2. Review the run outputs for quality and consistency issues
3. Identify any error patterns
4. Suggest specific improvements

Respond in this exact JSON format:
{
  "analysis": "Brief analysis of the prompt's strengths and weaknesses",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "revisedPrompt": "An improved version of the prompt incorporating the suggestions"
}

Return ONLY valid JSON, no markdown fences or additional text.`;

  const result = await generateResponse(metaPrompt, undefined, {
    source: sourceType,
    sourceId,
  });

  try {
    const parsed = JSON.parse(result.text) as {
      analysis: string;
      suggestions: string[];
      revisedPrompt?: string;
    };
    return {
      analysis: parsed.analysis,
      suggestions: parsed.suggestions,
      revisedPrompt: parsed.revisedPrompt,
    };
  } catch {
    return {
      analysis: result.text,
      suggestions: [],
      revisedPrompt: undefined,
    };
  }
}
