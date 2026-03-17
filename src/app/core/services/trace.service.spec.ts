import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TraceService } from './trace.service';
import { ApiService } from './api.service';
import type {
  Trace,
  UsageBucket,
  CostEstimate,
  ErrorRateBucket,
  LatencyStats,
} from '../models/trace.model';

const mockTrace: Trace = {
  id: 'trace-1',
  source: 'chat',
  sourceId: 'conv-1',
  runId: null,
  model: 'claude-sonnet-4-20250514',
  systemPrompt: 'You are helpful.',
  userInput: 'Hello',
  assistantOutput: 'Hi there!',
  inputTokens: 10,
  outputTokens: 20,
  totalTokens: 30,
  latencyMs: 500,
  status: 'success',
  error: null,
  createdAt: '2026-03-17T10:00:00Z',
};

const mockUsageBuckets: UsageBucket[] = [
  { date: '2026-03-17', inputTokens: 100, outputTokens: 200, totalTokens: 300, count: 5 },
];

const mockCostEstimate: CostEstimate = {
  inputTokens: 100,
  outputTokens: 200,
  totalTokens: 300,
  inputCost: 0.0003,
  outputCost: 0.003,
  totalCost: 0.0033,
  period: 'month',
};

const mockErrorBuckets: ErrorRateBucket[] = [
  { date: '2026-03-17', total: 10, errors: 1, errorRate: 0.1 },
];

const mockLatencyStats: LatencyStats = {
  avg: 500,
  p50: 450,
  p95: 900,
  min: 200,
  max: 1200,
  count: 10,
};

describe('TraceService', () => {
  let service: TraceService;
  let apiService: ApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TraceService, ApiService],
    });
    service = TestBed.inject(TraceService);
    apiService = TestBed.inject(ApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with empty traces', () => {
    expect(service.traces()).toEqual([]);
  });

  it('should start with loading false', () => {
    expect(service.loading()).toBe(false);
  });

  it('should start with no error', () => {
    expect(service.error()).toBeNull();
  });

  it('should start with null costEstimate', () => {
    expect(service.costEstimate()).toBeNull();
  });

  describe('loadTraces', () => {
    it('should load traces from API', async () => {
      vi.spyOn(apiService, 'get').mockResolvedValue([mockTrace]);

      await service.loadTraces();

      expect(service.traces()).toEqual([mockTrace]);
      expect(apiService.get).toHaveBeenCalledWith('/traces');
    });

    it('should pass query params', async () => {
      vi.spyOn(apiService, 'get').mockResolvedValue([]);

      await service.loadTraces({ source: 'chat', limit: 10, offset: 5 });

      expect(apiService.get).toHaveBeenCalledWith('/traces?source=chat&limit=10&offset=5');
    });

    it('should set error on failure', async () => {
      vi.spyOn(apiService, 'get').mockRejectedValue(new Error('Network error'));

      await service.loadTraces();

      expect(service.error()).toBe('Network error');
    });

    it('should set loading during request', async () => {
      let resolvePromise: (value: Trace[]) => void;
      const promise = new Promise<Trace[]>((resolve) => {
        resolvePromise = resolve;
      });
      vi.spyOn(apiService, 'get').mockReturnValue(promise);

      const loadPromise = service.loadTraces();
      expect(service.loading()).toBe(true);

      resolvePromise!([]);
      await loadPromise;
      expect(service.loading()).toBe(false);
    });
  });

  describe('getTrace', () => {
    it('should fetch a single trace', async () => {
      vi.spyOn(apiService, 'get').mockResolvedValue(mockTrace);

      await service.getTrace('trace-1');

      expect(service.activeTrace()).toEqual(mockTrace);
      expect(apiService.get).toHaveBeenCalledWith('/traces/trace-1');
    });

    it('should set error on failure', async () => {
      vi.spyOn(apiService, 'get').mockRejectedValue(new Error('Not found'));

      await service.getTrace('bad-id');

      expect(service.error()).toBe('Not found');
    });
  });

  describe('getUsageStats', () => {
    it('should load usage stats', async () => {
      vi.spyOn(apiService, 'get').mockResolvedValue(mockUsageBuckets);

      await service.getUsageStats('month');

      expect(service.usageStats()).toEqual(mockUsageBuckets);
      expect(apiService.get).toHaveBeenCalledWith('/traces/stats/usage?period=month');
    });
  });

  describe('getCostEstimate', () => {
    it('should load cost estimate', async () => {
      vi.spyOn(apiService, 'get').mockResolvedValue(mockCostEstimate);

      await service.getCostEstimate('month');

      expect(service.costEstimate()).toEqual(mockCostEstimate);
      expect(apiService.get).toHaveBeenCalledWith('/traces/stats/cost?period=month');
    });
  });

  describe('getErrorRate', () => {
    it('should load error rate', async () => {
      vi.spyOn(apiService, 'get').mockResolvedValue(mockErrorBuckets);

      await service.getErrorRate('month');

      expect(service.errorRate()).toEqual(mockErrorBuckets);
      expect(apiService.get).toHaveBeenCalledWith('/traces/stats/errors?period=month');
    });
  });

  describe('getLatencyStats', () => {
    it('should load latency stats', async () => {
      vi.spyOn(apiService, 'get').mockResolvedValue(mockLatencyStats);

      await service.getLatencyStats('month');

      expect(service.latencyStats()).toEqual(mockLatencyStats);
      expect(apiService.get).toHaveBeenCalledWith('/traces/stats/latency?period=month');
    });
  });

  describe('clearError', () => {
    it('should clear the error', () => {
      service.error.set('some error');
      service.clearError();
      expect(service.error()).toBeNull();
    });
  });
});
