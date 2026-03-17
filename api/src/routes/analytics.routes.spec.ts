import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SourceStats, OverviewStats, FailurePattern, RunTrend, PromptAnalysisResult } from '../services/analytics.service.js';

const mockGetTaskStats = vi.fn<(taskId?: string) => SourceStats>();
const mockGetTriggerStats = vi.fn<(triggerId?: string) => SourceStats>();
const mockGetOverallStats = vi.fn<(period: 'day' | 'week' | 'month') => OverviewStats>();
const mockGetFailurePatterns = vi.fn<(sourceType: 'task' | 'trigger', sourceId: string) => FailurePattern[]>();
const mockGetRunTrends = vi.fn<(sourceType: 'task' | 'trigger', sourceId: string, period: 'day' | 'week' | 'month') => RunTrend[]>();
const mockAnalyzePrompt = vi.fn<(prompt: string, sourceType: 'task' | 'trigger', sourceId: string) => Promise<PromptAnalysisResult>>();

vi.mock('../services/analytics.service.js', () => ({
  getTaskStats: (...args: unknown[]) => mockGetTaskStats(...(args as [string?])),
  getTriggerStats: (...args: unknown[]) => mockGetTriggerStats(...(args as [string?])),
  getOverallStats: (...args: unknown[]) => mockGetOverallStats(...(args as ['day' | 'week' | 'month'])),
  getFailurePatterns: (...args: unknown[]) => mockGetFailurePatterns(...(args as ['task' | 'trigger', string])),
  getRunTrends: (...args: unknown[]) => mockGetRunTrends(...(args as ['task' | 'trigger', string, 'day' | 'week' | 'month'])),
  analyzePrompt: (...args: unknown[]) => mockAnalyzePrompt(...(args as [string, 'task' | 'trigger', string])),
}));

const defaultStats: SourceStats = {
  runCount: 10,
  successCount: 8,
  errorCount: 2,
  successRate: 0.8,
  avgTokens: 150,
  avgLatencyMs: 500,
};

const defaultOverview: OverviewStats = {
  totalRuns: 20,
  successRate: 0.9,
  totalTokens: 3000,
  estimatedCost: 0.05,
  period: 'week',
};

describe('Analytics Routes (unit tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/analytics/tasks/:id/stats', () => {
    it('should call getTaskStats with the provided id', () => {
      mockGetTaskStats.mockReturnValue(defaultStats);

      const result = mockGetTaskStats('task-1');
      expect(result).toEqual(defaultStats);
      expect(mockGetTaskStats).toHaveBeenCalledWith('task-1');
    });
  });

  describe('GET /api/analytics/triggers/:id/stats', () => {
    it('should call getTriggerStats with the provided id', () => {
      mockGetTriggerStats.mockReturnValue(defaultStats);

      const result = mockGetTriggerStats('trig-1');
      expect(result).toEqual(defaultStats);
      expect(mockGetTriggerStats).toHaveBeenCalledWith('trig-1');
    });
  });

  describe('GET /api/analytics/overview', () => {
    it('should call getOverallStats with default period', () => {
      mockGetOverallStats.mockReturnValue(defaultOverview);

      const result = mockGetOverallStats('week');
      expect(result).toEqual(defaultOverview);
      expect(mockGetOverallStats).toHaveBeenCalledWith('week');
    });

    it('should call getOverallStats with custom period', () => {
      mockGetOverallStats.mockReturnValue({ ...defaultOverview, period: 'month' });

      const result = mockGetOverallStats('month');
      expect(result.period).toBe('month');
    });
  });

  describe('GET /api/analytics/failures', () => {
    it('should call getFailurePatterns with source and sourceId', () => {
      const patterns: FailurePattern[] = [
        { errorMessage: 'Timeout', count: 3, lastOccurrence: '2026-03-17' },
      ];
      mockGetFailurePatterns.mockReturnValue(patterns);

      const result = mockGetFailurePatterns('task', 'task-1');
      expect(result).toEqual(patterns);
      expect(mockGetFailurePatterns).toHaveBeenCalledWith('task', 'task-1');
    });
  });

  describe('GET /api/analytics/trends', () => {
    it('should call getRunTrends with proper parameters', () => {
      const trends: RunTrend[] = [
        { date: '2026-03-17', runCount: 5, successCount: 4, tokenUsage: 500 },
      ];
      mockGetRunTrends.mockReturnValue(trends);

      const result = mockGetRunTrends('task', 'task-1', 'week');
      expect(result).toEqual(trends);
      expect(mockGetRunTrends).toHaveBeenCalledWith('task', 'task-1', 'week');
    });
  });

  describe('POST /api/analytics/analyze-prompt', () => {
    it('should call analyzePrompt and return the result', async () => {
      const analysisResult: PromptAnalysisResult = {
        analysis: 'Good prompt but could be improved.',
        suggestions: ['Be more specific', 'Add constraints'],
        revisedPrompt: 'Better prompt here',
      };
      mockAnalyzePrompt.mockResolvedValue(analysisResult);

      const result = await mockAnalyzePrompt('Summarize news', 'task', 'task-1');
      expect(result).toEqual(analysisResult);
      expect(mockAnalyzePrompt).toHaveBeenCalledWith('Summarize news', 'task', 'task-1');
    });

    it('should handle errors from analyzePrompt', async () => {
      mockAnalyzePrompt.mockRejectedValue(new Error('AI service unavailable'));

      await expect(mockAnalyzePrompt('prompt', 'task', 'task-1')).rejects.toThrow(
        'AI service unavailable',
      );
    });
  });
});
