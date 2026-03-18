import { FastifyPluginAsync } from 'fastify';
import {
  generateAuthUrl,
  exchangeCodeForTokens,
  isConnected,
  disconnect,
  getUserEmail,
  getRecentEmails,
  getEmail,
  sendEmail,
  replyToEmail,
  getTodayEvents,
  getUpcomingEvents,
  createEvent,
} from '../services/graph.service.js';

export const graphRoutes: FastifyPluginAsync = async (fastify) => {
  // Generate OAuth authorization URL
  fastify.get('/auth/url', async () => {
    const { url } = generateAuthUrl();
    return { url };
  });

  // Handle OAuth callback
  fastify.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    '/auth/callback',
    async (request, reply) => {
      const { code, state, error } = request.query;

      if (error) {
        return reply.redirect(`/settings?error=${encodeURIComponent(error)}`);
      }

      if (!code || !state) {
        return reply.redirect('/settings?error=missing_params');
      }

      try {
        await exchangeCodeForTokens(code, state);
        return reply.redirect('/settings?microsoft=connected');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        fastify.log.error(err, 'OAuth callback error');
        return reply.redirect(`/settings?error=${encodeURIComponent(msg)}`);
      }
    },
  );

  // Check connection status
  fastify.get('/status', async () => {
    const connected = isConnected();
    if (!connected) {
      return { connected: false };
    }

    const email = await getUserEmail();
    return { connected: true, email };
  });

  // Disconnect Microsoft account
  fastify.delete('/auth', async (_request, reply) => {
    disconnect();
    reply.status(204).send();
  });

  // List recent emails
  fastify.get<{ Querystring: { count?: string; unreadOnly?: string } }>(
    '/emails',
    async (request) => {
      const count = parseInt(request.query.count ?? '10', 10);
      const unreadOnly = request.query.unreadOnly === 'true';
      return getRecentEmails(count, unreadOnly);
    },
  );

  // Get full email by ID
  fastify.get<{ Params: { id: string } }>('/emails/:id', async (request) => {
    return getEmail(request.params.id);
  });

  // Send email
  fastify.post<{ Body: { to: string; subject: string; body: string } }>(
    '/emails/send',
    async (request, reply) => {
      const { to, subject, body } = request.body;
      await sendEmail(to, subject, body);
      reply.status(202).send({ sent: true });
    },
  );

  // Reply to email
  fastify.post<{ Params: { id: string }; Body: { body: string } }>(
    '/emails/:id/reply',
    async (request, reply) => {
      const { body } = request.body;
      await replyToEmail(request.params.id, body);
      reply.status(202).send({ sent: true });
    },
  );

  // Get today's calendar events
  fastify.get('/calendar/today', async () => {
    return getTodayEvents();
  });

  // Get upcoming events
  fastify.get<{ Querystring: { days?: string } }>('/calendar/upcoming', async (request) => {
    const days = parseInt(request.query.days ?? '7', 10);
    return getUpcomingEvents(days);
  });

  // Create calendar event
  fastify.post<{
    Body: {
      subject: string;
      start: string;
      end: string;
      attendees?: string[];
      location?: string;
    };
  }>('/calendar/events', async (request, reply) => {
    const { subject, start, end, attendees, location } = request.body;
    const event = await createEvent(subject, start, end, attendees, location);
    reply.status(201).send(event);
  });
};
