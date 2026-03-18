import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import type {
  GraphStatus,
  EmailSummary,
  Email,
  CalendarEvent,
  SendEmailRequest,
  CreateEventRequest,
} from '../models/graph.model';

@Injectable({ providedIn: 'root' })
export class GraphService {
  private readonly api = inject(ApiService);

  readonly connected = signal(false);
  readonly userEmail = signal<string | null>(null);
  readonly emails = signal<EmailSummary[]>([]);
  readonly events = signal<CalendarEvent[]>([]);
  readonly loading = signal(false);

  async getStatus(): Promise<GraphStatus> {
    const status = await this.api.get<GraphStatus>('/graph/status');
    this.connected.set(status.connected);
    this.userEmail.set(status.email ?? null);
    return status;
  }

  async getAuthUrl(): Promise<string> {
    const data = await this.api.get<{ url: string }>('/graph/auth/url');
    return data.url;
  }

  async disconnect(): Promise<void> {
    await this.api.delete('/graph/auth');
    this.connected.set(false);
    this.userEmail.set(null);
    this.emails.set([]);
    this.events.set([]);
  }

  async getEmails(count = 10, unreadOnly = false): Promise<EmailSummary[]> {
    this.loading.set(true);
    try {
      const data = await this.api.get<EmailSummary[]>(
        `/graph/emails?count=${count}&unreadOnly=${unreadOnly}`,
      );
      this.emails.set(data);
      return data;
    } finally {
      this.loading.set(false);
    }
  }

  async getEmail(id: string): Promise<Email> {
    return this.api.get<Email>(`/graph/emails/${id}`);
  }

  async sendEmail(request: SendEmailRequest): Promise<void> {
    await this.api.post('/graph/emails/send', request);
  }

  async replyToEmail(messageId: string, body: string): Promise<void> {
    await this.api.post(`/graph/emails/${messageId}/reply`, { body });
  }

  async getTodayEvents(): Promise<CalendarEvent[]> {
    this.loading.set(true);
    try {
      const data = await this.api.get<CalendarEvent[]>('/graph/calendar/today');
      this.events.set(data);
      return data;
    } finally {
      this.loading.set(false);
    }
  }

  async getUpcomingEvents(days = 7): Promise<CalendarEvent[]> {
    this.loading.set(true);
    try {
      const data = await this.api.get<CalendarEvent[]>(`/graph/calendar/upcoming?days=${days}`);
      this.events.set(data);
      return data;
    } finally {
      this.loading.set(false);
    }
  }

  async createEvent(request: CreateEventRequest): Promise<CalendarEvent> {
    return this.api.post<CalendarEvent>('/graph/calendar/events', request);
  }
}
