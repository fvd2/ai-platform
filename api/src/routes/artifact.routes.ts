import { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { getDb } from '../db/index.js';

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  javascript: '.js',
  typescript: '.ts',
  python: '.py',
  ruby: '.rb',
  go: '.go',
  rust: '.rs',
  java: '.java',
  c: '.c',
  cpp: '.cpp',
  csharp: '.cs',
  shell: '.sh',
  bash: '.sh',
  html: '.html',
  css: '.css',
  scss: '.scss',
  sql: '.sql',
  yaml: '.yaml',
  toml: '.toml',
  xml: '.xml',
  swift: '.swift',
  kotlin: '.kt',
  php: '.php',
  r: '.r',
  lua: '.lua',
  perl: '.pl',
  scala: '.scala',
  dart: '.dart',
};

function getFileExtension(type: string, language?: string | null): string {
  if (type === 'markdown') return '.md';
  if (type === 'json') return '.json';
  if (type === 'text') return '.txt';
  if (type === 'table') return '.csv';
  if (language) {
    return LANGUAGE_EXTENSIONS[language.toLowerCase()] ?? `.${language}`;
  }
  return '.txt';
}

export const artifactRoutes: FastifyPluginAsync = async (fastify) => {
  // Search artifacts via FTS5
  fastify.get<{
    Querystring: { q: string };
  }>('/search', async (request) => {
    const db = getDb();
    const { q } = request.query;
    if (!q || q.trim().length === 0) {
      return [];
    }
    return db
      .prepare(
        `SELECT a.id, a.title, a.type, a.language, a.content, a.source_type as sourceType,
                a.source_id as sourceId, a.run_id as runId, a.created_at as createdAt
         FROM artifacts a
         JOIN artifacts_fts fts ON a.rowid = fts.rowid
         WHERE artifacts_fts MATCH ?
         ORDER BY rank
         LIMIT 50`,
      )
      .all(q.trim());
  });

  // List artifacts with optional filtering
  fastify.get<{
    Querystring: { sourceType?: string; sourceId?: string; type?: string };
  }>('/', async (request) => {
    const db = getDb();
    const { sourceType, sourceId, type } = request.query;
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
    if (type) {
      conditions.push('type = ?');
      values.push(type);
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

  // Download artifact as file
  fastify.get<{ Params: { id: string } }>('/:id/download', async (request, reply) => {
    const db = getDb();
    const artifact = db
      .prepare('SELECT title, type, language, content FROM artifacts WHERE id = ?')
      .get(request.params.id) as
      | { title: string; type: string; language: string | null; content: string }
      | undefined;
    if (!artifact) {
      reply.status(404).send({ error: 'Artifact not found' });
      return;
    }

    const ext = getFileExtension(artifact.type, artifact.language);
    const baseName = artifact.title.replace(/\.[^.]+$/, '');
    const filename = `${baseName}${ext}`;

    const contentType =
      artifact.type === 'json' ? 'application/json' : 'text/plain; charset=utf-8';

    reply
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .header('Content-Type', contentType)
      .send(artifact.content);
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
