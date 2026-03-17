export interface GraphStatus {
  connected: boolean;
  email?: string;
}

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

export interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
}

export interface CreateEventRequest {
  subject: string;
  start: string;
  end: string;
  attendees?: string[];
  location?: string;
}
