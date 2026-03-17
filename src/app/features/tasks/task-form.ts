import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { PromptEditorComponent } from '../../shared/prompt-editor';
import { SchedulePickerComponent } from '../../shared/schedule-picker';

@Component({
  selector: 'app-task-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PromptEditorComponent, SchedulePickerComponent],
  template: `
    <div class="form">
      <h2 class="form__title">New Task</h2>

      <div class="form__card">
        <div class="form__field">
          <label class="form__label" for="taskName">Name</label>
          <input
            class="form__input"
            id="taskName"
            type="text"
            placeholder="e.g., Daily Digest"
            [value]="name()"
            (input)="name.set($any($event.target).value)"
          />
        </div>

        <div class="form__field">
          <app-prompt-editor
            [value]="prompt()"
            placeholder="Enter AI instructions for this task..."
            label="Prompt"
            (valueChange)="prompt.set($event)"
          />
        </div>

        <div class="form__field">
          <label class="form__label">Schedule</label>
          <app-schedule-picker
            (scheduleChange)="onScheduleChange($event)"
          />
        </div>
      </div>

      <div class="form__actions">
        <button
          class="form__btn form__btn--primary"
          [disabled]="!isValid()"
          (click)="onSubmit()"
        >
          Create Task
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
export class TaskFormComponent {
  readonly create = output<{
    name: string;
    prompt: string;
    schedule: string;
    scheduleDescription: string;
  }>();
  readonly cancel = output<void>();

  protected readonly name = signal('');
  protected readonly prompt = signal('');
  protected readonly schedule = signal('');
  protected readonly scheduleDescription = signal('');

  protected isValid(): boolean {
    return this.name().trim().length > 0 && this.prompt().trim().length > 0 && this.schedule().length > 0;
  }

  protected onScheduleChange(event: { schedule: string; description: string }): void {
    this.schedule.set(event.schedule);
    this.scheduleDescription.set(event.description);
  }

  protected onSubmit(): void {
    if (!this.isValid()) return;
    this.create.emit({
      name: this.name().trim(),
      prompt: this.prompt().trim(),
      schedule: this.schedule(),
      scheduleDescription: this.scheduleDescription(),
    });
  }
}
