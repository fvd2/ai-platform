export type TaskStatus = 'active' | 'paused';
export type RunStatus = 'running' | 'success' | 'error';

export interface Task {
  id: string;
  name: string;
  prompt: string;
  schedule: string;
  scheduleDescription: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRun {
  id: string;
  taskId: string;
  status: RunStatus;
  output: string | null;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
  tokenUsage: number | null;
}
