import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';
import { ApiService } from './api.service';
import { Task, TaskRun } from '../models/task.model';

const mockTask: Task = {
  id: '1',
  name: 'Daily Summary',
  prompt: 'Summarize the news',
  schedule: '0 9 * * *',
  scheduleDescription: 'Every day at 9am',
  status: 'active',
  lastRunAt: null,
  nextRunAt: '2026-03-17T09:00:00Z',
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

const mockPausedTask: Task = {
  ...mockTask,
  id: '2',
  name: 'Weekly Report',
  status: 'paused',
};

const mockRun: TaskRun = {
  id: 'r1',
  taskId: '1',
  status: 'success',
  output: 'Summary output',
  error: null,
  startedAt: '2026-03-16T09:00:00Z',
  completedAt: '2026-03-16T09:01:00Z',
  tokenUsage: 150,
};

describe('TaskService', () => {
  let service: TaskService;
  let apiService: ApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TaskService, ApiService],
    });
    service = TestBed.inject(TaskService);
    apiService = TestBed.inject(ApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with empty tasks', () => {
    expect(service.tasks()).toEqual([]);
  });

  it('should start with no active task', () => {
    expect(service.activeTask()).toBeNull();
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

  it('should have hasActiveTask as false initially', () => {
    expect(service.hasActiveTask()).toBe(false);
  });

  it('should load tasks from API', async () => {
    const mockTasks = [mockTask, mockPausedTask];
    vi.spyOn(apiService, 'get').mockResolvedValue(mockTasks);

    await service.loadTasks();

    expect(service.tasks()).toEqual(mockTasks);
    expect(apiService.get).toHaveBeenCalledWith('/tasks');
  });

  it('should compute activeTasks and pausedTasks', async () => {
    vi.spyOn(apiService, 'get').mockResolvedValue([mockTask, mockPausedTask]);

    await service.loadTasks();

    expect(service.activeTasks()).toEqual([mockTask]);
    expect(service.pausedTasks()).toEqual([mockPausedTask]);
  });

  it('should create a task and reload tasks', async () => {
    vi.spyOn(apiService, 'post').mockResolvedValue(mockTask);
    vi.spyOn(apiService, 'get').mockResolvedValue([mockTask]);

    await service.createTask({
      name: 'Daily Summary',
      prompt: 'Summarize the news',
      schedule: '0 9 * * *',
      scheduleDescription: 'Every day at 9am',
    });

    expect(apiService.post).toHaveBeenCalledWith('/tasks', {
      name: 'Daily Summary',
      prompt: 'Summarize the news',
      schedule: '0 9 * * *',
      scheduleDescription: 'Every day at 9am',
    });
    expect(service.tasks()).toEqual([mockTask]);
  });

  it('should select a task and load runs', async () => {
    vi.spyOn(apiService, 'get')
      .mockResolvedValueOnce(mockTask)
      .mockResolvedValueOnce([mockRun]);

    await service.selectTask('1');

    expect(service.activeTask()).toEqual(mockTask);
    expect(service.runs()).toEqual([mockRun]);
    expect(service.hasActiveTask()).toBe(true);
  });

  it('should delete a task and clear active if needed', async () => {
    // Set active task first
    vi.spyOn(apiService, 'get')
      .mockResolvedValueOnce(mockTask)
      .mockResolvedValueOnce([]);
    await service.selectTask('1');

    vi.spyOn(apiService, 'delete').mockResolvedValue(undefined);

    await service.deleteTask('1');

    expect(apiService.delete).toHaveBeenCalledWith('/tasks/1');
    expect(service.activeTask()).toBeNull();
    expect(service.runs()).toEqual([]);
  });

  it('should toggle a task and reload tasks', async () => {
    vi.spyOn(apiService, 'post').mockResolvedValue(undefined);
    vi.spyOn(apiService, 'get').mockResolvedValue([{ ...mockTask, status: 'paused' }]);

    await service.toggleTask('1');

    expect(apiService.post).toHaveBeenCalledWith('/tasks/1/toggle');
    expect(service.tasks()[0].status).toBe('paused');
  });

  it('should set error on API failure', async () => {
    vi.spyOn(apiService, 'get').mockRejectedValue(new Error('Network error'));

    await service.loadTasks();

    expect(service.error()).toBe('Network error');
  });

  it('should clear error', () => {
    service.error.set('some error');
    service.clearError();
    expect(service.error()).toBeNull();
  });

  it('should run a task and reload runs', async () => {
    vi.spyOn(apiService, 'post').mockResolvedValue(undefined);
    vi.spyOn(apiService, 'get').mockResolvedValue([mockRun]);

    await service.runTask('1');

    expect(apiService.post).toHaveBeenCalledWith('/tasks/1/run');
    expect(service.runs()).toEqual([mockRun]);
  });
});
