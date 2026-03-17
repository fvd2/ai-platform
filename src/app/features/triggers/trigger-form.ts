import { ChangeDetectionStrategy, Component, output, signal, computed } from '@angular/core';
import { TriggerType, TriggerConfig, PollConfig, WebhookConfig, ManualConfig } from '../../core/models/trigger.model';
import { PromptEditorComponent } from '../../shared/prompt-editor';

@Component({
  selector: 'app-trigger-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PromptEditorComponent],
  template: `
    <div class="form">
      <h2 class="form__title">New Trigger</h2>

      <div class="form__card">
        <div class="form__field">
          <label class="form__label" for="triggerName">Name</label>
          <input
            class="form__input"
            id="triggerName"
            type="text"
            placeholder="e.g., New PR Webhook"
            [value]="name()"
            (input)="name.set($any($event.target).value)"
          />
        </div>

        <div class="form__field">
          <label class="form__label">Type</label>
          <div class="form__type-cards">
            <button
              class="form__type-card"
              [class.form__type-card--active]="type() === 'webhook'"
              (click)="type.set('webhook')"
            >
              <svg class="form__type-card-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <span class="form__type-card-label">Webhook</span>
              <span class="form__type-card-desc">Receive HTTP events</span>
            </button>
            <button
              class="form__type-card"
              [class.form__type-card--active]="type() === 'poll'"
              (click)="type.set('poll')"
            >
              <svg class="form__type-card-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              <span class="form__type-card-label">Poll</span>
              <span class="form__type-card-desc">Check URL periodically</span>
            </button>
            <button
              class="form__type-card"
              [class.form__type-card--active]="type() === 'manual'"
              (click)="type.set('manual')"
            >
              <svg class="form__type-card-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              <span class="form__type-card-label">Manual</span>
              <span class="form__type-card-desc">Fire on demand</span>
            </button>
          </div>
        </div>

        @switch (type()) {
          @case ('webhook') {
            <div class="form__field">
              <label class="form__label" for="webhookFilter">Filter (optional)</label>
              <input
                class="form__input"
                id="webhookFilter"
                type="text"
                placeholder="e.g., event.action === 'opened'"
                [value]="webhookFilter()"
                (input)="webhookFilter.set($any($event.target).value)"
              />
            </div>
          }
          @case ('poll') {
            <div class="form__field">
              <label class="form__label" for="pollUrl">URL to poll</label>
              <input
                class="form__input"
                id="pollUrl"
                type="text"
                placeholder="https://api.example.com/status"
                [value]="pollUrl()"
                (input)="pollUrl.set($any($event.target).value)"
              />
            </div>
            <div class="form__field">
              <label class="form__label" for="pollInterval">Interval (seconds)</label>
              <input
                class="form__input"
                id="pollInterval"
                type="number"
                min="10"
                placeholder="60"
                [value]="pollInterval()"
                (input)="pollInterval.set(+$any($event.target).value)"
              />
            </div>
            <div class="form__field">
              <label class="form__label" for="pollCondition">Condition</label>
              <input
                class="form__input"
                id="pollCondition"
                type="text"
                placeholder="e.g., response.status !== previousStatus"
                [value]="pollCondition()"
                (input)="pollCondition.set($any($event.target).value)"
              />
            </div>
          }
        }

        <div class="form__field">
          <app-prompt-editor
            [value]="prompt()"
            placeholder="Enter AI instructions for when this trigger fires..."
            label="Prompt"
            (valueChange)="prompt.set($event)"
          />
        </div>
      </div>

      <div class="form__actions">
        <button
          class="form__btn form__btn--primary"
          [disabled]="!isValid()"
          (click)="onSubmit()"
        >
          Create Trigger
        </button>
        <button class="form__btn form__btn--secondary" (click)="cancel.emit()">Cancel</button>
      </div>
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;

    .form {
      padding: $spacing-lg $spacing-xl;
      max-width: 640px;
      display: flex;
      flex-direction: column;
      gap: $spacing-lg;

      @include mobile {
        padding: $spacing-md;
        gap: $spacing-md;
      }
    }

    .form__title {
      font-size: var(--text-xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-primary);
      margin: 0;
      letter-spacing: -0.01em;
    }

    .form__card {
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-light);
      border-radius: $radius-xl;
      padding: $spacing-lg;
      display: flex;
      flex-direction: column;
      gap: $spacing-lg;
      box-shadow: $shadow-xs;

      @include mobile {
        padding: $spacing-md;
        gap: $spacing-md;
        border-radius: $radius-lg;
      }
    }

    .form__field {
      display: flex;
      flex-direction: column;
      gap: $spacing-xs;
    }

    .form__label {
      font-size: var(--text-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }

    .form__input {
      padding: 10px $spacing-md;
      border: 1px solid var(--color-border);
      border-radius: $radius-lg;
      font-family: var(--font-family);
      font-size: var(--text-sm);
      color: var(--color-text-primary);
      background: var(--color-bg-primary);
      outline: none;
      transition:
        border-color $transition-fast,
        box-shadow $transition-fast;

      @include mobile {
        font-size: 16px;
      }

      &:focus {
        border-color: var(--color-border-focus);
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
      }

      &::placeholder {
        color: var(--color-text-muted);
      }
    }

    .form__type-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: $spacing-sm;

      @include mobile {
        grid-template-columns: 1fr;
      }
    }

    .form__type-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $spacing-xs;
      padding: $spacing-md;
      border: 2px solid var(--color-border);
      border-radius: $radius-xl;
      background: var(--color-bg-primary);
      cursor: pointer;
      transition: all $transition-fast;
      color: var(--color-text-secondary);

      @include mobile {
        flex-direction: row;
        padding: $spacing-sm $spacing-md;
      }

      &:hover:not(.form__type-card--active) {
        border-color: var(--color-primary-light);
        background: var(--color-bg-secondary);
      }

      &--active {
        border-color: var(--color-primary);
        background: var(--color-primary-lighter);
        color: var(--color-primary);
      }
    }

    .form__type-card-icon {
      flex-shrink: 0;
    }

    .form__type-card-label {
      font-size: var(--text-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
    }

    .form__type-card-desc {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      text-align: center;
    }

    .form__actions {
      display: flex;
      gap: $spacing-sm;
    }

    .form__btn {
      padding: 10px $spacing-lg;
      border: none;
      border-radius: $radius-lg;
      font-size: var(--text-sm);
      font-weight: var(--font-weight-semibold);
      cursor: pointer;
      transition: all $transition-fast;

      &--primary {
        background: var(--gradient-primary);
        color: #fff;
        box-shadow: $shadow-sm;

        &:hover:not(:disabled) {
          box-shadow: $shadow-md;
          transform: translateY(-1px);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      &--secondary {
        background: var(--color-bg-primary);
        color: var(--color-text-secondary);
        border: 1px solid var(--color-border);

        &:hover {
          background: var(--color-bg-tertiary);
        }
      }
    }
  `,
})
export class TriggerFormComponent {
  readonly create = output<{
    name: string;
    type: TriggerType;
    prompt: string;
    config: TriggerConfig;
  }>();
  readonly cancel = output<void>();

