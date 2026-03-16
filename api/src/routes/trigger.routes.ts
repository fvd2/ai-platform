import { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { getDb } from '../db/index.js';

interface TriggerRow {
  id: string;
  name: string;
  type: string;
  prompt: string;
  config: string;
  status: string;
  runCount: number;
  lastFiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function parseTriggerConfig(row: TriggerRow) {
  return { ...row, config: JSON.parse(row.config) };
}

const TRIGGER_SELECT = `SELECT id, name, type, prompt, config, status,
       run_count as runCount, last_fired_at as lastFiredAt,
       created_at as createdAt, updated_at as updatedAt
FROM triggers`;

export const triggerRoutes: FastifyPluginAsync = async (fastify) => {
  // List all triggers
  fastify.get('/', async () => {
    const db = getDb();
    const rows = db.prepare(`${TRIGGER_SELECT} ORDER BY updated_at DESC`).all() as TriggerRow[];
    return rows.map(parseTriggerConfig);
  });

  // Create trigger
  fastify.post<{
    Body: { name: string; type: string; prompt: string; config?: Record<string, unknown> };
  }>('/', async (request, reply) => {
    const db = getDb();
    const id = randomUUID();
    const { name, type, prompt, config } = request.body;
    db.prepare(
      `INSERT INTO triggers (id, name, type, prompt, config) VALUES (?, ?, ?, ?, ?)`,
    ).run(id, name, type, prompt, JSON.stringify(config ?? {}));
    const row = db
      .prepare(`${TRIGGER_SELECT} WHERE id = ?`)
      .get(id) as TriggerRow;
    reply.status(201).send(parseTriggerConfig(row));
  });

  // Get single trigger
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const db = getDb();
    const row = db
      .prepare(`${TRIGGER_SELECT} WHERE id = ?`)
      .get(request.params.id) as TriggerRow | undefined;
    if (!row) {
      reply.status(404).send({ error: 'Trigger not found' });
      return;
    }
    return parseTriggerConfig(row);
  });

  // Update trigger
  fastify.put<{
    Params: { id: string };
    Body: {
      name?: string;
      type?: string;
      prompt?: string;
      config?: Record<string, unknown>;
      status?: string;
    };
  }>('/:id', async (request, reply) => {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM triggers WHERE id = ?').get(request.params.id);
    if (!existing) {
      reply.status(404).send({ error: 'Trigger not found' });
      return;
    }
    const { name, type, prompt, config, status } = request.body;
    const sets: string[] = [];
    const values: unknown[] = [];
    if (name !== undefined) {
      sets.push('name = ?');
      values.push(name);
    }
    if (type !== undefined) {
      sets.push('type = ?');
      values.push(type);
    }
    if (prompt !== undefined) {
      sets.push('prompt = ?');
      values.push(prompt);
    }
    if (config !== undefined) {
      sets.push('config = ?');
      values.push(JSON.stringify(config));
    }
    if (status !== undefined) {
      sets.push('status = ?');
      values.push(status);
    }
    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')");
      values.push(request.params.id);
      db.prepare(`UPDATE triggers SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }
    const row = db
      .prepare(`${TRIGGER_SELECT} WHERE id = ?`)
      .get(request.params.id) as TriggerRow;
    return parseTriggerConfig(row);
  });

  // Delete trigger
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const db = getDb();
    db.prepare('DELETE FROM triggers WHERE id = ?').run(request.params.id);
    reply.status(204).send();
  });

  // Toggle trigger status
  fastify.post<{ Params: { id: string } }>('/:id/toggle', async (request, reply) => {
    const db = getDb();
    const trigger = db
      .prepare('SELECT id, status FROM triggers WHERE id = ?')
      .get(request.params.id) as { id: string; status: string } | undefined;
    if (!trigger) {
      reply.status(404).send({ error: 'Trigger not found' });
      return;
    }
    const newStatus = trigger.status === 'active' ? 'paused' : 'active';
    db.prepare("UPDATE triggers SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
      newStatus,
      request.params.id,
    );
    const row = db
      .prepare(`${TRIGGER_SELECT} WHERE id = ?`)
      .get(request.params.id) as TriggerRow;
    return parseTriggerConfig(row);
  });

  // List runs for trigger
  fastify.get<{ Params: { id: string } }>('/:id/runs', async (request) => {
    const db = getDb();
    return db
      .prepare(
        `SELECT id, trigger_id as triggerId, status, event_summary as eventSummary,
                output, error, started_at as startedAt, completed_at as completedAt
         FROM trigger_runs WHERE trigger_id = ? ORDER BY started_at DESC LIMIT 50`,
      )
      .all(request.params.id);
  });

  // Manually fire a trigger
  fastify.post<{ Params: { id: string } }>('/:id/fire', async (request, reply) => {
    const db = getDb();
    const trigger = db.prepare('SELECT id FROM triggers WHERE id = ?').get(request.params.id);
    if (!trigger) {
      reply.status(404).send({ error: 'Trigger not found' });
      return;
    }
    const runId = randomUUID();
    db.prepare(
      `INSERT INTO trigger_runs (id, trigger_id, status, event_summary, output, completed_at)
       VALUES (?, ?, 'success', 'Manual fire', 'Trigger fired successfully (placeholder)', datetime('now'))`,
    ).run(runId, request.params.id);
    db.prepare(
      `UPDATE triggers SET run_count = run_count + 1, last_fired_at = datetime('now'),
              updated_at = datetime('now') WHERE id = ?`,
    ).run(request.params.id);
    const run = db
      .prepare(
        `SELECT id, trigger_id as triggerId, status, event_summary as eventSummary,
                output, error, started_at as startedAt, completed_at as completedAt
         FROM trigger_runs WHERE id = ?`,
      )
      .get(runId);
    reply.status(201).send(run);
  });

  // Webhook receiver
  fastify.post<{ Params: { id: string } }>('/webhook/:id', async (request, reply) => {
    const db = getDb();
    const trigger = db
      .prepare('SELECT id, status FROM triggers WHERE id = ?')
      .get(request.params.id) as { id: string; status: string } | undefined;
    if (!trigger) {
      reply.status(404).send({ error: 'Trigger not found' });
      return;
    }
    if (trigger.status !== 'active') {
      reply.status(400).send({ error: 'Trigger is not active' });
      return;
    }
    const runId = randomUUID();
    db.prepare(
      `INSERT INTO trigger_runs (id, trigger_id, status, event_summary, output, completed_at)
       VALUES (?, ?, 'success', 'Webhook received', 'Webhook processed successfully (placeholder)', datetime('now'))`,
    ).run(runId, request.params.id);
    db.prepare(
      `UPDATE triggers SET run_count = run_count + 1, last_fired_at = datetime('now'),
              updated_at = datetime('now') WHERE id = ?`,
    ).run(request.params.id);
    const run = db
      .prepare(
        `SELECT id, trigger_id as triggerId, status, event_summary as eventSummary,
                output, error, started_at as startedAt, completed_at as completedAt
         FROM trigger_runs WHERE id = ?`,
      )
      .get(runId);
    reply.status(201).send(run);
  });
};
