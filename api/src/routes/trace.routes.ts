import { FastifyPluginAsync } from 'fastify';
import {
  getTrace,
  listTraces,
  getUsageStats,
  getCostEstimate,
  getErrorRate,
  getLatencyStats,
} from '../services/trace.service.js';

export const traceRoutes: FastifyPluginAsync = async (fastify) => {
  // List traces with optional filters
  fastify.get<{
    Querystring: {
      source?: 'chat' | 'task' | 'trigger';
      from?: string;
      to?: string;
      status?: 'success' | 'error';
      limit?: string;
      offset?: string;
    };
  }>('/', async (request) => {
    const { source, from, to, status, limit, offset } = request.query;
    return listTraces({
      source,
      from,
      to,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  });

  // Stats routes must be registered before /:id to avoid conflicts
  // Token usage aggregation (daily buckets)
  fastify.get<{ Querystring: { period?: 'day' | 'week' | 'month' } }>(
    '/stats/usage',
    async (request) => {
      const period = request.query.period ?? 'month';
      return getUsageStats(period);
    },
  );

  // Cost estimation
  fastify.get<{ Querystring: { period?: 'day' | 'week' | 'month' } }>(
    '/stats/cost',
    async (request) => {
      const period = request.query.period ?? 'month';
      return getCostEstimate(period);
    },
  );

  // Error rate over time
  fastify.get<{ Querystring: { period?: 'day' | 'week' | 'month' } }>(
    '/stats/errors',
    async (request) => {
      const period = request.query.period ?? 'month';
      return getErrorRate(period);
    },
  );

  // Latency percentiles
  fastify.get<{ Querystring: { period?: 'day' | 'week' | 'month' } }>(
    '/stats/latency',
    async (request) => {
      const period = request.query.period ?? 'month';
      return getLatencyStats(period);
    },
  );

  // Get single trace with full prompt/response
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const trace = getTrace(request.params.id);
    if (!trace) {
      reply.status(404).send({ error: 'Trace not found' });
      return;
    }
    return trace;
  });
};
