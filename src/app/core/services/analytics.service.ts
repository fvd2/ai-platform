import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import {
  SourceStats,
  OverviewStats,
  FailurePattern,
  RunTrend,
  PromptAnalysis,
} from '../models/analytics.model';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly api = inject(ApiService);

  readonly taskStats = signal<SourceStats | null>(null);
  readonly triggerStats = signal<SourceStats | null>(null);
  readonly overview = signal<OverviewStats | null>(null);
  readonly failures = signal<FailurePattern[]>([]);
  readonly trends = signal<RunTrend[]>([]);
  readonly promptAnalysis = signal<PromptAnalysis | null>(null);
  readonly analyzing = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async getTaskStats(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.api.get<SourceStats>(`/analytics/tasks/${id}/stats`);
      this.taskStats.set(data);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async getTriggerStats(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.api.get<SourceStats>(`/analytics/triggers/${id}/stats`);
      this.triggerStats.set(data);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async getOverview(period: 'day' | 'week' | 'month' = 'week'): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.api.get<OverviewStats>(`/analytics/overview?period=${period}`);
      this.overview.set(data);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async getFailures(source: 'task' | 'trigger', sourceId: string): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.api.get<FailurePattern[]>(
        `/analytics/failures?source=${source}&sourceId=${sourceId}`,
      );
      this.failures.set(data);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async getTrends(
    source: 'task' | 'trigger',
    sourceId: string,
    period: 'day' | 'week' | 'month' = 'week',
  ): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.api.get<RunTrend[]>(
        `/analytics/trends?source=${source}&sourceId=${sourceId}&period=${period}`,
      );
      this.trends.set(data);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async analyzePrompt(
    prompt: string,
    sourceType: 'task' | 'trigger',
    sourceId: string,
  ): Promise<PromptAnalysis | null> {
    this.analyzing.set(true);
    this.promptAnalysis.set(null);
    try {
      const data = await this.api.post<PromptAnalysis>('/analytics/analyze-prompt', {
        prompt,
        sourceType,
        sourceId,
      });
      this.promptAnalysis.set(data);
      return data;
    } catch (e) {
      this.error.set((e as Error).message);
      return null;
    } finally {
      this.analyzing.set(false);
    }
  }

  clearError(): void {
    this.error.set(null);
  }

  clearAnalysis(): void {
    this.promptAnalysis.set(null);
  }
}
