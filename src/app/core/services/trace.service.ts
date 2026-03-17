import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import {
  Trace,
  UsageBucket,
  CostEstimate,
  ErrorRateBucket,
  LatencyStats,
} from '../models/trace.model';

@Injectable({ providedIn: 'root' })
export class TraceService {
  private readonly api = inject(ApiService);

  readonly traces = signal<Trace[]>([]);
  readonly activeTrace = signal<Trace | null>(null);
  readonly usageStats = signal<UsageBucket[]>([]);
  readonly costEstimate = signal<CostEstimate | null>(null);
  readonly errorRate = signal<ErrorRateBucket[]>([]);
  readonly latencyStats = signal<LatencyStats | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async loadTraces(params?: {
    source?: string;
    from?: string;
    to?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<void> {
    this.loading.set(true);
    try {
      const queryParts: string[] = [];
      if (params?.source) queryParts.push(`source=${params.source}`);
      if (params?.from) queryParts.push(`from=${params.from}`);
      if (params?.to) queryParts.push(`to=${params.to}`);
      if (params?.status) queryParts.push(`status=${params.status}`);
      if (params?.limit !== undefined) queryParts.push(`limit=${params.limit}`);
      if (params?.offset !== undefined) queryParts.push(`offset=${params.offset}`);
      const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      const data = await this.api.get<Trace[]>(`/traces${query}`);
      this.traces.set(data);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async getTrace(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.api.get<Trace>(`/traces/${id}`);
      this.activeTrace.set(data);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async getUsageStats(period: 'day' | 'week' | 'month' = 'month'): Promise<void> {
    try {
      const data = await this.api.get<UsageBucket[]>(`/traces/stats/usage?period=${period}`);
      this.usageStats.set(data);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  async getCostEstimate(period: 'day' | 'week' | 'month' = 'month'): Promise<void> {
    try {
      const data = await this.api.get<CostEstimate>(`/traces/stats/cost?period=${period}`);
      this.costEstimate.set(data);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  async getErrorRate(period: 'day' | 'week' | 'month' = 'month'): Promise<void> {
    try {
      const data = await this.api.get<ErrorRateBucket[]>(`/traces/stats/errors?period=${period}`);
      this.errorRate.set(data);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  async getLatencyStats(period: 'day' | 'week' | 'month' = 'month'): Promise<void> {
    try {
      const data = await this.api.get<LatencyStats>(`/traces/stats/latency?period=${period}`);
      this.latencyStats.set(data);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  clearError(): void {
    this.error.set(null);
  }
}
