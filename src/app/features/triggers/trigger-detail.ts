import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  Trigger,
  TriggerRun,
  TriggerType,
  WebhookConfig,
  PollConfig,
} from '../../core/models/trigger.model';
import { StatusBadgeComponent } from '../../shared/status-badge';
import { ToggleComponent } from '../../shared/toggle';
import { PromptEditorComponent } from '../../shared/prompt-editor';
import { RunHistoryItemComponent } from '../../shared/run-history-item';

@Component({
  selector: 'app-trigger-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    StatusBadgeComponent,
    ToggleComponent,
    PromptEditorComponent,
    RunHistoryItemComponent,
  ],
  template: `
    <div class="detail">
      <header class="detail__header">
        <div class="detail__header-info">
          <div class="detail__title-row">
            <span class="detail__type-badge" [innerHTML]="typeIconSvg(trigger().type)"></span>
            <h2 class="detail__title">{{ trigger().name }}</h2>
          </div>
          <span class="detail__type-label">{{ typeLabel(trigger().type) }} trigger</span>
        </div>
        <div class="detail__header-actions">
          <app-status-badge [status]="trigger().status" />
          <app-toggle
            [checked]="trigger().status === 'active'"
            (toggled)="toggle.emit()"
          />
          <button class="detail__action-btn detail__action-btn--fire" (click)="fireNow.emit()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Fire Now
          </button>
          <button class="detail__action-btn detail__action-btn--delete" (click)="delete.emit()">
            Delete
          </button>
        </div>
      </header>

      <section class="detail__section detail__card">
        <h3 class="detail__section-title">Configuration</h3>
        @switch (trigger().type) {
          @case ('webhook') {
            <div class="detail__config-fields">
              <div class="detail__config-field">
                <label class="detail__config-label">Webhook URL</label>
                <div class="detail__config-url-row">
                  <code class="detail__config-url">{{ webhookUrl() }}</code>
                  <button
                    class="detail__copy-btn"
                    (click)="copyToClipboard(webhookUrl())"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    {{ copied() ? 'Copied!' : 'Copy' }}
                  </button>
                </div>
              </div>
              @if (webhookFilter()) {
                <div class="detail__config-field">
                  <label class="detail__config-label">Filter</label>
                  <span class="detail__config-value">{{ webhookFilter() }}</span>
                </div>
              }
            </div>
          }
          @case ('poll') {
            <div class="detail__config-fields">
              <div class="detail__config-field">
                <label class="detail__config-label">Poll URL</label>
                <code class="detail__config-url">{{ pollUrl() }}</code>
              </div>
              <div class="detail__config-field">
                <label class="detail__config-label">Interval</label>
                <span class="detail__config-value">Every {{ pollInterval() }} seconds</span>
              </div>
              <div class="detail__config-field">
                <label class="detail__config-label">Condition</label>
                <span class="detail__config-value">{{ pollCondition() }}</span>
              </div>
            </div>
          }
          @case ('manual') {
            <p class="detail__config-info">
              This trigger fires manually. Use the "Fire Now" button to execute it.
            </p>
          }
        }
      </section>

      <section class="detail__section detail__card">
        <div class="detail__section-header">
          <h3 class="detail__section-title">Prompt</h3>
          <button class="detail__edit-btn" (click)="editingPrompt.set(!editingPrompt())">
            {{ editingPrompt() ? 'Cancel' : 'Edit' }}
          </button>
        </div>
        @if (editingPrompt()) {
          <app-prompt-editor
            [value]="promptDraft()"
            placeholder="Enter AI instructions for this trigger..."
            label=""
            (valueChange)="promptDraft.set($event)"
          />
          <button class="detail__save-btn" (click)="onSavePrompt()">Save Prompt</button>
        } @else {
          <pre class="detail__prompt-display">{{ trigger().prompt }}</pre>
        }
      </section>

      <section class="detail__section">
        <h3 class="detail__section-title">
          Run History
          @if (trigger().runCount > 0) {
            <span class="detail__run-count">({{ trigger().runCount }} total)</span>
          }
        </h3>
        @if (trigger().lastFiredAt) {
          <p class="detail__last-fired">
            Last fired: {{ trigger().lastFiredAt | date: 'MMM d, y h:mm a' }}
          </p>
        }
        <div class="detail__runs">
          @for (run of runs(); track run.id) {
            <app-run-history-item
              [status]="run.status"
              [timestamp]="run.startedAt"
              [summary]="run.eventSummary || (run.output ? truncate(run.output, 80) : '')"
              [output]="run.output ?? ''"
              [error]="run.error ?? ''"
            />
          } @empty {
            <p class="detail__runs-empty">
              No runs yet. Click "Fire Now" to execute this trigger.
            </p>
          }
        </div>
      </section>
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;

    .detail {
      padding: $spacing-lg $spacing-xl;
      display: flex;
      flex-direction: column;
      gap: $spacing-lg;
      max-width: 800px;

      @include mobile {
        padding: $spacing-md;
        gap: $spacing-md;
      }
    }

    .detail__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: $spacing-md;
      padding-bottom: $spacing-lg;
      border-bottom: 1px solid var(--color-border-light);

      @include mobile {
        flex-direction: column;
        padding-bottom: $spacing-md;
      }
    }

    .detail__header-info {
      display: flex;
      flex-direction: column;
      gap: $spacing-xs;
      min-width: 0;
    }

    .detail__title-row {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
    }

    .detail__type-badge {
      width: 32px;
      height: 32px;
      border-radius: $radius-lg;
      background: var(--gradient-surface);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-primary);
      flex-shrink: 0;
    }

    .detail__title {
      font-size: var(--text-xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-primary);
      margin: 0;
      letter-spacing: -0.01em;

      @include mobile {
        font-size: var(--text-lg);
      }
    }

    .detail__type-label {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      text-transform: capitalize;
    }

    .detail__header-actions {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
      flex-shrink: 0;

      @include mobile {
        flex-wrap: wrap;
      }
    }

    .detail__action-btn {
      display: inline-flex;
      align-items: center;
      gap: $spacing-xs;
      padding: $spacing-xs $spacing-md;
      border: 1px solid var(--color-border);
      border-radius: $radius-lg;
      font-size: var(--text-sm);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: all $transition-fast;
      background: var(--color-bg-primary);
      color: var(--color-text-secondary);

      &:hover {
        background: var(--color-bg-tertiary);
      }

      &--fire {
        background: var(--gradient-primary);
        color: #fff;
        border-color: transparent;
        box-shadow: $shadow-sm;

        &:hover {
          box-shadow: $shadow-md;
          transform: translateY(-1px);
        }
      }

      &--delete {
        &:hover {
          background: var(--color-error-light);
          color: var(--color-error-text);
          border-color: rgba(244, 63, 94, 0.3);
        }
      }
    }

    .detail__card {
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

    .detail__section {
      display: flex;
      flex-direction: column;
      gap: $spacing-sm;
    }

    .detail__section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .detail__section-title {
      font-size: var(--text-base);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      margin: 0;
      display: flex;
      align-items: center;
      gap: $spacing-sm;
    }

    .detail__run-count {
      font-size: var(--text-sm);
      font-weight: var(--font-weight-normal);
      color: var(--color-text-muted);
    }

    .detail__config-fields {
      display: flex;
      flex-direction: column;
      gap: $spacing-md;
    }

    .detail__config-field {
      display: flex;
      flex-direction: column;
      gap: $spacing-2xs;
    }

    .detail__config-label {
      font-size: var(--text-xs);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .detail__config-url-row {
      display: flex;
      align-items: center;
      gap: $spacing-sm;

      @include mobile {
        flex-direction: column;
        align-items: flex-start;
      }
    }

    .detail__config-url {
      font-family: var(--font-family-mono);
      font-size: var(--text-sm);
      color: var(--color-text-primary);
      word-break: break-all;
      background: var(--color-bg-secondary);
      padding: $spacing-2xs $spacing-sm;
      border-radius: $radius-md;
      border: 1px solid var(--color-border-light);
    }

    .detail__copy-btn {
      display: inline-flex;
      align-items: center;
      gap: $spacing-xs;
      padding: $spacing-2xs $spacing-sm;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: $radius-md;
      font-size: var(--text-xs);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all $transition-fast;
      white-space: nowrap;

      &:hover {
        background: var(--color-primary-lighter);
        color: var(--color-primary);
        border-color: var(--color-primary-light);
      }
    }

    .detail__config-value {
      font-size: var(--text-sm);
      color: var(--color-text-primary);
    }

    .detail__config-info {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: 0;
    }

    .detail__edit-btn {
      background: none;
      border: none;
      font-size: var(--text-sm);
      color: var(--color-primary);
      cursor: pointer;
      padding: $spacing-2xs $spacing-sm;
      border-radius: $radius-md;
      font-weight: var(--font-weight-medium);
      transition: background $transition-fast;

      &:hover {
        background: var(--color-primary-lighter);
      }
    }

    .detail__save-btn {
      align-self: flex-start;
      padding: $spacing-xs $spacing-md;
      background: var(--gradient-primary);
      color: #fff;
      border: none;
      border-radius: $radius-lg;
      font-size: var(--text-sm);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: all $transition-fast;
      box-shadow: $shadow-sm;

      &:hover {
        box-shadow: $shadow-md;
      }
    }

    .detail__prompt-display {
      background: var(--color-bg-secondary);
      padding: $spacing-md;
      border-radius: $radius-lg;
      font-size: var(--text-sm);
      line-height: var(--line-height-relaxed);
      white-space: pre-wrap;
      word-break: break-word;
      margin: 0;
      border: 1px solid var(--color-border-light);
    }

    .detail__last-fired {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      margin: 0;
    }

    .detail__runs {
      border: 1px solid var(--color-border-light);
      border-radius: $radius-lg;
      overflow: hidden;
      background: var(--color-bg-primary);
      box-shadow: $shadow-xs;
    }

    .detail__runs-empty {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      text-align: center;
      padding: $spacing-xl;
      margin: 0;
    }
  `,
})
export class TriggerDetailComponent {
  readonly trigger = input.required<Trigger>();
  readonly runs = input.required<TriggerRun[]>();

