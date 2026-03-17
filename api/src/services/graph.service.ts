import { randomUUID, createHash, randomBytes } from 'crypto';
import { getDb } from '../db/index.js';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';

const SCOPES = 'Mail.Read Mail.Send Calendars.Read Calendars.ReadWrite offline_access';

// In-memory PKCE store keyed by state parameter
const pkceStore = new Map<string, { codeVerifier: string; createdAt: number }>();

// Clean up old PKCE entries (older than 10 minutes)
function cleanPkceStore(): void {
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [key, value] of pkceStore) {
    if (value.createdAt < tenMinutesAgo) {
      pkceStore.delete(key);
    }
  }
}

function getClientId(): string {
  const id = process.env['MICROSOFT_CLIENT_ID'];
  if (!id) throw new Error('MICROSOFT_CLIENT_ID is not configured');
  return id;
}

function getClientSecret(): string {
  const secret = process.env['MICROSOFT_CLIENT_SECRET'];
  if (!secret) throw new Error('MICROSOFT_CLIENT_SECRET is not configured');
  return secret;
}

function getRedirectUri(): string {
  return process.env['MICROSOFT_REDIRECT_URI'] ?? 'http://localhost:3000/api/graph/auth/callback';
}

// --- PKCE helpers ---

function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

// --- Token types ---

interface OAuthTokenRow {
  id: string;
  provider: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string;
  created_at: string;
  updated_at: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

// --- Email types ---

export interface EmailSummary {
  id: string;
  subject: string;
  from: string;
  receivedDateTime: string;
  bodyPreview: string;
  isRead: boolean;
}

export interface Email {
  id: string;
  subject: string;
  from: string;
  receivedDateTime: string;
  body: string;
  bodyPreview: string;
  isRead: boolean;
  toRecipients: string[];
}

// --- Calendar types ---

export interface CalendarEvent {
  id: string;
  subject: string;
  start: string;
  end: string;
  location: string;
  isAllDay: boolean;
  organizer: string;
  attendees: string[];
}

// --- Graph API response types ---

interface GraphEmailMessage {
  id: string;
  subject: string;
  from?: { emailAddress?: { name?: string; address?: string } };
  receivedDateTime: string;
  bodyPreview: string;
  isRead: boolean;
  body?: { content: string; contentType: string };
  toRecipients?: Array<{ emailAddress?: { name?: string; address?: string } }>;
}

interface GraphCalendarEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName?: string };
  isAllDay: boolean;
  organizer?: { emailAddress?: { name?: string; address?: string } };
  attendees?: Array<{ emailAddress?: { name?: string; address?: string } }>;
}

interface GraphUserProfile {
  mail?: string;
  userPrincipalName?: string;
}

// --- Auth URL generation ---

