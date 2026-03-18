export type TraceSource = 'chat' | 'task' | 'trigger';
export type TraceStatus = 'success' | 'error';

export interface Trace {
  id: string;
  source: TraceSource;
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
  status: TraceStatus;
  error: string | null;
  createdAt: string;
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
