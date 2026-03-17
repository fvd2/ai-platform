import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ThemeService, type Theme } from '../../core/services/theme.service';
import { TraceService } from '../../core/services/trace.service';
import { GraphService } from '../../core/services/graph.service';
import type { Trace } from '../../core/models/trace.model';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    <div class="page">
      <div class="page__header">
        <h1 class="page__title">Settings</h1>
        <p class="page__description">API keys, model selection, and preferences.</p>
      </div>

      <div class="page__content">
        <section class="section">
          <h2 class="section__title">Appearance</h2>
          <div class="section__card">
            <div class="theme-picker">
              <label class="theme-picker__label">Theme</label>
              <div class="theme-picker__options">
                @for (option of themeOptions; track option.value) {
                  <button
                    class="theme-option"
                    [class.theme-option--active]="themeService.theme() === option.value"
                    (click)="themeService.setTheme(option.value)"
                  >
                    <svg class="theme-option__icon" [innerHTML]="option.svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></svg>
                    <span class="theme-option__label">{{ option.label }}</span>
                  </button>
                }
              </div>
            </div>
          </div>
        </section>

        <section class="section">
          <h2 class="section__title">Connected Accounts</h2>
          <div class="section__card">
            <div class="connected-account">
              <div class="connected-account__info">
                <svg class="connected-account__icon" width="20" height="20" viewBox="0 0 23 23">
                  <path fill="currentColor" d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z"/>
                </svg>
                <div class="connected-account__details">
                  <span class="connected-account__name">Microsoft Account</span>
                  @if (graphService.connected()) {
                    <span class="connected-account__status connected-account__status--connected">
                      Connected as {{ graphService.userEmail() }}
                    </span>
                  } @else {
                    <span class="connected-account__status">Not connected</span>
                  }
                </div>
              </div>
              <div class="connected-account__actions">
                @if (graphService.connected()) {
                  <button class="btn btn--danger-outline" (click)="disconnectMicrosoft()">
                    Disconnect
                  </button>
                } @else {
                  <button class="btn btn--primary" (click)="connectMicrosoft()">
                    Connect Microsoft Account
                  </button>
                }
              </div>
            </div>
          </div>
        </section>

        <section class="section">
          <h2 class="section__title">Usage & Tracing</h2>

          @if (traceService.loading()) {
            <div class="section__card">
              <p class="loading-text">Loading usage data...</p>
            </div>
          } @else {
            <div class="stats-grid">
              <div class="stat-card">
                <span class="stat-card__label">Total Tokens (Month)</span>
                <span class="stat-card__value">{{ formatNumber(totalTokens()) }}</span>
                <span class="stat-card__detail">
                  {{ formatNumber(inputTokens()) }} input / {{ formatNumber(outputTokens()) }} output
                </span>
              </div>

              <div class="stat-card">
                <span class="stat-card__label">Estimated Cost (Month)</span>
                <span class="stat-card__value">\${{ traceService.costEstimate()?.totalCost?.toFixed(4) ?? '0.00' }}</span>
                <span class="stat-card__detail">
                  \${{ traceService.costEstimate()?.inputCost?.toFixed(4) ?? '0' }} input /
                  \${{ traceService.costEstimate()?.outputCost?.toFixed(4) ?? '0' }} output
                </span>
              </div>

              <div class="stat-card">
                <span class="stat-card__label">Error Rate (Month)</span>
                <span class="stat-card__value" [class.stat-card__value--error]="overallErrorRate() > 0.05">
                  {{ (overallErrorRate() * 100).toFixed(1) }}%
                </span>
                <span class="stat-card__detail">{{ totalErrors() }} errors / {{ totalRequests() }} total</span>
              </div>

              <div class="stat-card">
                <span class="stat-card__label">Avg Latency</span>
                <span class="stat-card__value">{{ traceService.latencyStats()?.avg ?? 0 }}ms</span>
                <span class="stat-card__detail">
                  p50: {{ traceService.latencyStats()?.p50 ?? 0 }}ms /
                  p95: {{ traceService.latencyStats()?.p95 ?? 0 }}ms
                </span>
              </div>
            </div>

            <div class="section__card requests-by-source">
              <h3 class="subsection__title">Requests by Source</h3>
              <div class="source-bars">
                @for (entry of requestsBySource(); track entry.source) {
                  <div class="source-bar">
                    <span class="source-bar__label">{{ entry.source }}</span>
                    <div class="source-bar__track">
                      <div
                        class="source-bar__fill source-bar__fill--{{ entry.source }}"
                        [style.width.%]="entry.percentage"
                      ></div>
                    </div>
                    <span class="source-bar__count">{{ entry.count }}</span>
                  </div>
                }
                @if (requestsBySource().length === 0) {
                  <p class="empty-text">No requests recorded yet.</p>
                }
              </div>
            </div>

            <div class="section__card">
              <h3 class="subsection__title">Recent Traces</h3>
              @if (traceService.traces().length === 0) {
                <p class="empty-text">No traces recorded yet.</p>
              } @else {
                <div class="trace-list">
                  @for (trace of traceService.traces(); track trace.id) {
                    <button class="trace-row" (click)="selectTrace(trace)">
                      <div class="trace-row__main">
                        <span class="trace-row__source trace-row__source--{{ trace.source }}">{{ trace.source }}</span>
                        <span class="trace-row__model">{{ trace.model }}</span>
                        <span class="trace-row__status trace-row__status--{{ trace.status }}">{{ trace.status }}</span>
                      </div>
                      <div class="trace-row__meta">
                        <span>{{ trace.totalTokens ?? 0 }} tokens</span>
                        <span>{{ trace.latencyMs ?? 0 }}ms</span>
                        <span>{{ trace.createdAt | date:'short' }}</span>
                      </div>
                    </button>
                  }
                </div>
              }
            </div>
          }
        </section>

        @if (selectedTrace()) {
          <section class="section">
            <div class="section__card trace-detail">
              <div class="trace-detail__header">
                <h3 class="subsection__title">Trace Detail</h3>
                <button class="close-btn" (click)="selectedTrace.set(null)">Close</button>
              </div>
              <div class="trace-detail__grid">
                <div class="detail-field">
                  <span class="detail-field__label">ID</span>
                  <span class="detail-field__value">{{ selectedTrace()!.id }}</span>
                </div>
                <div class="detail-field">
                  <span class="detail-field__label">Source</span>
                  <span class="detail-field__value">{{ selectedTrace()!.source }} / {{ selectedTrace()!.sourceId }}</span>
                </div>
                <div class="detail-field">
                  <span class="detail-field__label">Model</span>
                  <span class="detail-field__value">{{ selectedTrace()!.model }}</span>
                </div>
                <div class="detail-field">
                  <span class="detail-field__label">Status</span>
                  <span class="detail-field__value">{{ selectedTrace()!.status }}</span>
                </div>
                <div class="detail-field">
                  <span class="detail-field__label">Tokens</span>
                  <span class="detail-field__value">{{ selectedTrace()!.inputTokens ?? 0 }} in / {{ selectedTrace()!.outputTokens ?? 0 }} out / {{ selectedTrace()!.totalTokens ?? 0 }} total</span>
                </div>
                <div class="detail-field">
                  <span class="detail-field__label">Latency</span>
                  <span class="detail-field__value">{{ selectedTrace()!.latencyMs ?? 0 }}ms</span>
                </div>
              </div>
              @if (selectedTrace()!.systemPrompt) {
                <div class="detail-block">
                  <span class="detail-block__label">System Prompt</span>
                  <pre class="detail-block__content">{{ selectedTrace()!.systemPrompt }}</pre>
                </div>
              }
              <div class="detail-block">
                <span class="detail-block__label">User Input</span>
                <pre class="detail-block__content">{{ selectedTrace()!.userInput }}</pre>
              </div>
              @if (selectedTrace()!.assistantOutput) {
                <div class="detail-block">
                  <span class="detail-block__label">Assistant Output</span>
                  <pre class="detail-block__content">{{ selectedTrace()!.assistantOutput }}</pre>
                </div>
              }
              @if (selectedTrace()!.error) {
                <div class="detail-block detail-block--error">
                  <span class="detail-block__label">Error</span>
                  <pre class="detail-block__content">{{ selectedTrace()!.error }}</pre>
                </div>
              }
            </div>
          </section>
        }
      </div>
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;

    .page {
      padding: $spacing-xl $spacing-xl;
      max-width: 800px;

      @include mobile {
        padding: $spacing-md;
      }
    }

    .page__header {
      margin-bottom: $spacing-xl;
    }

    .page__title {
      font-size: var(--text-2xl);
      font-weight: var(--font-weight-bold);
      letter-spacing: -0.02em;
      margin: 0;
    }

    .page__description {
      color: var(--color-text-muted);
      margin-top: $spacing-xs;
      font-size: var(--text-sm);
    }

    .page__content {
      display: flex;
      flex-direction: column;
      gap: $spacing-xl;
    }

    .section__title {
      font-size: var(--text-base);
      font-weight: var(--font-weight-semibold);
      margin-bottom: $spacing-md;
    }

    .subsection__title {
      font-size: var(--text-sm);
      font-weight: var(--font-weight-semibold);
      margin: 0 0 $spacing-md 0;
    }

    .section__card {
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-light);
      border-radius: $radius-xl;
      padding: $spacing-lg;
      box-shadow: $shadow-xs;

      @include mobile {
        padding: $spacing-md;
        border-radius: $radius-lg;
      }
    }

    .theme-picker__label {
      display: block;
      font-size: var(--text-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-secondary);
      margin-bottom: $spacing-sm;
    }

    .theme-picker__options {
      display: flex;
      gap: $spacing-sm;
    }

    .theme-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $spacing-xs;
      padding: $spacing-md $spacing-lg;
      border: 2px solid var(--color-border);
      border-radius: $radius-xl;
      background: var(--color-bg-primary);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all $transition-fast;

      &:hover {
        border-color: var(--color-primary-light);
        color: var(--color-text-primary);
      }

      &--active {
        border-color: var(--color-primary);
        background: var(--color-primary-lighter);
        color: var(--color-primary);
      }
    }

    .theme-option__icon {
      display: flex;
    }

    .theme-option__label {
      font-size: var(--text-sm);
      font-weight: var(--font-weight-medium);
    }

    /* Connected Accounts */
    .connected-account {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: $spacing-md;

      @include mobile {
        flex-direction: column;
        align-items: flex-start;
      }
    }

    .connected-account__info {
      display: flex;
      align-items: center;
      gap: $spacing-md;
    }

    .connected-account__icon {
      flex-shrink: 0;
      color: var(--color-text-secondary);
    }

    .connected-account__details {
      display: flex;
      flex-direction: column;
      gap: $spacing-2xs;
    }

    .connected-account__name {
      font-size: var(--text-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
    }

    .connected-account__status {
      font-size: var(--text-xs);
      color: var(--color-text-muted);

      &--connected {
        color: #{$green-600};
      }
    }

    .connected-account__actions {
      flex-shrink: 0;
    }

    .btn {
      font-size: var(--text-sm);
      font-weight: var(--font-weight-medium);
      padding: $spacing-xs $spacing-md;
      border-radius: $radius-lg;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all $transition-fast;

      &--primary {
        background: var(--color-primary);
        color: white;

        &:hover {
          background: var(--color-primary-dark, var(--color-primary));
          opacity: 0.9;
        }
      }

      &--danger-outline {
        background: transparent;
        color: #{$red-600};
        border-color: #{$red-300};

        &:hover {
          background: #{$red-50};
          border-color: #{$red-400};
        }
      }
    }

    /* Usage & Tracing styles */
    .loading-text,
    .empty-text {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      margin: 0;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: $spacing-md;
      margin-bottom: $spacing-md;

      @include mobile {
        grid-template-columns: 1fr;
      }
    }

    .stat-card {
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-light);
      border-radius: $radius-xl;
      padding: $spacing-lg;
      display: flex;
      flex-direction: column;
      gap: $spacing-xs;
      box-shadow: $shadow-xs;
    }

    .stat-card__label {
      font-size: var(--text-xs);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-card__value {
      font-size: var(--text-xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-primary);

      &--error {
        color: #{$red-500};
      }
    }

    .stat-card__detail {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .requests-by-source {
      margin-bottom: $spacing-md;
    }

    .source-bars {
      display: flex;
      flex-direction: column;
      gap: $spacing-sm;
    }

    .source-bar {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
    }

    .source-bar__label {
      font-size: var(--text-sm);
      font-weight: var(--font-weight-medium);
      min-width: 60px;
      text-transform: capitalize;
    }

    .source-bar__track {
      flex: 1;
      height: 8px;
      background: var(--color-bg-tertiary);
      border-radius: $radius-full;
      overflow: hidden;
    }

    .source-bar__fill {
      height: 100%;
      border-radius: $radius-full;
      transition: width $transition-base;

      &--chat {
        background: #{$indigo-500};
      }

      &--task {
        background: #{$green-500};
      }

      &--trigger {
        background: #{$amber-500};
      }
    }

    .source-bar__count {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      min-width: 40px;
      text-align: right;
    }

    .trace-list {
      display: flex;
      flex-direction: column;
      gap: 1px;
      max-height: 400px;
      overflow-y: auto;
    }

    .trace-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: $spacing-sm $spacing-md;
      border: none;
      background: transparent;
      cursor: pointer;
      width: 100%;
      text-align: left;
      border-radius: $radius-md;
      transition: background $transition-fast;

      &:hover {
        background: var(--color-bg-secondary);
      }
    }

    .trace-row__main {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
    }

    .trace-row__source {
      font-size: var(--text-xs);
      font-weight: var(--font-weight-semibold);
      padding: $spacing-2xs $spacing-sm;
      border-radius: $radius-full;
      text-transform: capitalize;

      &--chat {
        background: #{$indigo-50};
        color: #{$indigo-600};
      }

      &--task {
        background: #{$green-50};
        color: #{$green-600};
      }

      &--trigger {
        background: #{$amber-50};
        color: #{$amber-600};
      }
    }

    .trace-row__model {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .trace-row__status {
      font-size: var(--text-xs);
      font-weight: var(--font-weight-medium);

      &--success {
        color: #{$green-500};
      }

      &--error {
        color: #{$red-500};
      }
    }

    .trace-row__meta {
      display: flex;
      gap: $spacing-md;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .trace-detail__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: $spacing-md;

      .subsection__title {
        margin-bottom: 0;
      }
    }

    .close-btn {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: $radius-md;
      padding: $spacing-xs $spacing-sm;
      cursor: pointer;
      transition: all $transition-fast;

      &:hover {
        color: var(--color-text-primary);
        border-color: var(--color-border-light);
      }
    }

    .trace-detail__grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: $spacing-sm;
      margin-bottom: $spacing-md;

      @include mobile {
        grid-template-columns: 1fr;
      }
    }

    .detail-field {
      display: flex;
      flex-direction: column;
      gap: $spacing-2xs;
    }

    .detail-field__label {
      font-size: var(--text-xs);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-muted);
    }

    .detail-field__value {
      font-size: var(--text-sm);
      color: var(--color-text-primary);
      word-break: break-all;
    }

    .detail-block {
      margin-top: $spacing-md;

      &--error {
        .detail-block__content {
          border-color: #{$red-200};
          background: #{$red-50};
          color: #{$red-700};
        }
      }
    }

    .detail-block__label {
      display: block;
      font-size: var(--text-xs);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-muted);
      margin-bottom: $spacing-xs;
    }

    .detail-block__content {
      font-size: var(--text-sm);
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-light);
      border-radius: $radius-md;
      padding: $spacing-md;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 300px;
      overflow-y: auto;
      margin: 0;
      font-family: inherit;
    }
  `,
})
export class SettingsComponent implements OnInit, OnDestroy {
  protected readonly themeService = inject(ThemeService);
  protected readonly traceService = inject(TraceService);
  protected readonly graphService = inject(GraphService);
  protected readonly selectedTrace = signal<Trace | null>(null);
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly totalTokens = computed(() => {
    const cost = this.traceService.costEstimate();
    return cost?.totalTokens ?? 0;
  });

  protected readonly inputTokens = computed(() => {
    const cost = this.traceService.costEstimate();
    return cost?.inputTokens ?? 0;
  });

  protected readonly outputTokens = computed(() => {
    const cost = this.traceService.costEstimate();
    return cost?.outputTokens ?? 0;
  });

  protected readonly totalErrors = computed(() => {
    return this.traceService.errorRate().reduce((sum, b) => sum + b.errors, 0);
  });

  protected readonly totalRequests = computed(() => {
    return this.traceService.errorRate().reduce((sum, b) => sum + b.total, 0);
  });

  protected readonly overallErrorRate = computed(() => {
    const total = this.totalRequests();
    if (total === 0) return 0;
    return this.totalErrors() / total;
  });

  protected readonly requestsBySource = computed(() => {
    const traces = this.traceService.traces();
    const counts: Record<string, number> = {};
    for (const trace of traces) {
      counts[trace.source] = (counts[trace.source] ?? 0) + 1;
    }
    const entries = Object.entries(counts).map(([source, count]) => ({ source, count }));
    const max = Math.max(...entries.map((e) => e.count), 1);
    return entries.map((e) => ({
      ...e,
      percentage: (e.count / max) * 100,
    }));
  });

  protected readonly themeOptions: { value: Theme; label: string; svg: string }[] = [
    {
      value: 'light',
      label: 'Light',
      svg: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    },
    {
      value: 'dark',
      label: 'Dark',
      svg: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    },
    {
      value: 'system',
      label: 'System',
      svg: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    },
  ];

  ngOnInit(): void {
    void this.loadTracingData();
    void this.graphService.getStatus();
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  protected async connectMicrosoft(): Promise<void> {
    try {
      const url = await this.graphService.getAuthUrl();
      const authWindow = window.open(url, '_blank', 'width=600,height=700');

      // Poll for connection status after opening auth window
      this.pollTimer = setInterval(async () => {
        const status = await this.graphService.getStatus();
        if (status.connected) {
          if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
          }
          if (authWindow && !authWindow.closed) {
            authWindow.close();
          }
        }
      }, 2000);

      // Stop polling after 5 minutes
      setTimeout(() => {
        if (this.pollTimer) {
          clearInterval(this.pollTimer);
          this.pollTimer = null;
        }
      }, 5 * 60 * 1000);
    } catch (e) {
      console.error('Failed to get auth URL:', e);
    }
  }

  protected async disconnectMicrosoft(): Promise<void> {
    try {
      await this.graphService.disconnect();
    } catch (e) {
      console.error('Failed to disconnect:', e);
    }
  }

  private async loadTracingData(): Promise<void> {
    await Promise.all([
      this.traceService.loadTraces({ limit: 20 }),
      this.traceService.getCostEstimate('month'),
      this.traceService.getErrorRate('month'),
      this.traceService.getLatencyStats('month'),
    ]);
  }

  protected selectTrace(trace: Trace): void {
    this.selectedTrace.set(trace);
  }

  protected formatNumber(value: number): string {
    if (value >= 1_000_000) {
      return (value / 1_000_000).toFixed(2) + 'M';
    }
    if (value >= 1_000) {
      return (value / 1_000).toFixed(1) + 'K';
    }
    return value.toString();
  }
}
