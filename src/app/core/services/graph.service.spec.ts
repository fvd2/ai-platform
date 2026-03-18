import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { GraphService } from './graph.service';
import { ApiService } from './api.service';
import type { GraphStatus, EmailSummary, Email, CalendarEvent } from '../models/graph.model';

const mockStatus: GraphStatus = {
  connected: true,
  email: 'user@example.com',
};

const mockEmailSummary: EmailSummary = {
  id: 'msg-1',
  subject: 'Test Email',
  from: 'sender@test.com',
  receivedDateTime: '2026-03-17T10:00:00Z',
  bodyPreview: 'Preview text',
  isRead: false,
};

const mockEmail: Email = {
  id: 'msg-1',
  subject: 'Test Email',
  from: 'sender@test.com',
  receivedDateTime: '2026-03-17T10:00:00Z',
  body: '<p>Full body</p>',
  bodyPreview: 'Preview text',
  isRead: false,
  toRecipients: ['me@test.com'],
};

const mockEvent: CalendarEvent = {
  id: 'evt-1',
  subject: 'Meeting',
  start: '2026-03-17T09:00:00',
  end: '2026-03-17T10:00:00',
  location: 'Room A',
  isAllDay: false,
  organizer: 'org@test.com',
  attendees: ['attendee@test.com'],
};

describe('GraphService', () => {
  let service: GraphService;
  let apiService: ApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GraphService, ApiService],
    });
    service = TestBed.inject(GraphService);
    apiService = TestBed.inject(ApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with disconnected state', () => {
    expect(service.connected()).toBe(false);
    expect(service.userEmail()).toBeNull();
    expect(service.emails()).toEqual([]);
    expect(service.events()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  describe('getStatus', () => {
    it('should update connected and email signals', async () => {
      vi.spyOn(apiService, 'get').mockResolvedValue(mockStatus);

      const result = await service.getStatus();

      expect(result).toEqual(mockStatus);
      expect(service.connected()).toBe(true);
      expect(service.userEmail()).toBe('user@example.com');
      expect(apiService.get).toHaveBeenCalledWith('/graph/status');
    });

    it('should set not connected when status is false', async () => {
      vi.spyOn(apiService, 'get').mockResolvedValue({ connected: false });

      await service.getStatus();

      expect(service.connected()).toBe(false);
      expect(service.userEmail()).toBeNull();
    });
  });

  describe('getAuthUrl', () => {
    it('should return auth URL', async () => {
      vi.spyOn(apiService, 'get').mockResolvedValue({ url: 'https://login.microsoft.com/auth' });

      const url = await service.getAuthUrl();

      expect(url).toBe('https://login.microsoft.com/auth');
      expect(apiService.get).toHaveBeenCalledWith('/graph/auth/url');
    });
  });

  describe('disconnect', () => {
    it('should clear all signals', async () => {
      // First connect
      vi.spyOn(apiService, 'get').mockResolvedValue(mockStatus);
      await service.getStatus();
      expect(service.connected()).toBe(true);

      // Then disconnect
      vi.spyOn(apiService, 'delete').mockResolvedValue(undefined);
      await service.disconnect();

      expect(service.connected()).toBe(false);
      expect(service.userEmail()).toBeNull();
      expect(service.emails()).toEqual([]);
      expect(service.events()).toEqual([]);
      expect(apiService.delete).toHaveBeenCalledWith('/graph/auth');
    });
  });

  describe('getEmails', () => {
    it('should fetch emails and update signal', async () => {
      vi.spyOn(apiService, 'get').mockResolvedValue([mockEmailSummary]);

      const result = await service.getEmails(10, true);

      expect(result).toEqual([mockEmailSummary]);
      expect(service.emails()).toEqual([mockEmailSummary]);
      expect(apiService.get).toHaveBeenCalledWith('/graph/emails?count=10&unreadOnly=true');
    });

    it('should set loading during fetch', async () => {
      let loadingDuringFetch = false;
      vi.spyOn(apiService, 'get').mockImplementation(async () => {
        loadingDuringFetch = service.loading();
        return [];
      });

      await service.getEmails();

      expect(loadingDuringFetch).toBe(true);
      expect(service.loading()).toBe(false);
    });
  });

  describe('getEmail', () => {
    it('should fetch a single email', async () => {
      vi.spyOn(apiService, 'get').mockResolvedValue(mockEmail);

      const result = await service.getEmail('msg-1');

      expect(result).toEqual(mockEmail);
      expect(apiService.get).toHaveBeenCalledWith('/graph/emails/msg-1');
    });
  });

  describe('sendEmail', () => {
    it('should send email via API', async () => {
      vi.spyOn(apiService, 'post').mockResolvedValue(undefined);

      await service.sendEmail({ to: 'to@test.com', subject: 'Hi', body: 'Body' });

      expect(apiService.post).toHaveBeenCalledWith('/graph/emails/send', {
        to: 'to@test.com',
        subject: 'Hi',
        body: 'Body',
      });
    });
  });

  describe('replyToEmail', () => {
    it('should reply to email via API', async () => {
      vi.spyOn(apiService, 'post').mockResolvedValue(undefined);

      await service.replyToEmail('msg-1', 'Reply text');

      expect(apiService.post).toHaveBeenCalledWith('/graph/emails/msg-1/reply', {
        body: 'Reply text',
      });
    });
  });

  describe('getTodayEvents', () => {
    it('should fetch today events and update signal', async () => {
      vi.spyOn(apiService, 'get').mockResolvedValue([mockEvent]);

      const result = await service.getTodayEvents();

      expect(result).toEqual([mockEvent]);
      expect(service.events()).toEqual([mockEvent]);
      expect(apiService.get).toHaveBeenCalledWith('/graph/calendar/today');
    });
  });

  describe('getUpcomingEvents', () => {
    it('should fetch upcoming events with custom days', async () => {
      vi.spyOn(apiService, 'get').mockResolvedValue([mockEvent]);

      const result = await service.getUpcomingEvents(14);

      expect(result).toEqual([mockEvent]);
      expect(apiService.get).toHaveBeenCalledWith('/graph/calendar/upcoming?days=14');
    });
  });

  describe('createEvent', () => {
    it('should create event via API', async () => {
      vi.spyOn(apiService, 'post').mockResolvedValue(mockEvent);

      const result = await service.createEvent({
        subject: 'Meeting',
        start: '2026-03-17T09:00:00',
        end: '2026-03-17T10:00:00',
        attendees: ['attendee@test.com'],
        location: 'Room A',
      });

      expect(result).toEqual(mockEvent);
      expect(apiService.post).toHaveBeenCalledWith('/graph/calendar/events', {
        subject: 'Meeting',
        start: '2026-03-17T09:00:00',
        end: '2026-03-17T10:00:00',
        attendees: ['attendee@test.com'],
        location: 'Room A',
      });
    });
  });
});
