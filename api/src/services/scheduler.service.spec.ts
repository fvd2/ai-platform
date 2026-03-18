import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';

// Mock node-cron
const mockSchedule = vi.fn();
const mockValidate = vi.fn();
const mockStop = vi.fn();

vi.mock('node-cron', () => ({
  default: {
    schedule: (...args: unknown[]) => {
      mockSchedule(...args);
      return { stop: mockStop };
    },
    validate: (...args: unknown[]) => mockValidate(...args),
  },
}));

// Mock AI service
const mockGenerateResponse = vi.fn();
vi.mock('./ai.service.js', () => ({
  generateResponse: (...args: unknown[]) => mockGenerateResponse(...args),
}));

// Set up in-memory DB before importing the module under test
let db: Database.Database;

vi.mock('../db/index.js', () => ({
  getDb: () => db,
  initDb: () => db,
}));

// Import after mocks are set up
import {
  initScheduler,
  scheduleTask,
  unscheduleTask,
  rescheduleTask,
  executeTask,
  stopScheduler,
  getScheduledJobCount,
} from './scheduler.service.js';

function setupDb(): void {
  db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      prompt TEXT NOT NULL,
      schedule TEXT NOT NULL,
      schedule_description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      last_run_at TEXT,
      next_run_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE task_runs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'running',
      output TEXT,
      error TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      token_usage INTEGER
    );
  `);
}

describe('SchedulerService', () => {
  beforeEach(() => {
    setupDb();
    mockSchedule.mockClear();
    mockValidate.mockClear();
    mockStop.mockClear();
    mockGenerateResponse.mockClear();
    mockValidate.mockReturnValue(true);
  });

  afterEach(() => {
    stopScheduler();
  });

  describe('initScheduler', () => {
    it('should schedule all active tasks from the database', () => {
      db.prepare(
        `INSERT INTO tasks (id, name, prompt, schedule, status) VALUES (?, ?, ?, ?, ?)`,
      ).run('task-1', 'Test Task', 'Do something', '*/5 * * * *', 'active');
      db.prepare(
        `INSERT INTO tasks (id, name, prompt, schedule, status) VALUES (?, ?, ?, ?, ?)`,
      ).run('task-2', 'Paused Task', 'Do nothing', '0 * * * *', 'paused');

      initScheduler();

      // Only the active task should be scheduled
      expect(mockSchedule).toHaveBeenCalledTimes(1);
      expect(mockSchedule).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function));
    });

    it('should handle empty database gracefully', () => {
      initScheduler();
      expect(mockSchedule).not.toHaveBeenCalled();
    });
  });

  describe('scheduleTask', () => {
    it('should create a cron job for an active task', () => {
      db.prepare(
        `INSERT INTO tasks (id, name, prompt, schedule, status) VALUES (?, ?, ?, ?, ?)`,
      ).run('task-1', 'Test Task', 'Do something', '*/5 * * * *', 'active');

      scheduleTask({
        id: 'task-1',
        name: 'Test Task',
        prompt: 'Do something',
        schedule: '*/5 * * * *',
        status: 'active',
      });

      expect(mockSchedule).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function));
    });

    it('should not schedule a paused task', () => {
      scheduleTask({
        id: 'task-1',
        name: 'Test Task',
        prompt: 'Do something',
        schedule: '*/5 * * * *',
        status: 'paused',
      });

      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it('should not schedule a task with an invalid cron expression', () => {
      mockValidate.mockReturnValue(false);

      db.prepare(
        `INSERT INTO tasks (id, name, prompt, schedule, status) VALUES (?, ?, ?, ?, ?)`,
      ).run('task-1', 'Test Task', 'Do something', 'invalid', 'active');

      scheduleTask({
        id: 'task-1',
        name: 'Test Task',
        prompt: 'Do something',
        schedule: 'invalid',
        status: 'active',
      });

      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it('should stop existing job before rescheduling', () => {
      db.prepare(
        `INSERT INTO tasks (id, name, prompt, schedule, status) VALUES (?, ?, ?, ?, ?)`,
      ).run('task-1', 'Test Task', 'Do something', '*/5 * * * *', 'active');

      const task = {
        id: 'task-1',
        name: 'Test Task',
        prompt: 'Do something',
        schedule: '*/5 * * * *',
        status: 'active',
      };

      scheduleTask(task);
      scheduleTask(task);

      // Stop should have been called for the first job
      expect(mockStop).toHaveBeenCalledTimes(1);
      expect(mockSchedule).toHaveBeenCalledTimes(2);
    });
  });

  describe('unscheduleTask', () => {
    it('should stop and remove a scheduled job', () => {
      db.prepare(
        `INSERT INTO tasks (id, name, prompt, schedule, status) VALUES (?, ?, ?, ?, ?)`,
      ).run('task-1', 'Test Task', 'Do something', '*/5 * * * *', 'active');

      scheduleTask({
        id: 'task-1',
        name: 'Test Task',
        prompt: 'Do something',
        schedule: '*/5 * * * *',
        status: 'active',
      });

      unscheduleTask('task-1');
      expect(mockStop).toHaveBeenCalledTimes(1);
    });

    it('should do nothing for a non-existent job', () => {
      unscheduleTask('non-existent');
      expect(mockStop).not.toHaveBeenCalled();
    });
  });

  describe('rescheduleTask', () => {
    it('should reload task from DB and reschedule', () => {
      db.prepare(
        `INSERT INTO tasks (id, name, prompt, schedule, status) VALUES (?, ?, ?, ?, ?)`,
      ).run('task-1', 'Test Task', 'Do something', '*/5 * * * *', 'active');

      rescheduleTask('task-1');

      expect(mockSchedule).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function));
    });

    it('should unschedule if task no longer exists', () => {
      db.prepare(
        `INSERT INTO tasks (id, name, prompt, schedule, status) VALUES (?, ?, ?, ?, ?)`,
      ).run('task-1', 'Test Task', 'Do something', '*/5 * * * *', 'active');

      scheduleTask({
        id: 'task-1',
        name: 'Test Task',
        prompt: 'Do something',
        schedule: '*/5 * * * *',
        status: 'active',
      });

      db.prepare('DELETE FROM tasks WHERE id = ?').run('task-1');
      rescheduleTask('task-1');

      // Stop should have been called (once from reschedule's internal unschedule)
      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe('executeTask', () => {
    it('should create a run, call AI, and update records on success', async () => {
      db.prepare(
        `INSERT INTO tasks (id, name, prompt, schedule, status) VALUES (?, ?, ?, ?, ?)`,
      ).run('task-1', 'Test Task', 'Summarize the news', '*/5 * * * *', 'active');

      mockGenerateResponse.mockResolvedValue({
        text: 'Here is a summary of the news.',
        tokenUsage: 150,
      });

      const runId = await executeTask('task-1');

      expect(runId).toBeTruthy();
      expect(mockGenerateResponse).toHaveBeenCalledWith('Summarize the news');

      // Check the run was created with success
      const run = db.prepare('SELECT * FROM task_runs WHERE id = ?').get(runId) as Record<string, unknown>;
      expect(run['status']).toBe('success');
      expect(run['output']).toBe('Here is a summary of the news.');
      expect(run['token_usage']).toBe(150);
      expect(run['completed_at']).toBeTruthy();

      // Check task timestamps were updated
      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get('task-1') as Record<string, unknown>;
      expect(task['last_run_at']).toBeTruthy();
    });

    it('should handle AI errors gracefully', async () => {
      db.prepare(
        `INSERT INTO tasks (id, name, prompt, schedule, status) VALUES (?, ?, ?, ?, ?)`,
      ).run('task-1', 'Test Task', 'Summarize the news', '*/5 * * * *', 'active');

      mockGenerateResponse.mockRejectedValue(new Error('API rate limit exceeded'));

      const runId = await executeTask('task-1');

      expect(runId).toBeTruthy();

      const run = db.prepare('SELECT * FROM task_runs WHERE id = ?').get(runId) as Record<string, unknown>;
      expect(run['status']).toBe('error');
      expect(run['error']).toBe('API rate limit exceeded');
      expect(run['completed_at']).toBeTruthy();
    });

    it('should throw if task does not exist', async () => {
      await expect(executeTask('non-existent')).rejects.toThrow('Task not found');
    });
  });

  describe('stopScheduler', () => {
    it('should stop all scheduled jobs', () => {
      db.prepare(
        `INSERT INTO tasks (id, name, prompt, schedule, status) VALUES (?, ?, ?, ?, ?)`,
      ).run('task-1', 'Task 1', 'Prompt 1', '*/5 * * * *', 'active');
      db.prepare(
        `INSERT INTO tasks (id, name, prompt, schedule, status) VALUES (?, ?, ?, ?, ?)`,
      ).run('task-2', 'Task 2', 'Prompt 2', '0 * * * *', 'active');

      initScheduler();
      expect(mockSchedule).toHaveBeenCalledTimes(2);

      stopScheduler();
      expect(mockStop).toHaveBeenCalledTimes(2);
    });
  });
});
