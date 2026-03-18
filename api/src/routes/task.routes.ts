import { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { getDb } from '../db/index.js';
import { executeTask, rescheduleTask, unscheduleTask } from '../services/scheduler.service.js';

export const taskRoutes: FastifyPluginAsync = async (fastify) => {
  // List all tasks
  fastify.get('/', async () => {
    const db = getDb();
    return db
      .prepare(
        `SELECT id, name, prompt, schedule, schedule_description as scheduleDescription,
                status, last_run_at as lastRunAt, next_run_at as nextRunAt,
                created_at as createdAt, updated_at as updatedAt
         FROM tasks ORDER BY updated_at DESC`,
      )
      .all();
  });

  // Create task
  fastify.post<{
    Body: { name: string; prompt: string; schedule: string; scheduleDescription?: string };
  }>('/', async (request, reply) => {
    const db = getDb();
    const id = randomUUID();
    const { name, prompt, schedule, scheduleDescription } = request.body;
    db.prepare(
      `INSERT INTO tasks (id, name, prompt, schedule, schedule_description)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(id, name, prompt, schedule, scheduleDescription ?? '');
    const task = db
      .prepare(
        `SELECT id, name, prompt, schedule, schedule_description as scheduleDescription,
                status, last_run_at as lastRunAt, next_run_at as nextRunAt,
                created_at as createdAt, updated_at as updatedAt
         FROM tasks WHERE id = ?`,
      )
      .get(id);

    // Schedule the newly created task
    rescheduleTask(id);

    reply.status(201).send(task);
  });

  // Get single task
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const db = getDb();
    const task = db
      .prepare(
        `SELECT id, name, prompt, schedule, schedule_description as scheduleDescription,
                status, last_run_at as lastRunAt, next_run_at as nextRunAt,
                created_at as createdAt, updated_at as updatedAt
         FROM tasks WHERE id = ?`,
      )
      .get(request.params.id);
    if (!task) {
      reply.status(404).send({ error: 'Task not found' });
      return;
    }
    return task;
  });

  // Update task
  fastify.put<{
    Params: { id: string };
    Body: {
      name?: string;
      prompt?: string;
      schedule?: string;
      scheduleDescription?: string;
      status?: string;
    };
  }>('/:id', async (request, reply) => {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM tasks WHERE id = ?').get(request.params.id);
    if (!existing) {
      reply.status(404).send({ error: 'Task not found' });
      return;
    }
    const { name, prompt, schedule, scheduleDescription, status } = request.body;
    const sets: string[] = [];
    const values: unknown[] = [];
    if (name !== undefined) {
      sets.push('name = ?');
      values.push(name);
    }
    if (prompt !== undefined) {
      sets.push('prompt = ?');
      values.push(prompt);
    }
    if (schedule !== undefined) {
      sets.push('schedule = ?');
      values.push(schedule);
    }
    if (scheduleDescription !== undefined) {
      sets.push('schedule_description = ?');
      values.push(scheduleDescription);
    }
    if (status !== undefined) {
      sets.push('status = ?');
      values.push(status);
    }
    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')");
      values.push(request.params.id);
      db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }

    // Reschedule if schedule or status changed
    if (schedule !== undefined || status !== undefined) {
      rescheduleTask(request.params.id);
    }

    return db
      .prepare(
        `SELECT id, name, prompt, schedule, schedule_description as scheduleDescription,
                status, last_run_at as lastRunAt, next_run_at as nextRunAt,
                created_at as createdAt, updated_at as updatedAt
         FROM tasks WHERE id = ?`,
      )
      .get(request.params.id);
  });

  // Delete task
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const db = getDb();
    unscheduleTask(request.params.id);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(request.params.id);
    reply.status(204).send();
  });

  // Toggle task status
  fastify.post<{ Params: { id: string } }>('/:id/toggle', async (request, reply) => {
    const db = getDb();
    const task = db.prepare('SELECT id, status FROM tasks WHERE id = ?').get(request.params.id) as
      | { id: string; status: string }
      | undefined;
    if (!task) {
      reply.status(404).send({ error: 'Task not found' });
      return;
    }
    const newStatus = task.status === 'active' ? 'paused' : 'active';
    db.prepare("UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
      newStatus,
      request.params.id,
    );

    // Add/remove from scheduler based on new status
    rescheduleTask(request.params.id);

    return db
      .prepare(
        `SELECT id, name, prompt, schedule, schedule_description as scheduleDescription,
                status, last_run_at as lastRunAt, next_run_at as nextRunAt,
                created_at as createdAt, updated_at as updatedAt
         FROM tasks WHERE id = ?`,
      )
      .get(request.params.id);
  });

  // List runs for task
  fastify.get<{ Params: { id: string } }>('/:id/runs', async (request) => {
    const db = getDb();
    return db
      .prepare(
        `SELECT id, task_id as taskId, status, output, error,
                started_at as startedAt, completed_at as completedAt, token_usage as tokenUsage
         FROM task_runs WHERE task_id = ? ORDER BY started_at DESC LIMIT 50`,
      )
      .all(request.params.id);
  });

  // Manually run a task
  fastify.post<{ Params: { id: string } }>('/:id/run', async (request, reply) => {
    const db = getDb();
    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(request.params.id);
    if (!task) {
      reply.status(404).send({ error: 'Task not found' });
      return;
    }

    const runId = await executeTask(request.params.id);

    const run = db
      .prepare(
        `SELECT id, task_id as taskId, status, output, error,
                started_at as startedAt, completed_at as completedAt, token_usage as tokenUsage
         FROM task_runs WHERE id = ?`,
      )
      .get(runId);
    reply.status(201).send(run);
  });
};
