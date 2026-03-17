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
            <span class="form__type-card-icon">\uD83D\uDD17</span>
            <span class="form__type-card-label">Webhook</span>
            <span class="form__type-card-desc">Receive HTTP events</span>
          </button>
          <button
            class="form__type-card"
            [class.form__type-card--active]="type() === 'poll'"
            (click)="type.set('poll')"
          >
            <span class="form__type-card-icon">\uD83D\uDD04</span>
            <span class="form__type-card-label">Poll</span>
            <span class="form__type-card-desc">Check URL periodically</span>
          </button>
          <button
            class="form__type-card"
            [class.form__type-card--active]="type() === 'manual'"
            (click)="type.set('manual')"
          >
            <span class="form__type-card-icon">\uD83D\uDC46</span>
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
      padding: $spacing-lg;
      max-width: 600px;
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
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      margin: 0;
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
      padding: $spacing-sm $spacing-md;
      border: 1px solid var(--color-border);
      border-radius: $radius-md;
      font-family: var(--font-family);
      font-size: var(--text-sm);
      color: var(--color-text-primary);
      background: var(--color-bg-primary);
      outline: none;
      transition: border-color $transition-fast;

      @include mobile {
        font-size: 16px;
      }

      &:focus {
        border-color: var(--color-border-focus);
        box-shadow: 0 0 0 3px var(--color-primary-light);
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
      border-radius: $radius-lg;
      background: var(--color-bg-primary);
      cursor: pointer;
      transition: all $transition-fast;

      @include mobile {
        flex-direction: row;
        padding: $spacing-sm $spacing-md;
      }

      &:hover:not(.form__type-card--active) {
        border-color: var(--color-border-focus);
        background: var(--color-bg-secondary);
      }

      &--active {
        border-color: var(--color-primary);
        background: var(--color-primary-lighter);
      }
    }

    .form__type-card-icon {
      font-size: 24px;
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
      padding-top: $spacing-sm;
    }

    .form__btn {
      padding: $spacing-sm $spacing-lg;
      border: none;
      border-radius: $radius-md;
      font-size: var(--text-sm);
      font-weight: var(--font-weight-semibold);
      cursor: pointer;
      transition: all $transition-fast;

      &--primary {
        background: var(--color-primary);
        color: var(--color-primary-text);

        &:hover:not(:disabled) {
          background: var(--color-primary-dark);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      &--secondary {
        background: var(--color-bg-secondary);
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
