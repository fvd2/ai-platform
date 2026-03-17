import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Trigger, TriggerType } from '../../core/models/trigger.model';

@Component({
  selector: 'app-trigger-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    <div class="list">
      <button class="list__new-btn" (click)="create.emit()">+ New Trigger</button>

      <div class="list__items">
        @if (activeTriggers().length) {
          <div class="list__group">
            <div class="list__group-header">
              <span class="list__group-dot list__group-dot--active"></span>
              Active ({{ activeTriggers().length }})
            </div>
            @for (trigger of activeTriggers(); track trigger.id) {
              <div
                class="list__item"
                [class.list__item--active]="trigger.id === activeId()"
                role="button"
                tabindex="0"
                (click)="select.emit(trigger.id)"
                (keydown.enter)="select.emit(trigger.id)"
              >
                <div class="list__item-content">
                  <div class="list__item-name-row">
                    <span class="list__item-type-icon">{{ typeIcon(trigger.type) }}</span>
                    <span class="list__item-title">{{ trigger.name }}</span>
                  </div>
                  <span class="list__item-meta">
                    {{ trigger.runCount }} runs
                    @if (trigger.lastFiredAt) {
                      &middot; last: {{ trigger.lastFiredAt | date: 'MMM d, h:mm a' }}
                    }
                  </span>
                </div>
                <button
                  class="list__item-delete"
                  aria-label="Delete trigger"
                  (click)="$event.stopPropagation(); remove.emit(trigger.id)"
                >
                  &times;
                </button>
              </div>
            }
          </div>
        }

        @if (pausedTriggers().length) {
          <div class="list__group">
            <div class="list__group-header">
              <span class="list__group-dot list__group-dot--paused"></span>
              Paused ({{ pausedTriggers().length }})
            </div>
            @for (trigger of pausedTriggers(); track trigger.id) {
              <div
                class="list__item"
                [class.list__item--active]="trigger.id === activeId()"
                role="button"
                tabindex="0"
                (click)="select.emit(trigger.id)"
                (keydown.enter)="select.emit(trigger.id)"
              >
                <div class="list__item-content">
                  <div class="list__item-name-row">
                    <span class="list__item-type-icon">{{ typeIcon(trigger.type) }}</span>
                    <span class="list__item-title list__item-title--paused">{{ trigger.name }}</span>
                  </div>
                  <span class="list__item-meta">{{ trigger.runCount }} runs</span>
                </div>
                <button
                  class="list__item-delete"
                  aria-label="Delete trigger"
                  (click)="$event.stopPropagation(); remove.emit(trigger.id)"
                >
                  &times;
                </button>
              </div>
            }
          </div>
        }

        @if (!activeTriggers().length && !pausedTriggers().length) {
          <p class="list__empty">No triggers yet</p>
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

    .list__item-name-row {
      display: flex;
      align-items: center;
      gap: $spacing-xs;
    }

    .list__item-type-icon {
      font-size: var(--text-sm);
      flex-shrink: 0;
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
export class TriggerListComponent {
  readonly triggers = input.required<Trigger[]>();
  readonly activeId = input<string | null>(null);

  readonly create = output<void>();
  readonly select = output<string>();
  readonly remove = output<string>();

  protected readonly activeTriggers = computed(
    () => this.triggers().filter((t) => t.status === 'active'),
  );
  protected readonly pausedTriggers = computed(
    () => this.triggers().filter((t) => t.status === 'paused'),
  );

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
}
