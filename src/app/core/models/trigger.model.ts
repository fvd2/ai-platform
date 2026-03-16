export type TriggerType = 'webhook' | 'poll' | 'manual';
export type TriggerStatus = 'active' | 'paused';

export interface Trigger {
  id: string;
  name: string;
  type: TriggerType;
  prompt: string;
  config: TriggerConfig;
  status: TriggerStatus;
  runCount: number;
  lastFiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TriggerConfig = WebhookConfig | PollConfig | ManualConfig;

export interface WebhookConfig {
  webhookUrl?: string;
  filter?: string;
}

export interface PollConfig {
  url: string;
  interval: number;
  condition: string;
}

export interface ManualConfig {}

export interface TriggerRun {
  id: string;
  triggerId: string;
  status: 'running' | 'success' | 'error';
  eventSummary: string;
  output: string | null;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}