  readonly toggle = output<void>();
  readonly fireNow = output<void>();
  readonly delete = output<void>();
  readonly updatePrompt = output<string>();

  protected readonly editingPrompt = signal(false);
  protected readonly promptDraft = signal('');
  protected readonly copied = signal(false);

  constructor() {
    effect(() => {
      this.promptDraft.set(this.trigger().prompt);
    });
  }

  protected webhookUrl(): string {
    const config = this.trigger().config as WebhookConfig;
    return config.webhookUrl ?? '/api/triggers/' + this.trigger().id + '/webhook';
  }

  protected webhookFilter(): string {
    const config = this.trigger().config as WebhookConfig;
    return config.filter ?? '';
  }

  protected pollUrl(): string {
    const config = this.trigger().config as PollConfig;
    return config.url ?? '';
  }

  protected pollInterval(): number {
    const config = this.trigger().config as PollConfig;
    return config.interval ?? 60;
  }

  protected pollCondition(): string {
    const config = this.trigger().config as PollConfig;
    return config.condition ?? '';
  }

  protected typeIconSvg(type: TriggerType): string {
    switch (type) {
      case 'webhook':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
      case 'poll':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';
      case 'manual':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>';
    }
  }

  protected typeLabel(type: TriggerType): string {
    switch (type) {
      case 'webhook':
        return 'Webhook';
      case 'poll':
        return 'Poll';
      case 'manual':
        return 'Manual';
    }
  }

  protected onSavePrompt(): void {
    this.updatePrompt.emit(this.promptDraft());
    this.editingPrompt.set(false);
  }

  protected async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  protected truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}
