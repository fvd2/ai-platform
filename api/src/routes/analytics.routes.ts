import { FastifyPluginAsync } from 'fastify';
import {
  getTaskStats,
  getTriggerStats,
  getOverallStats,
  getFailurePatterns,
  getRunTrends,
  analyzePrompt,
} from '../services/analytics.service.js';

export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  // Task-specific stats
  fastify.get<{ Params: { id: string } }>('/tasks/:id/stats', async (request) => {
    return getTaskStats(request.params.id);
  });

  // Trigger-specific stats
  fastify.get<{ Params: { id: string } }>('/triggers/:id/stats', async (request) => {
    return getTriggerStats(request.params.id);
  });

  // Overall platform stats
  fastify.get<{ Querystring: { period?: 'day' | 'week' | 'month' } }>(
    '/overview',
    async (request) => {
      const period = request.query.period ?? 'week';
      return getOverallStats(period);
    },
  );

  // Failure pattern analysis
  fastify.get<{
    Querystring: { source: 'task' | 'trigger'; sourceId: string };
  }>('/failures', async (request, reply) => {
    const { source, sourceId } = request.query;
    if (!source || !sourceId) {
      reply.status(400).send({ error: 'source and sourceId are required' });
      return;
    }
    return getFailurePatterns(source, sourceId);
  });

  // Run trends
  fastify.get<{
    Querystring: { source: 'task' | 'trigger'; sourceId: string; period?: 'day' | 'week' | 'month' };
  }>('/trends', async (request, reply) => {
    const { source, sourceId, period } = request.query;
    if (!source || !sourceId) {
      reply.status(400).send({ error: 'source and sourceId are required' });
      return;
    }
    return getRunTrends(source, sourceId, period ?? 'week');
  });

  // AI-powered prompt analysis
  fastify.post<{
    Body: { prompt: string; sourceType: 'task' | 'trigger'; sourceId: string };
  }>('/analyze-prompt', async (request, reply) => {
    const { prompt, sourceType, sourceId } = request.body;
    if (!prompt || !sourceType || !sourceId) {
      reply.status(400).send({ error: 'prompt, sourceType, and sourceId are required' });
      return;
    }

    try {
      const result = await analyzePrompt(prompt, sourceType, sourceId);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: `Prompt analysis failed: ${message}` });
    }
  });
};
