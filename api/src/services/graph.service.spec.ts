import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';

let db: Database.Database;

vi.mock('../db/index.js', () => ({
  getDb: () => db,
  initDb: () => db,
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Set env vars before importing
process.env['MICROSOFT_CLIENT_ID'] = 'test-client-id';
process.env['MICROSOFT_CLIENT_SECRET'] = 'test-client-secret';
process.env['MICROSOFT_REDIRECT_URI'] = 'http://localhost:3000/api/graph/auth/callback';

import {
  generateAuthUrl,
  exchangeCodeForTokens,
  saveToken,
  getToken,
  refreshToken,
  isConnected,
  disconnect,
  getRecentEmails,
  getEmail,
  sendEmail,
  replyToEmail,
  getTodayEvents,
  getUpcomingEvents,
  createEvent,
  getUserEmail,
  pkceStore,
  generateCodeVerifier,
  generateCodeChallenge,
} from './graph.service.js';

function setupDb(): void {
  db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'microsoft',
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      scope TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function insertToken(
  accessToken = 'test-access-token',
  refreshTokenVal = 'test-refresh-token',
  expiresAt?: string,
): void {
  const expires = expiresAt ?? new Date(Date.now() + 3600 * 1000).toISOString();
  db.prepare(
    `INSERT INTO oauth_tokens (id, provider, access_token, refresh_token, expires_at, scope)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run('token-1', 'microsoft', accessToken, refreshTokenVal, expires, 'Mail.Read');
}

describe('GraphService', () => {
  beforeEach(() => {
    setupDb();
    mockFetch.mockReset();
    pkceStore.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PKCE helpers', () => {
    it('should generate a code verifier of proper length', () => {
      const verifier = generateCodeVerifier();
      expect(verifier.length).toBeGreaterThan(30);
    });

    it('should generate a code challenge that differs from verifier', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      expect(challenge).not.toBe(verifier);
      expect(challenge.length).toBeGreaterThan(0);
    });
  });

  describe('generateAuthUrl', () => {
    it('should return a URL with correct parameters', () => {
      const { url, state } = generateAuthUrl();

      expect(state).toBeTruthy();
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('response_type=code');
      expect(url).toContain('code_challenge=');
      expect(url).toContain('code_challenge_method=S256');
      expect(url).toContain('login.microsoftonline.com');
    });

    it('should store PKCE verifier keyed by state', () => {
      const { state } = generateAuthUrl();
      expect(pkceStore.has(state)).toBe(true);
      expect(pkceStore.get(state)?.codeVerifier).toBeTruthy();
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens and save them', async () => {
      const { state } = generateAuthUrl();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600,
          scope: 'Mail.Read',
          token_type: 'Bearer',
        }),
      });

      await exchangeCodeForTokens('auth-code', state);

      const row = db
        .prepare('SELECT * FROM oauth_tokens WHERE provider = ?')
        .get('microsoft') as Record<string, unknown>;
      expect(row).toBeDefined();
      expect(row['access_token']).toBe('new-access');
      expect(row['refresh_token']).toBe('new-refresh');
    });

    it('should throw on invalid state', async () => {
      await expect(exchangeCodeForTokens('code', 'bad-state')).rejects.toThrow(
        'Invalid or expired state parameter',
      );
    });

    it('should throw on failed token exchange', async () => {
      const { state } = generateAuthUrl();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      });

      await expect(exchangeCodeForTokens('code', state)).rejects.toThrow(
        'Token exchange failed',
      );
    });
  });

  describe('saveToken', () => {
    it('should insert a new token row', () => {
      saveToken({
        access_token: 'at',
        refresh_token: 'rt',
        expires_in: 3600,
        scope: 'Mail.Read',
        token_type: 'Bearer',
      });

      const row = db
        .prepare('SELECT * FROM oauth_tokens WHERE provider = ?')
        .get('microsoft') as Record<string, unknown>;
      expect(row).toBeDefined();
      expect(row['access_token']).toBe('at');
    });

    it('should replace existing token on re-save', () => {
      insertToken('old-token', 'old-refresh');

      saveToken({
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        expires_in: 3600,
        scope: 'Mail.Read',
        token_type: 'Bearer',
      });

      const rows = db
        .prepare('SELECT * FROM oauth_tokens WHERE provider = ?')
        .all('microsoft');
      expect(rows).toHaveLength(1);
      expect((rows[0] as Record<string, unknown>)['access_token']).toBe('new-token');
    });
  });

  describe('getToken', () => {
    it('should return access token when not expired', async () => {
      insertToken('valid-token');
      const token = await getToken();
      expect(token).toBe('valid-token');
    });

    it('should refresh token when expired', async () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      insertToken('expired-token', 'refresh-me', pastDate);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'refreshed-token',
          refresh_token: 'new-refresh',
          expires_in: 3600,
          scope: 'Mail.Read',
          token_type: 'Bearer',
        }),
      });

      const token = await getToken();
      expect(token).toBe('refreshed-token');
    });

    it('should throw when no token exists', async () => {
      await expect(getToken()).rejects.toThrow('No Microsoft token found');
    });
  });

  describe('refreshToken', () => {
    it('should call token endpoint and save new tokens', async () => {
      insertToken();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'refreshed',
          refresh_token: 'new-rt',
          expires_in: 3600,
          scope: 'Mail.Read',
          token_type: 'Bearer',
        }),
      });

      const token = await refreshToken('old-rt');
      expect(token).toBe('refreshed');
      expect(mockFetch).toHaveBeenCalledOnce();
    });
  });

  describe('isConnected', () => {
    it('should return false when no tokens', () => {
      expect(isConnected()).toBe(false);
    });

    it('should return true when token exists with refresh token', () => {
      insertToken();
      expect(isConnected()).toBe(true);
    });

    it('should return true even if expired but has refresh token', () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      insertToken('expired', 'refresh', pastDate);
      expect(isConnected()).toBe(true);
    });
  });

  describe('disconnect', () => {
    it('should remove all microsoft tokens', () => {
      insertToken();
      expect(isConnected()).toBe(true);
      disconnect();
      expect(isConnected()).toBe(false);
    });
  });

  describe('getUserEmail', () => {
    it('should return email from Graph API', async () => {
      insertToken();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mail: 'user@example.com', userPrincipalName: 'user@example.com' }),
      });

      const email = await getUserEmail();
      expect(email).toBe('user@example.com');
    });

    it('should return undefined on error', async () => {
      insertToken();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
        headers: new Map(),
      });
      // 401 retry path - mock the retry too
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const email = await getUserEmail();
      expect(email).toBeUndefined();
    });
  });

  describe('getRecentEmails', () => {
    it('should fetch and map emails', async () => {
      insertToken();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [
            {
              id: 'msg-1',
              subject: 'Test Email',
              from: { emailAddress: { name: 'Sender', address: 'sender@test.com' } },
              receivedDateTime: '2026-03-17T10:00:00Z',
              bodyPreview: 'Hello world',
              isRead: false,
            },
          ],
        }),
      });

      const emails = await getRecentEmails(10, false);
      expect(emails).toHaveLength(1);
      expect(emails[0].subject).toBe('Test Email');
      expect(emails[0].from).toBe('sender@test.com');
      expect(emails[0].isRead).toBe(false);
    });
  });

  describe('getEmail', () => {
    it('should fetch and map a full email', async () => {
      insertToken();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'msg-1',
          subject: 'Full Email',
          from: { emailAddress: { address: 'sender@test.com' } },
          receivedDateTime: '2026-03-17T10:00:00Z',
          body: { content: '<p>Body</p>', contentType: 'HTML' },
          bodyPreview: 'Body',
          isRead: true,
          toRecipients: [{ emailAddress: { address: 'me@test.com' } }],
        }),
      });

      const email = await getEmail('msg-1');
      expect(email.subject).toBe('Full Email');
      expect(email.body).toBe('<p>Body</p>');
      expect(email.toRecipients).toEqual(['me@test.com']);
    });
  });

  describe('sendEmail', () => {
    it('should POST to sendMail endpoint', async () => {
      insertToken();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
        headers: new Headers({ 'content-length': '0' }),
        json: async () => undefined,
      });

      await sendEmail('to@test.com', 'Subject', '<p>Body</p>');

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/me/sendMail');
      expect(options.method).toBe('POST');
    });
  });

  describe('replyToEmail', () => {
    it('should POST to reply endpoint', async () => {
      insertToken();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
        headers: new Headers({ 'content-length': '0' }),
        json: async () => undefined,
      });

      await replyToEmail('msg-1', 'Reply body');

      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain('/me/messages/msg-1/reply');
    });
  });

  describe('getTodayEvents', () => {
    it('should fetch today calendar events', async () => {
      insertToken();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [
            {
              id: 'evt-1',
              subject: 'Meeting',
              start: { dateTime: '2026-03-17T09:00:00', timeZone: 'UTC' },
              end: { dateTime: '2026-03-17T10:00:00', timeZone: 'UTC' },
              location: { displayName: 'Room A' },
              isAllDay: false,
              organizer: { emailAddress: { address: 'org@test.com' } },
              attendees: [],
            },
          ],
        }),
      });

      const events = await getTodayEvents();
      expect(events).toHaveLength(1);
      expect(events[0].subject).toBe('Meeting');
      expect(events[0].location).toBe('Room A');
    });
  });

  describe('getUpcomingEvents', () => {
    it('should fetch upcoming events for given days', async () => {
      insertToken();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: [] }),
      });

      const events = await getUpcomingEvents(3);
      expect(events).toEqual([]);

      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain('calendarview');
    });
  });

  describe('createEvent', () => {
    it('should create a calendar event', async () => {
      insertToken();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-length': '500' }),
        json: async () => ({
          id: 'new-evt',
          subject: 'New Event',
          start: { dateTime: '2026-03-18T14:00:00', timeZone: 'UTC' },
          end: { dateTime: '2026-03-18T15:00:00', timeZone: 'UTC' },
          location: { displayName: '' },
          isAllDay: false,
          organizer: { emailAddress: { address: 'me@test.com' } },
          attendees: [{ emailAddress: { address: 'other@test.com' } }],
        }),
      });

      const event = await createEvent(
        'New Event',
        '2026-03-18T14:00:00',
        '2026-03-18T15:00:00',
        ['other@test.com'],
      );

      expect(event.id).toBe('new-evt');
      expect(event.subject).toBe('New Event');
      expect(event.attendees).toEqual(['other@test.com']);
    });
  });

  describe('401 retry logic', () => {
    it('should retry once on 401 with refresh token', async () => {
      insertToken('expired-access', 'valid-refresh');

      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      // Refresh token call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600,
          scope: 'Mail.Read',
          token_type: 'Bearer',
        }),
      });

      // Retry call with new token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mail: 'user@test.com' }),
      });

      const email = await getUserEmail();
      expect(email).toBe('user@test.com');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});
