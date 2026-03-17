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

export interface PromptAnalysis {
  analysis: string;
  suggestions: string[];
  revisedPrompt?: string;
}
