import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Task } from '../../core/models/task.model';

@Component({
  selector: 'app-task-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="list">
      <button class="list__new-btn" (click)="create.emit()">+ New Task</button>

      <div class="list__items">
        @if (activeTasks().length) {
          <div class="list__group">
            <div class="list__group-header">
              <span class="list__group-dot list__group-dot--active"></span>
              Active ({{ activeTasks().length }})
            </div>
            @for (task of activeTasks(); track task.id) {
              <div
                class="list__item"
                [class.list__item--active]="task.id === activeId()"
                role="button"
                tabindex="0"
                (click)="select.emit(task.id)"
                (keydown.enter)="select.emit(task.id)"
              >
                <div class="list__item-content">
                  <span class="list__item-title">{{ task.name }}</span>
                  @if (task.nextRunAt) {
                    <span class="list__item-meta">next: {{ formatNextRun(task.nextRunAt) }}</span>
                  }
                </div>
                <button
                  class="list__item-delete"
                  aria-label="Delete task"
                  (click)="$event.stopPropagation(); remove.emit(task.id)"
                >
                  &times;
                </button>
              </div>
            }
          </div>
        }

        @if (pausedTasks().length) {
          <div class="list__group">
            <div class="list__group-header">
              <span class="list__group-dot list__group-dot--paused"></span>
              Paused ({{ pausedTasks().length }})
            </div>
            @for (task of pausedTasks(); track task.id) {
              <div
                class="list__item"
                [class.list__item--active]="task.id === activeId()"
                role="button"
                tabindex="0"
                (click)="select.emit(task.id)"
                (keydown.enter)="select.emit(task.id)"
              >
                <div class="list__item-content">
                  <span class="list__item-title list__item-title--paused">{{ task.name }}</span>
                </div>
                <button
                  class="list__item-delete"
                  aria-label="Delete task"
                  (click)="$event.stopPropagation(); remove.emit(task.id)"
                >
                  &times;
                </button>
              </div>
            }
          </div>
        }

        @if (!activeTasks().length && !pausedTasks().length) {
          <p class="list__empty">No tasks yet</p>
        }
      </div>
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;

    .list {
      display: flex;
      flex-direction: column;
      gap: $spacing-sm;
      height: 100%;
    }

    .list__new-btn {
      width: 100%;
      padding: $spacing-sm $spacing-md;
      background: var(--color-primary);
      color: var(--color-primary-text);
      border: none;
      border-radius: $radius-md;
      font-size: var(--text-sm);
      font-weight: var(--font-weight-semibold);
      cursor: pointer;
      transition: background $transition-fast;

      &:hover {
        background: var(--color-primary-dark);
      }
    }

    .list__items {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: $spacing-xs;
    }

    .list__group {
      display: flex;
      flex-direction: column;
      gap: $spacing-2xs;
    }

    .list__group-header {
      display: flex;
      align-items: center;
      gap: $spacing-xs;
      font-size: var(--text-xs);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: $spacing-sm $spacing-sm $spacing-2xs;
    }

    .list__group-dot {
      width: 8px;
      height: 8px;
      border-radius: $radius-full;

      &--active {
        background: var(--color-status-active);
      }

      &--paused {
        background: var(--color-status-paused);
      }
    }

    .list__item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: $spacing-sm $spacing-md;
      border-radius: $radius-md;
      cursor: pointer;
      transition: background $transition-fast;

      &:hover {
        background: var(--color-bg-secondary);
      }

      &--active {
        background: var(--color-primary-lighter);
        border-left: 3px solid var(--color-primary);
        padding-left: calc($spacing-md - 3px);
      }
    }

    .list__item-content {
      display: flex;
      flex-direction: column;
      gap: $spacing-2xs;
      min-width: 0;
      flex: 1;
    }

    .list__item-title {
      font-size: var(--text-sm);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      &--paused {
        opacity: 0.6;
      }
    }

    .list__item-meta {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .list__item-delete {
      background: none;
      border: none;
      color: var(--color-text-muted);
      font-size: var(--text-lg);
      padding: 0 $spacing-xs;
      line-height: 1;
      opacity: 0;
      transition: opacity $transition-fast, color $transition-fast;
      flex-shrink: 0;

      .list__item:hover &,
      .list__item--active & {
        opacity: 1;
      }

      &:hover {
        color: var(--color-error);
      }

      @media (hover: none) {
        opacity: 0.6;
      }
    }

    .list__empty {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      text-align: center;
      padding: $spacing-lg;
    }
  `,
})
export class TaskListComponent {
  readonly tasks = input.required<Task[]>();
  readonly activeId = input<string | null>(null);

  readonly create = output<void>();
  readonly select = output<string>();
  readonly remove = output<string>();

  protected readonly activeTasks = computed(() => this.tasks().filter((t) => t.status === 'active'));
  protected readonly pausedTasks = computed(() => this.tasks().filter((t) => t.status === 'paused'));

  protected formatNextRun(nextRunAt: string): string {
    const date = new Date(nextRunAt);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();

    if (diffMs < 0) return 'overdue';
    if (diffMs < 60_000) return 'in < 1 min';
    if (diffMs < 3_600_000) return `in ${Math.round(diffMs / 60_000)} min`;
    if (diffMs < 86_400_000) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  }
}
