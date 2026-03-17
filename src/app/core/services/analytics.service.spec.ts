import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from './analytics.service';
import { ApiService } from './api.service';
import type {
  SourceStats,
  OverviewStats,
  FailurePattern,
  RunTrend,
  PromptAnalysis,
} from '../models/analytics.model';

const mockSourceStats: SourceStats = {
  runCount: 10,
  successCount: 8,
  errorCount: 2,
  successRate: 0.8,
  avgTokens: 150,
  avgLatencyMs: 500,
};

const mockOverview: OverviewStats = {
  totalRuns: 20,
  successRate: 0.9,
  totalTokens: 3000,
  estimatedCost: 0.05,
  period: 'week',
};

const mockFailures: FailurePattern[] = [
  { errorMessage: 'Timeout', count: 3, lastOccurrence: '2026-03-17T00:00:00Z' },
];

const mockTrends: RunTrend[] = [
  { date: '2026-03-17', runCount: 5, successCount: 4, tokenUsage: 500 },
];

const mockAnalysis: PromptAnalysis = {
  analysis: 'The prompt is clear but could be more specific.',
  suggestions: ['Add output format', 'Include examples'],
  revisedPrompt: 'Improved prompt text',
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let apiService: ApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnalyticsService, ApiService],
    });
    service = TestBed.inject(AnalyticsService);
    apiService = TestBed.inject(ApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with null taskStats', () => {
    expect(service.taskStats()).toBeNull();
  });

  it('should start with null triggerStats', () => {
    expect(service.triggerStats()).toBeNull();
  });

  it('should start with null overview', () => {
    expect(service.overview()).toBeNull();
  });

  it('should start with analyzing as false', () => {
    expect(service.analyzing()).toBe(false);
  });

  describe('getTaskStats', () => {
    it('should fetch and set task stats', async () => {
      vi.spyOn(apiService, 'get').mockResolvedValue(mockSourceStats);

      await service.getTaskStats('task-1');

      expect(service.taskStats()).toEqual(mockSourceStats);
      expect(apiService.get).toHaveBeenCalledWith('/analytics/tasks/task-1/stats');
    });

    it('should set error on failure', async () => {
      vi.spyOn(apiService, 'get').mockRejectedValue(new Error('Network error'));

      await service.getTaskStats('task-1');

      expect(service.error()).toBe('Network error');
      expect(service.taskStats()).toBeNull();
    });
  });

  describe('getTriggerStats', () => {
    it('should fetch and set trigger stats', async () => {
      vi.spyOn(apiService, 'get').mockResolvedValue(mockSourceStats);

      await service.getTriggerStats('trig-1');

      expect(service.triggerStats()).toEqual(mockSourceStats);
      expect(apiService.get).toHaveBeenCalledWith('/analytics/triggers/trig-1/stats');
    });

    it('should set error on failure', async () => {
      vi.spyOn(apiService, 'get').mockRejectedValue(new Error('Server error'));

      await service.getTriggerStats('trig-1');

      expect(service.error()).toBe('Server error');
    });
  });

  describe('getOverview', () => {
    it('should fetch overview with default period', async () => {
      vi.spyOn(apiService, 'get').mockResolvedValue(mockOverview);

      await service.getOverview();

      expect(service.overview()).toEqual(mockOverview);
      expect(apiService.get).toHaveBeenCalledWith('/analytics/overview?period=week');
    });

    it('should fetch overview with custom period', async () => {
      vi.spyOn(apiService, 'get').mockResolvedValue({ ...mockOverview, period: 'month' });

      await service.getOverview('month');

      expect(apiService.get).toHaveBeenCalledWith('/analytics/overview?period=month');
    });
  });

  describe('getFailures', () => {
    it('should fetch failure patterns', async () => {
      vi.spyOn(apiService, 'get').mockResolvedValue(mockFailures);

      await service.getFailures('task', 'task-1');

      expect(service.failures()).toEqual(mockFailures);
      expect(apiService.get).toHaveBeenCalledWith(
        '/analytics/failures?source=task&sourceId=task-1',
      );
    });
  });

  describe('getTrends', () => {
    it('should fetch run trends', async () => {
      vi.spyOn(apiService, 'get').mockResolvedValue(mockTrends);

      await service.getTrends('task', 'task-1', 'week');

      expect(service.trends()).toEqual(mockTrends);
      expect(apiService.get).toHaveBeenCalledWith(
        '/analytics/trends?source=task&sourceId=task-1&period=week',
      );
    });
  });

  describe('analyzePrompt', () => {
    it('should call API and set analysis result', async () => {
      vi.spyOn(apiService, 'post').mockResolvedValue(mockAnalysis);

      const result = await service.analyzePrompt('Summarize news', 'task', 'task-1');

      expect(result).toEqual(mockAnalysis);
      expect(service.promptAnalysis()).toEqual(mockAnalysis);
      expect(service.analyzing()).toBe(false);
      expect(apiService.post).toHaveBeenCalledWith('/analytics/analyze-prompt', {
        prompt: 'Summarize news',
        sourceType: 'task',
        sourceId: 'task-1',
      });
    });

    it('should set error and return null on failure', async () => {
      vi.spyOn(apiService, 'post').mockRejectedValue(new Error('AI unavailable'));

      const result = await service.analyzePrompt('prompt', 'task', 'task-1');

      expect(result).toBeNull();
      expect(service.error()).toBe('AI unavailable');
      expect(service.analyzing()).toBe(false);
    });

    it('should set analyzing to true during analysis', async () => {
      let resolvePromise: (value: PromptAnalysis) => void;
      const pendingPromise = new Promise<PromptAnalysis>((resolve) => {
        resolvePromise = resolve;
      });
      vi.spyOn(apiService, 'post').mockReturnValue(pendingPromise as Promise<never>);

      const analyzePromise = service.analyzePrompt('prompt', 'task', 'task-1');
      expect(service.analyzing()).toBe(true);

      resolvePromise!(mockAnalysis);
      await analyzePromise;

      expect(service.analyzing()).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear the error signal', async () => {
      vi.spyOn(apiService, 'get').mockRejectedValue(new Error('test'));
      await service.getTaskStats('1');
      expect(service.error()).toBe('test');

      service.clearError();
      expect(service.error()).toBeNull();
    });
  });

  describe('clearAnalysis', () => {
    it('should clear the analysis signal', async () => {
      vi.spyOn(apiService, 'post').mockResolvedValue(mockAnalysis);
      await service.analyzePrompt('prompt', 'task', 'task-1');
      expect(service.promptAnalysis()).toEqual(mockAnalysis);

      service.clearAnalysis();
      expect(service.promptAnalysis()).toBeNull();
    });
  });
});
