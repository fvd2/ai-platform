import dotenv from 'dotenv';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db/index.js';
import { chatRoutes } from './routes/chat.routes.js';
import { taskRoutes } from './routes/task.routes.js';
import { triggerRoutes } from './routes/trigger.routes.js';
import { artifactRoutes } from './routes/artifact.routes.js';
import { traceRoutes } from './routes/trace.routes.js';
import { analyticsRoutes } from './routes/analytics.routes.js';
import { graphRoutes } from './routes/graph.routes.js';
import { initScheduler, stopScheduler } from './services/scheduler.service.js';
import { initPollTriggers, stopAllPolling } from './services/trigger-executor.service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from api/ directory (one level up from src/)
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

initDb();

await app.register(chatRoutes, { prefix: '/api/chat' });
await app.register(taskRoutes, { prefix: '/api/tasks' });
await app.register(triggerRoutes, { prefix: '/api/triggers' });
await app.register(artifactRoutes, { prefix: '/api/artifacts' });
await app.register(traceRoutes, { prefix: '/api/traces' });
await app.register(analyticsRoutes, { prefix: '/api/analytics' });
await app.register(graphRoutes, { prefix: '/api/graph' });

// Health check
app.get('/api/health', async () => ({ status: 'ok' }));

// In production, serve the Angular static build
const publicDir = join(__dirname, '..', 'public');
if (existsSync(publicDir)) {
  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: '/',
    wildcard: false,
  });

  // SPA fallback: serve index.html for all non-API routes
  app.setNotFoundHandler(async (_request, reply) => {
    return reply.sendFile('index.html');
  });
}

// Initialize scheduler and poll triggers after DB and routes are ready
initScheduler();
initPollTriggers();

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  stopScheduler();
  stopAllPolling();
  await app.close();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

const port = parseInt(process.env['PORT'] ?? '3001', 10);
await app.listen({ port, host: '0.0.0.0' });

console.log(`API server running on http://localhost:${port}`);
