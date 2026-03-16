import { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { getDb } from '../db/index.js';
import { streamChatResponse, type ChatMessage } from '../services/ai.service.js';

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
  // List conversations
  fastify.get('/', async () => {
    const db = getDb();
    return db
      .prepare('SELECT id, title, created_at as createdAt, updated_at as updatedAt FROM conversations ORDER BY updated_at DESC')
      .all();
  });

  // Create conversation
  fastify.post('/', async () => {
    const db = getDb();
    const id = randomUUID();
    db.prepare('INSERT INTO conversations (id) VALUES (?)').run(id);
    return db
      .prepare('SELECT id, title, created_at as createdAt, updated_at as updatedAt FROM conversations WHERE id = ?')
      .get(id);
  });

  // Get messages for a conversation
  fastify.get<{ Params: { id: string } }>('/:id/messages', async (request) => {
    const db = getDb();
    return db
      .prepare(
        'SELECT id, conversation_id as conversationId, role, content, created_at as createdAt FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      )
      .all(request.params.id);
  });

  // Stream chat response
  fastify.post<{ Params: { id: string }; Body: { message: string } }>(
    '/:id/stream',
    async (request, reply) => {
      const { id } = request.params;
      const { message } = request.body;
      const db = getDb();

      // Save user message
      const userMsgId = randomUUID();
      db.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)').run(
        userMsgId,
        id,
        'user',
        message,
      );

      // Load conversation history
      const history = db
        .prepare('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
        .all(id) as ChatMessage[];

      // Set up SSE
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      try {
        const result = streamChatResponse(history);
        let fullContent = '';

        for await (const part of result.fullStream) {
          if (part.type === 'text-delta') {
            fullContent += part.textDelta;
            reply.raw.write(`data: ${JSON.stringify({ text: part.textDelta })}\n\n`);
          } else if (part.type === 'error') {
            fastify.log.error(part.error, 'AI stream error');
            const msg = (part.error as Error)?.message ?? 'AI request failed';
            reply.raw.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
            reply.raw.end();
            return;
          }
        }

        // Save assistant message
        const assistantMsgId = randomUUID();
        db.prepare(
          'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
        ).run(assistantMsgId, id, 'assistant', fullContent);

        // Auto-title: use first user message as title if conversation is still "New conversation"
        const conv = db.prepare('SELECT title FROM conversations WHERE id = ?').get(id) as { title: string } | undefined;
        if (conv?.title === 'New conversation') {
          const title = message.length > 60 ? message.slice(0, 57) + '...' : message;
          db.prepare('UPDATE conversations SET title = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
            title,
            id,
          );
        } else {
          db.prepare('UPDATE conversations SET updated_at = datetime(\'now\') WHERE id = ?').run(id);
        }

        reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        fastify.log.error(error, 'Stream chat error');
        reply.raw.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
      }

      reply.raw.end();
    },
  );

  // Delete conversation
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const db = getDb();
    db.prepare('DELETE FROM conversations WHERE id = ?').run(request.params.id);
    reply.status(204).send();
  });
};