export function generateAuthUrl(): { url: string; state: string } {
  cleanPkceStore();

  const state = randomUUID();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  pkceStore.set(state, { codeVerifier, createdAt: Date.now() });

  const params = new URLSearchParams({
    client_id: getClientId(),
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return { url: `${AUTH_URL}?${params.toString()}`, state };
}

// --- Token exchange ---

export async function exchangeCodeForTokens(
  code: string,
  state: string,
): Promise<void> {
  const pkceEntry = pkceStore.get(state);
  if (!pkceEntry) {
    throw new Error('Invalid or expired state parameter');
  }

  const body = new URLSearchParams({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    code,
    redirect_uri: getRedirectUri(),
    grant_type: 'authorization_code',
    code_verifier: pkceEntry.codeVerifier,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }

  const tokenData = (await response.json()) as TokenResponse;
  saveToken(tokenData);
  pkceStore.delete(state);
}

// --- Token management ---

export function saveToken(tokenData: TokenResponse): void {
  const db = getDb();
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  // Upsert: delete existing microsoft token then insert new one
  const deleteStmt = db.prepare('DELETE FROM oauth_tokens WHERE provider = ?');
  const insertStmt = db.prepare(
    `INSERT INTO oauth_tokens (id, provider, access_token, refresh_token, expires_at, scope)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );

  const transaction = db.transaction(() => {
    deleteStmt.run('microsoft');
    insertStmt.run(
      randomUUID(),
      'microsoft',
      tokenData.access_token,
      tokenData.refresh_token,
      expiresAt,
      tokenData.scope,
    );
  });

  transaction();
}

function getTokenRow(): OAuthTokenRow | undefined {
  const db = getDb();
  return db
    .prepare('SELECT * FROM oauth_tokens WHERE provider = ? LIMIT 1')
    .get('microsoft') as OAuthTokenRow | undefined;
}

export async function getToken(): Promise<string> {
  const row = getTokenRow();
  if (!row) {
    throw new Error('No Microsoft token found. Please connect your account first.');
  }

  const expiresAt = new Date(row.expires_at).getTime();
  const now = Date.now();

  // Refresh if expired or expiring within 5 minutes
  if (expiresAt - now < 5 * 60 * 1000) {
    return await refreshToken(row.refresh_token);
  }

  return row.access_token;
}

export async function refreshToken(refreshTokenValue: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    refresh_token: refreshTokenValue,
    grant_type: 'refresh_token',
    scope: SCOPES,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
  }

  const tokenData = (await response.json()) as TokenResponse;
  saveToken(tokenData);
  return tokenData.access_token;
}

export function isConnected(): boolean {
  const row = getTokenRow();
  if (!row) return false;
  return new Date(row.expires_at).getTime() > Date.now() || !!row.refresh_token;
}

export function disconnect(): void {
  const db = getDb();
  db.prepare('DELETE FROM oauth_tokens WHERE provider = ?').run('microsoft');
}

// --- Graph API fetch with auto-retry on 401 ---

async function graphFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await getToken();

  const response = await fetch(`${GRAPH_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // On 401, try refreshing and retrying once
  if (response.status === 401) {
    const row = getTokenRow();
    if (row?.refresh_token) {
      const newToken = await refreshToken(row.refresh_token);
      return fetch(`${GRAPH_BASE_URL}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${newToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    }
  }

  return response;
}

async function graphGet<T>(path: string): Promise<T> {
  const response = await graphFetch(path);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Graph API GET ${path} failed: ${response.status} ${errorText}`);
  }
  return (await response.json()) as T;
}

async function graphPost<T>(path: string, body: unknown): Promise<T> {
  const response = await graphFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Graph API POST ${path} failed: ${response.status} ${errorText}`);
  }
  // Some POST endpoints return 202 with no body
  if (response.status === 202 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }
  return (await response.json()) as T;
}

// --- User profile ---

export async function getUserEmail(): Promise<string | undefined> {
  try {
    const profile = await graphGet<GraphUserProfile>('/me');
    return profile.mail ?? profile.userPrincipalName;
  } catch {
    return undefined;
  }
}

// --- Email operations ---

export async function getRecentEmails(
  count = 10,
  unreadOnly = false,
): Promise<EmailSummary[]> {
  let path = `/me/messages?$top=${count}&$select=id,subject,from,receivedDateTime,bodyPreview,isRead&$orderby=receivedDateTime desc`;
  if (unreadOnly) {
    path += `&$filter=isRead eq false`;
  }

  const data = await graphGet<{ value: GraphEmailMessage[] }>(path);

  return data.value.map((msg) => ({
    id: msg.id,
    subject: msg.subject,
    from: msg.from?.emailAddress?.address ?? 'unknown',
    receivedDateTime: msg.receivedDateTime,
    bodyPreview: msg.bodyPreview,
    isRead: msg.isRead,
  }));
}

export async function getEmail(id: string): Promise<Email> {
  const msg = await graphGet<GraphEmailMessage>(
    `/me/messages/${id}?$select=id,subject,from,receivedDateTime,body,bodyPreview,isRead,toRecipients`,
  );

  return {
    id: msg.id,
    subject: msg.subject,
    from: msg.from?.emailAddress?.address ?? 'unknown',
    receivedDateTime: msg.receivedDateTime,
    body: msg.body?.content ?? '',
    bodyPreview: msg.bodyPreview,
    isRead: msg.isRead,
    toRecipients: (msg.toRecipients ?? []).map(
      (r) => r.emailAddress?.address ?? 'unknown',
    ),
  };
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  await graphPost('/me/sendMail', {
    message: {
      subject,
      body: { contentType: 'HTML', content: body },
      toRecipients: [{ emailAddress: { address: to } }],
    },
  });
}

export async function replyToEmail(
  messageId: string,
  body: string,
): Promise<void> {
  await graphPost(`/me/messages/${messageId}/reply`, {
    comment: body,
  });
}

// --- Calendar operations ---

export async function getTodayEvents(): Promise<CalendarEvent[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  return getCalendarEvents(startOfDay, endOfDay);
}

export async function getUpcomingEvents(days = 7): Promise<CalendarEvent[]> {
  const now = new Date();
  const startDateTime = now.toISOString();
  const endDateTime = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  return getCalendarEvents(startDateTime, endDateTime);
}

async function getCalendarEvents(
  startDateTime: string,
  endDateTime: string,
): Promise<CalendarEvent[]> {
  const path = `/me/calendarview?startDateTime=${encodeURIComponent(startDateTime)}&endDateTime=${encodeURIComponent(endDateTime)}&$select=id,subject,start,end,location,isAllDay,organizer,attendees&$orderby=start/dateTime`;

  const data = await graphGet<{ value: GraphCalendarEvent[] }>(path);

  return data.value.map((evt) => ({
    id: evt.id,
    subject: evt.subject,
    start: evt.start.dateTime,
    end: evt.end.dateTime,
    location: evt.location?.displayName ?? '',
    isAllDay: evt.isAllDay,
    organizer: evt.organizer?.emailAddress?.address ?? 'unknown',
    attendees: (evt.attendees ?? []).map(
      (a) => a.emailAddress?.address ?? 'unknown',
    ),
  }));
}

export async function createEvent(
  subject: string,
  start: string,
  end: string,
  attendees?: string[],
  location?: string,
): Promise<CalendarEvent> {
  const eventBody: Record<string, unknown> = {
    subject,
    start: { dateTime: start, timeZone: 'UTC' },
    end: { dateTime: end, timeZone: 'UTC' },
  };

  if (location) {
    eventBody['location'] = { displayName: location };
  }

  if (attendees && attendees.length > 0) {
    eventBody['attendees'] = attendees.map((email) => ({
      emailAddress: { address: email },
      type: 'required',
    }));
  }

  const evt = await graphPost<GraphCalendarEvent>('/me/events', eventBody);

  return {
    id: evt.id,
    subject: evt.subject,
    start: evt.start.dateTime,
    end: evt.end.dateTime,
    location: evt.location?.displayName ?? '',
    isAllDay: evt.isAllDay,
    organizer: evt.organizer?.emailAddress?.address ?? 'unknown',
    attendees: (evt.attendees ?? []).map(
      (a) => a.emailAddress?.address ?? 'unknown',
    ),
  };
}

// --- Exported for testing ---
export { pkceStore, generateCodeVerifier, generateCodeChallenge };
