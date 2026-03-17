import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TriggerService } from './trigger.service';
import { ApiService } from './api.service';
import { Trigger, TriggerRun } from '../models/trigger.model';

const mockTrigger: Trigger = {
  id: '1',
  name: 'New PR Trigger',
  type: 'webhook',
  prompt: 'Summarize the PR',
  config: { webhookUrl: 'https://example.com/hook', filter: 'opened' },
  status: 'active',
  runCount: 5,
  lastFiredAt: '2026-03-15T10:00:00Z',
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

const mockPausedTrigger: Trigger = {
  ...mockTrigger,
  id: '2',
  name: 'Poll Trigger',
  type: 'poll',
  config: { url: 'https://api.example.com/data', interval: 300, condition: 'changed' },
  status: 'paused',
};

const mockRun: TriggerRun = {
  id: 'r1',
  triggerId: '1',
  status: 'success',
  eventSummary: 'PR #42 opened',
  output: 'Summary of PR',
  error: null,
  startedAt: '2026-03-16T10:00:00Z',
  completedAt: '2026-03-16T10:01:00Z',
};

describe('TriggerService', () => {
  let service: TriggerService;
  let apiService: ApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TriggerService, ApiService],
    });
    service = TestBed.inject(TriggerService);
    apiService = TestBed.inject(ApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with empty triggers', () => {
    expect(service.triggers()).toEqual([]);
  });

  it('should start with no active trigger', () => {
    expect(service.activeTrigger()).toBeNull();
  });

  it('should start with empty runs', () => {
    expect(service.runs()).toEqual([]);
  });

  it('should start with loading false', () => {
    expect(service.loading()).toBe(false);
  });

  it('should start with no error', () => {
    expect(service.error()).toBeNull();
  });

  it('should have hasActiveTrigger as false initially', () => {
    expect(service.hasActiveTrigger()).toBe(false);
  });

  it('should load triggers from API', async () => {
    const mockTriggers = [mockTrigger, mockPausedTrigger];
    vi.spyOn(apiService, 'get').mockResolvedValue(mockTriggers);

    await service.loadTriggers();

    expect(service.triggers()).toEqual(mockTriggers);
    expect(apiService.get).toHaveBeenCalledWith('/triggers');
  });

  it('should compute activeTriggers and pausedTriggers', async () => {
    vi.spyOn(apiService, 'get').mockResolvedValue([mockTrigger, mockPausedTrigger]);

    await service.loadTriggers();

    expect(service.activeTriggers()).toEqual([mockTrigger]);
    expect(service.pausedTriggers()).toEqual([mockPausedTrigger]);
  });

  it('should create a trigger and reload triggers', async () => {
    vi.spyOn(apiService, 'post').mockResolvedValue(mockTrigger);
    vi.spyOn(apiService, 'get').mockResolvedValue([mockTrigger]);

    await service.createTrigger({
      name: 'New PR Trigger',
      type: 'webhook',
      prompt: 'Summarize the PR',
      config: { webhookUrl: 'https://example.com/hook', filter: 'opened' },
    });

    expect(apiService.post).toHaveBeenCalledWith('/triggers', {
      name: 'New PR Trigger',
      type: 'webhook',
      prompt: 'Summarize the PR',
      config: { webhookUrl: 'https://example.com/hook', filter: 'opened' },
    });
    expect(service.triggers()).toEqual([mockTrigger]);
  });

  it('should select a trigger and load runs', async () => {
    vi.spyOn(apiService, 'get')
      .mockResolvedValueOnce(mockTrigger)
      .mockResolvedValueOnce([mockRun]);

    await service.selectTrigger('1');

    expect(service.activeTrigger()).toEqual(mockTrigger);
    expect(service.runs()).toEqual([mockRun]);
    expect(service.hasActiveTrigger()).toBe(true);
  });

  it('should delete a trigger and clear active if needed', async () => {
    // Set active trigger first
    vi.spyOn(apiService, 'get')
      .mockResolvedValueOnce(mockTrigger)
      .mockResolvedValueOnce([]);
    await service.selectTrigger('1');

    vi.spyOn(apiService, 'delete').mockResolvedValue(undefined);

    await service.deleteTrigger('1');

    expect(apiService.delete).toHaveBeenCalledWith('/triggers/1');
    expect(service.activeTrigger()).toBeNull();
    expect(service.runs()).toEqual([]);
  });

  it('should toggle a trigger and reload triggers', async () => {
    vi.spyOn(apiService, 'post').mockResolvedValue(undefined);
    vi.spyOn(apiService, 'get').mockResolvedValue([{ ...mockTrigger, status: 'paused' }]);

    await service.toggleTrigger('1');

    expect(apiService.post).toHaveBeenCalledWith('/triggers/1/toggle');
    expect(service.triggers()[0].status).toBe('paused');
  });

  it('should set error on API failure', async () => {
    vi.spyOn(apiService, 'get').mockRejectedValue(new Error('Network error'));

    await service.loadTriggers();

    expect(service.error()).toBe('Network error');
  });

  it('should clear error', () => {
    service.error.set('some error');
    service.clearError();
    expect(service.error()).toBeNull();
  });

  it('should fire a trigger and reload runs', async () => {
    vi.spyOn(apiService, 'post').mockResolvedValue(undefined);
    vi.spyOn(apiService, 'get').mockResolvedValue([mockRun]);

    await service.fireTrigger('1');

    expect(apiService.post).toHaveBeenCalledWith('/triggers/1/fire');
    expect(service.runs()).toEqual([mockRun]);
  });
});
