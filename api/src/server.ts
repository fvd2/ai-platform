import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db/index.js';
import { chatRoutes } from './routes/chat.routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

initDb();

await app.register(chatRoutes, { prefix: '/api/chat' });

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

const port = parseInt(process.env['PORT'] ?? '3000', 10);
await app.listen({ port, host: '0.0.0.0' });

console.log(`API server running on http://localhost:${port}`);
