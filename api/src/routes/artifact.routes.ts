import { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { getDb } from '../db/index.js';

export const artifactRoutes: FastifyPluginAsync = async (fastify) => {
  // List artifacts with optional filtering
  fastify.get<{
    Querystring: { sourceType?: string; sourceId?: string };
  }>('/', async (request) => {
    const db = getDb();
    const { sourceType, sourceId } = request.query;
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (sourceType) {
      conditions.push('source_type = ?');
      values.push(sourceType);
    }
    if (sourceId) {
      conditions.push('source_id = ?');
      values.push(sourceId);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return db
      .prepare(
        `SELECT id, title, type, language, content, source_type as sourceType,
                source_id as sourceId, run_id as runId, created_at as createdAt
         FROM artifacts ${where} ORDER BY created_at DESC`,
      )
      .all(...values);
  });

  // Get single artifact
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const db = getDb();
    const artifact = db
      .prepare(
        `SELECT id, title, type, language, content, source_type as sourceType,
                source_id as sourceId, run_id as runId, created_at as createdAt
         FROM artifacts WHERE id = ?`,
      )
      .get(request.params.id);
    if (!artifact) {
      reply.status(404).send({ error: 'Artifact not found' });
      return;
    }
    return artifact;
  });

  // Create artifact
  fastify.post<{
    Body: {
      title: string;
      type: string;
      language?: string;
      content: string;
      sourceType: string;
      sourceId: string;
      runId?: string;
    };
  }>('/', async (request, reply) => {
    const db = getDb();
    const id = randomUUID();
    const { title, type, language, content, sourceType, sourceId, runId } = request.body;
    db.prepare(
      `INSERT INTO artifacts (id, title, type, language, content, source_type, source_id, run_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, title, type, language ?? null, content, sourceType, sourceId, runId ?? null);
    const artifact = db
      .prepare(
        `SELECT id, title, type, language, content, source_type as sourceType,
                source_id as sourceId, run_id as runId, created_at as createdAt
         FROM artifacts WHERE id = ?`,
      )
      .get(id);
    reply.status(201).send(artifact);
  });

  // Delete artifact
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const db = getDb();
    db.prepare('DELETE FROM artifacts WHERE id = ?').run(request.params.id);
    reply.status(204).send();
  });
};