  protected readonly name = signal('');
  protected readonly type = signal<TriggerType>('webhook');
  protected readonly prompt = signal('');

  // Webhook config
  protected readonly webhookFilter = signal('');

  // Poll config
  protected readonly pollUrl = signal('');
  protected readonly pollInterval = signal(60);
  protected readonly pollCondition = signal('');

  protected readonly config = computed<TriggerConfig>(() => {
    switch (this.type()) {
      case 'webhook':
        return { filter: this.webhookFilter() } as WebhookConfig;
      case 'poll':
        return {
          url: this.pollUrl(),
          interval: this.pollInterval(),
          condition: this.pollCondition(),
        } as PollConfig;
      case 'manual':
        return {} as ManualConfig;
    }
  });

  protected isValid(): boolean {
    const hasName = this.name().trim().length > 0;
    const hasPrompt = this.prompt().trim().length > 0;

    if (!hasName || !hasPrompt) return false;

    if (this.type() === 'poll') {
      return this.pollUrl().trim().length > 0 && this.pollInterval() >= 10;
    }

    return true;
  }

  protected onSubmit(): void {
    if (!this.isValid()) return;
    this.create.emit({
      name: this.name().trim(),
      type: this.type(),
      prompt: this.prompt().trim(),
      config: this.config(),
    });
  }
}
