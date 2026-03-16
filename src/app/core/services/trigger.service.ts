import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { Trigger, TriggerConfig, TriggerRun, TriggerType } from '../models/trigger.model';

@Injectable({ providedIn: 'root' })
export class TriggerService {
  private readonly api = inject(ApiService);

  readonly triggers = signal<Trigger[]>([]);
  readonly activeTrigger = signal<Trigger | null>(null);
  readonly runs = signal<TriggerRun[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly hasActiveTrigger = computed(() => this.activeTrigger() !== null);
  readonly activeTriggers = computed(() => this.triggers().filter((t) => t.status === 'active'));
  readonly pausedTriggers = computed(() => this.triggers().filter((t) => t.status === 'paused'));

  async loadTriggers(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.api.get<Trigger[]>('/triggers');
      this.triggers.set(data);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async createTrigger(data: {
    name: string;
    type: TriggerType;
    prompt: string;
    config: TriggerConfig;
  }): Promise<void> {
    this.loading.set(true);
    try {
      await this.api.post<Trigger>('/triggers', data);
      await this.loadTriggers();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async selectTrigger(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const trigger = await this.api.get<Trigger>(`/triggers/${id}`);
      this.activeTrigger.set(trigger);
      await this.loadRuns(id);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async updateTrigger(id: string, data: Partial<Trigger>): Promise<void> {
    this.loading.set(true);
    try {
      await this.api.put<Trigger>(`/triggers/${id}`, data);
      await this.loadTriggers();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async deleteTrigger(id: string): Promise<void> {
    this.loading.set(true);
    try {
      await this.api.delete(`/triggers/${id}`);
      this.triggers.update((list) => list.filter((t) => t.id !== id));
      if (this.activeTrigger()?.id === id) {
        this.activeTrigger.set(null);
        this.runs.set([]);
      }
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async toggleTrigger(id: string): Promise<void> {
    this.loading.set(true);
    try {
      await this.api.post(`/triggers/${id}/toggle`);
      await this.loadTriggers();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async loadRuns(triggerId: string): Promise<void> {
    try {
      const data = await this.api.get<TriggerRun[]>(`/triggers/${triggerId}/runs`);
      this.runs.set(data);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  async fireTrigger(id: string): Promise<void> {
    this.loading.set(true);
    try {
      await this.api.post(`/triggers/${id}/fire`);
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
