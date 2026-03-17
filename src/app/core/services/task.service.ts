import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { Task, TaskRun } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly api = inject(ApiService);

  readonly tasks = signal<Task[]>([]);
  readonly activeTask = signal<Task | null>(null);
  readonly runs = signal<TaskRun[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly hasActiveTask = computed(() => this.activeTask() !== null);
  readonly activeTasks = computed(() => this.tasks().filter((t) => t.status === 'active'));
  readonly pausedTasks = computed(() => this.tasks().filter((t) => t.status === 'paused'));

  async loadTasks(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.api.get<Task[]>('/tasks');
      this.tasks.set(data);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async createTask(data: {
    name: string;
    prompt: string;
    schedule: string;
    scheduleDescription: string;
  }): Promise<void> {
    this.loading.set(true);
    try {
      await this.api.post<Task>('/tasks', data);
      await this.loadTasks();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async selectTask(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const task = await this.api.get<Task>(`/tasks/${id}`);
      this.activeTask.set(task);
      await this.loadRuns(id);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async updateTask(id: string, data: Partial<Task>): Promise<void> {
    this.loading.set(true);
    try {
      await this.api.put<Task>(`/tasks/${id}`, data);
      await this.loadTasks();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async deleteTask(id: string): Promise<void> {
    this.loading.set(true);
    try {
      await this.api.delete(`/tasks/${id}`);
      this.tasks.update((list) => list.filter((t) => t.id !== id));
      if (this.activeTask()?.id === id) {
        this.activeTask.set(null);
        this.runs.set([]);
      }
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async toggleTask(id: string): Promise<void> {
    this.loading.set(true);
    try {
      await this.api.post(`/tasks/${id}/toggle`);
      await this.loadTasks();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async loadRuns(taskId: string): Promise<void> {
    try {
      const data = await this.api.get<TaskRun[]>(`/tasks/${taskId}/runs`);
      this.runs.set(data);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  async runTask(id: string): Promise<void> {
    this.loading.set(true);
    try {
      await this.api.post(`/tasks/${id}/run`);
      await this.loadRuns(id);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  clearError(): void {
    this.error.set(null);
  }
}
