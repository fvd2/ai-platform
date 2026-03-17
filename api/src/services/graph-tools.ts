import { tool } from 'ai';
import { z } from 'zod';
import {
  isConnected,
  getRecentEmails,
  sendEmail,
  getTodayEvents,
  getUpcomingEvents,
  createEvent,
} from './graph.service.js';

export const graphTools = {
  get_emails: tool({
    description:
      'Fetch recent emails from the user\'s Microsoft mailbox. Returns subject, sender, date, preview, and read status.',
    parameters: z.object({
      count: z.number().min(1).max(50).optional().describe('Number of emails to fetch (default 10)'),
      unreadOnly: z.boolean().optional().describe('If true, only return unread emails'),
    }),
    execute: async ({ count, unreadOnly }) => {
      if (!isConnected()) {
        return { error: 'Microsoft account not connected. Ask the user to connect in Settings.' };
      }
      const emails = await getRecentEmails(count ?? 10, unreadOnly ?? false);
      return { emails };
    },
  }),

  send_email: tool({
    description:
      'Send an email from the user\'s Microsoft account. IMPORTANT: Always confirm with the user before sending.',
    parameters: z.object({
      to: z.string().email().describe('Recipient email address'),
      subject: z.string().describe('Email subject line'),
      body: z.string().describe('Email body (HTML supported)'),
    }),
    execute: async ({ to, subject, body }) => {
      if (!isConnected()) {
        return { error: 'Microsoft account not connected. Ask the user to connect in Settings.' };
      }
      await sendEmail(to, subject, body);
      return { sent: true, to, subject };
    },
  }),

  get_calendar: tool({
    description:
      'Get calendar events from the user\'s Microsoft calendar. Can fetch today\'s events or upcoming events for a specified number of days.',
    parameters: z.object({
      scope: z
        .enum(['today', 'upcoming'])
        .describe('Whether to get today\'s events or upcoming events'),
      days: z
        .number()
        .min(1)
        .max(30)
        .optional()
        .describe('Number of days to look ahead (only used with scope "upcoming", default 7)'),
    }),
    execute: async ({ scope, days }) => {
      if (!isConnected()) {
        return { error: 'Microsoft account not connected. Ask the user to connect in Settings.' };
      }
      const events = scope === 'today' ? await getTodayEvents() : await getUpcomingEvents(days ?? 7);
      return { events };
    },
  }),

  create_event: tool({
    description:
      'Create a calendar event in the user\'s Microsoft calendar. Always confirm details with the user before creating.',
    parameters: z.object({
      subject: z.string().describe('Event title/subject'),
      start: z.string().describe('Start date-time in ISO 8601 format (e.g. 2026-03-17T09:00:00)'),
      end: z.string().describe('End date-time in ISO 8601 format (e.g. 2026-03-17T10:00:00)'),
      attendees: z
        .array(z.string().email())
        .optional()
        .describe('List of attendee email addresses'),
      location: z.string().optional().describe('Event location'),
    }),
    execute: async ({ subject, start, end, attendees, location }) => {
      if (!isConnected()) {
        return { error: 'Microsoft account not connected. Ask the user to connect in Settings.' };
      }
      const event = await createEvent(subject, start, end, attendees, location);
      return { created: true, event };
    },
  }),
};
