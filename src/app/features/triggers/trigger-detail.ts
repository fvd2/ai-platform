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
            <span class="detail__type-icon">{{ typeIcon(trigger().type) }}</span>
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
            Fire Now
          </button>
          <button class="detail__action-btn detail__action-btn--delete" (click)="delete.emit()">
            Delete
          </button>
        </div>
      </header>

      <section class="detail__section">
        <h3 class="detail__section-title">Configuration</h3>
        @switch (trigger().type) {
          @case ('webhook') {
            <div class="detail__config">
              <div class="detail__config-field">
                <label class="detail__config-label">Webhook URL</label>
                <div class="detail__config-url-row">
                  <code class="detail__config-url">{{ webhookUrl() }}</code>
                  <button
                    class="detail__copy-btn"
                    (click)="copyToClipboard(webhookUrl())"
                  >
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
            <div class="detail__config">
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
            <div class="detail__config">
              <p class="detail__config-info">
                This trigger fires manually. Use the "Fire Now" button to execute it.
              </p>
            </div>
          }
        }
      </section>

      <section class="detail__section">
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
      padding: $spacing-lg;
      display: flex;
      flex-direction: column;
      gap: $spacing-lg;
    }

    .detail__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: $spacing-md;
      padding-bottom: $spacing-lg;
      border-bottom: 1px solid var(--color-border-light);
    }

    .detail__header-info {
      display: flex;
      flex-direction: column;
      gap: $spacing-xs;
    }

    .detail__title-row {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
    }

    .detail__type-icon {
      font-size: var(--text-xl);
    }

    .detail__title {
      font-size: var(--text-xl);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      margin: 0;
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
    }

    .detail__action-btn {
      padding: $spacing-xs $spacing-md;
      border: 1px solid var(--color-border);
      border-radius: $radius-md;
      font-size: var(--text-sm);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: all $transition-fast;
      background: var(--color-bg-primary);
      color: var(--color-text-secondary);

      &:hover {
        background: var(--color-bg-secondary);
      }

      &--fire {
        background: var(--color-primary);
        color: var(--color-primary-text);
        border-color: var(--color-primary);

        &:hover {
          background: var(--color-primary-dark);
        }
      }

      &--delete {
        &:hover {
          background: var(--color-error-light);
          color: var(--color-error-text);
          border-color: var(--color-error);
        }
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

    .detail__config {
      display: flex;
      flex-direction: column;
      gap: $spacing-md;
      padding: $spacing-md;
      background: var(--color-bg-secondary);
      border-radius: $radius-md;
      border: 1px solid var(--color-border-light);
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
    }

    .detail__config-url {
      font-family: var(--font-family-mono);
      font-size: var(--text-sm);
      color: var(--color-text-primary);
      word-break: break-all;
    }

    .detail__copy-btn {
      padding: $spacing-2xs $spacing-sm;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: $radius-sm;
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all $transition-fast;
      white-space: nowrap;

      &:hover {
        background: var(--color-primary-lighter);
        color: var(--color-primary);
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
      padding: $spacing-2xs $spacing-xs;
      border-radius: $radius-sm;
      transition: background $transition-fast;

      &:hover {
        background: var(--color-primary-lighter);
      }
    }

    .detail__save-btn {
      align-self: flex-start;
      padding: $spacing-xs $spacing-md;
      background: var(--color-primary);
      color: var(--color-primary-text);
      border: none;
      border-radius: $radius-md;
      font-size: var(--text-sm);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: background $transition-fast;

      &:hover {
        background: var(--color-primary-dark);
      }
    }

    .detail__prompt-display {
      background: var(--color-bg-secondary);
      padding: $spacing-md;
      border-radius: $radius-md;
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
      border-radius: $radius-md;
      overflow: hidden;
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

  protected typeIcon(type: TriggerType): string {
    switch (type) {
      case 'webhook':
        return '\uD83D\uDD17';
      case 'poll':
        return '\uD83D\uDD04';
      case 'manual':
        return '\uD83D\uDC46';
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
