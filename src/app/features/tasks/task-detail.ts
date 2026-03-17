import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Task, TaskRun } from '../../core/models/task.model';
import { StatusBadgeComponent } from '../../shared/status-badge';
import { ToggleComponent } from '../../shared/toggle';
import { PromptEditorComponent } from '../../shared/prompt-editor';
import { SchedulePickerComponent } from '../../shared/schedule-picker';
import { RunHistoryItemComponent } from '../../shared/run-history-item';

@Component({
  selector: 'app-task-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    StatusBadgeComponent,
    ToggleComponent,
    PromptEditorComponent,
    SchedulePickerComponent,
    RunHistoryItemComponent,
  ],
  template: `
    <div class="detail">
      <header class="detail__header">
        <div class="detail__header-info">
          <h2 class="detail__title">{{ task().name }}</h2>
          <span class="detail__schedule-label">{{ task().scheduleDescription }}</span>
        </div>
        <div class="detail__header-actions">
          <app-status-badge [status]="task().status" />
          <app-toggle
            [checked]="task().status === 'active'"
            (toggled)="toggle.emit()"
          />
          <button class="detail__action-btn detail__action-btn--run" (click)="runNow.emit()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Run Now
          </button>
          <button class="detail__action-btn detail__action-btn--delete" (click)="delete.emit()">
            Delete
          </button>
        </div>
      </header>

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
            placeholder="Enter AI instructions for this task..."
            label=""
            (valueChange)="promptDraft.set($event)"
          />
          <button class="detail__save-btn" (click)="onSavePrompt()">Save Prompt</button>
        } @else {
          <pre class="detail__prompt-display">{{ task().prompt }}</pre>
        }
      </section>

      <section class="detail__section detail__card">
        <div class="detail__section-header">
          <h3 class="detail__section-title">Schedule</h3>
          <button class="detail__edit-btn" (click)="editingSchedule.set(!editingSchedule())">
            {{ editingSchedule() ? 'Cancel' : 'Edit' }}
          </button>
        </div>
        @if (editingSchedule()) {
          <app-schedule-picker
            [schedule]="task().schedule"
            [scheduleDescription]="task().scheduleDescription"
            (scheduleChange)="onScheduleChange($event)"
          />
        } @else {
          <div class="detail__schedule-display">
            <span class="detail__schedule-cron">{{ task().schedule }}</span>
            <span class="detail__schedule-desc">{{ task().scheduleDescription }}</span>
          </div>
        }
        <div class="detail__schedule-times">
          @if (task().nextRunAt) {
            <p class="detail__time-info">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Next: {{ task().nextRunAt | date: 'MMM d, y h:mm a' }}
            </p>
          }
          @if (task().lastRunAt) {
            <p class="detail__time-info">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Last: {{ task().lastRunAt | date: 'MMM d, y h:mm a' }}
            </p>
          }
        </div>
      </section>

      <section class="detail__section">
        <h3 class="detail__section-title">Run History</h3>
        <div class="detail__runs">
          @for (run of runs(); track run.id) {
            <app-run-history-item
              [status]="run.status"
              [timestamp]="run.startedAt"
              [summary]="run.output ? truncate(run.output, 80) : ''"
              [output]="run.output ?? ''"
              [error]="run.error ?? ''"
            />
          } @empty {
            <p class="detail__runs-empty">No runs yet. Click "Run Now" to execute this task.</p>
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

    .detail__schedule-label {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
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

      &--run {
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

    .detail__schedule-display {
      display: flex;
      align-items: center;
      gap: $spacing-md;
    }

    .detail__schedule-cron {
      font-family: var(--font-family-mono);
      font-size: var(--text-sm);
      background: var(--color-bg-secondary);
      padding: $spacing-2xs $spacing-sm;
      border-radius: $radius-md;
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border-light);
    }

    .detail__schedule-desc {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .detail__schedule-times {
      display: flex;
      flex-direction: column;
      gap: $spacing-2xs;
      margin-top: $spacing-xs;
    }

    .detail__time-info {
      display: flex;
      align-items: center;
      gap: $spacing-xs;
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
export class TaskDetailComponent {
  readonly task = input.required<Task>();
  readonly runs = input.required<TaskRun[]>();

  readonly toggle = output<void>();
  readonly runNow = output<void>();
  readonly delete = output<void>();
  readonly updatePrompt = output<string>();
  readonly updateSchedule = output<{ schedule: string; description: string }>();

  protected readonly editingPrompt = signal(false);
  protected readonly editingSchedule = signal(false);
  protected readonly promptDraft = signal('');

  constructor() {
    effect(() => {
      this.promptDraft.set(this.task().prompt);
    });
  }

  protected onSavePrompt(): void {
    this.updatePrompt.emit(this.promptDraft());
    this.editingPrompt.set(false);
  }

  protected onScheduleChange(event: { schedule: string; description: string }): void {
    this.updateSchedule.emit(event);
    this.editingSchedule.set(false);
  }

  protected truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}
