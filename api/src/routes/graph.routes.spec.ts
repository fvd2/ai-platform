import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { graphRoutes } from './graph.routes.js';

// Mock graph service
vi.mock('../services/graph.service.js', () => ({
  generateAuthUrl: vi.fn(() => ({
    url: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?mock=true',
    state: 'mock-state',
  })),
  exchangeCodeForTokens: vi.fn(async () => undefined),
  isConnected: vi.fn(() => false),
  disconnect: vi.fn(),
  getUserEmail: vi.fn(async () => undefined),
  getRecentEmails: vi.fn(async () => []),
  getEmail: vi.fn(async () => ({
    id: 'msg-1',
    subject: 'Test',
    from: 'a@b.com',
    receivedDateTime: '2026-03-17T10:00:00Z',
    body: '<p>Body</p>',
    bodyPreview: 'Body',
    isRead: true,
    toRecipients: ['c@d.com'],
  })),
  sendEmail: vi.fn(async () => undefined),
  replyToEmail: vi.fn(async () => undefined),
  getTodayEvents: vi.fn(async () => []),
  getUpcomingEvents: vi.fn(async () => []),
  createEvent: vi.fn(async () => ({
    id: 'evt-1',
    subject: 'Event',
    start: '2026-03-18T09:00:00',
    end: '2026-03-18T10:00:00',
    location: '',
    isAllDay: false,
    organizer: 'me@test.com',
    attendees: [],
  })),
}));

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

const mockedIsConnected = vi.mocked(isConnected);
const mockedGetUserEmail = vi.mocked(getUserEmail);
const mockedExchangeCode = vi.mocked(exchangeCodeForTokens);
const mockedGetRecentEmails = vi.mocked(getRecentEmails);

async function buildApp() {
  const app = Fastify();
  await app.register(graphRoutes, { prefix: '/api/graph' });
  return app;
}

describe('Graph Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/graph/auth/url', () => {
    it('should return auth URL', async () => {
      const app = await buildApp();
      const res = await app.inject({ method: 'GET', url: '/api/graph/auth/url' });

      expect(res.statusCode).toBe(200);
      const body = res.json() as { url: string };
      expect(body.url).toContain('login.microsoftonline.com');
    });
  });

  describe('GET /api/graph/auth/callback', () => {
    it('should redirect to settings on success', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/graph/auth/callback?code=test-code&state=test-state',
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toContain('/settings?microsoft=connected');
      expect(mockedExchangeCode).toHaveBeenCalledWith('test-code', 'test-state');
    });

    it('should redirect with error on OAuth error', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/graph/auth/callback?error=access_denied',
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toContain('error=access_denied');
    });

    it('should redirect with error on missing params', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/graph/auth/callback',
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toContain('error=missing_params');
    });

    it('should redirect with error on exchange failure', async () => {
      mockedExchangeCode.mockRejectedValueOnce(new Error('Exchange failed'));

      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/graph/auth/callback?code=bad&state=bad',
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toContain('error=');
    });
  });

  describe('GET /api/graph/status', () => {
    it('should return not connected when no token', async () => {
      mockedIsConnected.mockReturnValue(false);
      const app = await buildApp();
      const res = await app.inject({ method: 'GET', url: '/api/graph/status' });

      expect(res.statusCode).toBe(200);
      const body = res.json() as { connected: boolean };
      expect(body.connected).toBe(false);
    });

    it('should return connected with email when token exists', async () => {
      mockedIsConnected.mockReturnValue(true);
      mockedGetUserEmail.mockResolvedValue('user@test.com');

      const app = await buildApp();
      const res = await app.inject({ method: 'GET', url: '/api/graph/status' });

      expect(res.statusCode).toBe(200);
      const body = res.json() as { connected: boolean; email?: string };
      expect(body.connected).toBe(true);
      expect(body.email).toBe('user@test.com');
    });
  });

  describe('DELETE /api/graph/auth', () => {
    it('should disconnect and return 204', async () => {
      const app = await buildApp();
      const res = await app.inject({ method: 'DELETE', url: '/api/graph/auth' });

      expect(res.statusCode).toBe(204);
      expect(disconnect).toHaveBeenCalled();
    });
  });

  describe('GET /api/graph/emails', () => {
    it('should return emails with default params', async () => {
      mockedGetRecentEmails.mockResolvedValue([]);
      const app = await buildApp();
      const res = await app.inject({ method: 'GET', url: '/api/graph/emails' });

      expect(res.statusCode).toBe(200);
      expect(getRecentEmails).toHaveBeenCalledWith(10, false);
    });

    it('should pass query params', async () => {
      mockedGetRecentEmails.mockResolvedValue([]);
      const app = await buildApp();
      await app.inject({ method: 'GET', url: '/api/graph/emails?count=5&unreadOnly=true' });

      expect(getRecentEmails).toHaveBeenCalledWith(5, true);
    });
  });

  describe('GET /api/graph/emails/:id', () => {
    it('should return full email', async () => {
      const app = await buildApp();
      const res = await app.inject({ method: 'GET', url: '/api/graph/emails/msg-1' });

      expect(res.statusCode).toBe(200);
      expect(getEmail).toHaveBeenCalledWith('msg-1');
    });
  });

  describe('POST /api/graph/emails/send', () => {
    it('should send email and return 202', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/graph/emails/send',
        payload: { to: 'a@b.com', subject: 'Hi', body: 'Body' },
      });

      expect(res.statusCode).toBe(202);
      expect(sendEmail).toHaveBeenCalledWith('a@b.com', 'Hi', 'Body');
    });
  });

  describe('POST /api/graph/emails/:id/reply', () => {
    it('should reply to email', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/graph/emails/msg-1/reply',
        payload: { body: 'Reply text' },
      });

      expect(res.statusCode).toBe(202);
      expect(replyToEmail).toHaveBeenCalledWith('msg-1', 'Reply text');
    });
  });

  describe('GET /api/graph/calendar/today', () => {
    it('should return today events', async () => {
      const app = await buildApp();
      const res = await app.inject({ method: 'GET', url: '/api/graph/calendar/today' });

      expect(res.statusCode).toBe(200);
      expect(getTodayEvents).toHaveBeenCalled();
    });
  });

  describe('GET /api/graph/calendar/upcoming', () => {
    it('should return upcoming events with default days', async () => {
      const app = await buildApp();
      await app.inject({ method: 'GET', url: '/api/graph/calendar/upcoming' });

      expect(getUpcomingEvents).toHaveBeenCalledWith(7);
    });

    it('should use custom days param', async () => {
      const app = await buildApp();
      await app.inject({ method: 'GET', url: '/api/graph/calendar/upcoming?days=14' });

      expect(getUpcomingEvents).toHaveBeenCalledWith(14);
    });
  });

  describe('POST /api/graph/calendar/events', () => {
    it('should create event and return 201', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/graph/calendar/events',
        payload: {
          subject: 'Team Meeting',
          start: '2026-03-18T09:00:00',
          end: '2026-03-18T10:00:00',
          attendees: ['a@b.com'],
          location: 'Room A',
        },
      });

      expect(res.statusCode).toBe(201);
      expect(createEvent).toHaveBeenCalledWith(
        'Team Meeting',
        '2026-03-18T09:00:00',
        '2026-03-18T10:00:00',
        ['a@b.com'],
        'Room A',
      );
    });
  });
});
