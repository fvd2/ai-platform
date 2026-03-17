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
      padding: $spacing-lg;
      max-width: 600px;
      display: flex;
      flex-direction: column;
      gap: $spacing-lg;
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

      &:focus {
        border-color: var(--color-border-focus);
        box-shadow: 0 0 0 3px var(--color-primary-light);
      }

      &::placeholder {
        color: var(--color-text-muted);
      }
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
