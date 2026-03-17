import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Trigger, TriggerType } from '../../core/models/trigger.model';

@Component({
  selector: 'app-trigger-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    <div class="list">
      <div class="list__header">
        <span class="list__title">Triggers</span>
        <button class="list__new-btn" (click)="create.emit()" title="New trigger">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

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
                    <span class="list__item-type-icon" [innerHTML]="typeIconSvg(trigger.type)"></span>
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
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
                    <span class="list__item-type-icon" [innerHTML]="typeIconSvg(trigger.type)"></span>
                    <span class="list__item-title list__item-title--paused">{{ trigger.name }}</span>
                  </div>
                  <span class="list__item-meta">{{ trigger.runCount }} runs</span>
                </div>
                <button
                  class="list__item-delete"
                  aria-label="Delete trigger"
                  (click)="$event.stopPropagation(); remove.emit(trigger.id)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
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
      height: 100%;
    }

    .list__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: $spacing-md $spacing-md $spacing-sm;
      flex-shrink: 0;
    }

    .list__title {
      font-size: var(--text-xs);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .list__new-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: var(--gradient-primary);
      color: #fff;
      border: none;
      border-radius: $radius-lg;
      cursor: pointer;
      transition: all $transition-fast;
      box-shadow: $shadow-sm;

      &:hover {
        box-shadow: $shadow-md;
        transform: translateY(-1px);
      }
    }

    .list__items {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: $spacing-xs;
      padding: 0 $spacing-sm;
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
      width: 7px;
      height: 7px;
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
      border-radius: $radius-lg;
      cursor: pointer;
      transition: all $transition-fast;

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
      display: flex;
      align-items: center;
      flex-shrink: 0;
      color: var(--color-text-muted);
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
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      color: var(--color-text-muted);
      padding: $spacing-2xs;
      border-radius: $radius-sm;
      opacity: 0;
      transition: all $transition-fast;
      flex-shrink: 0;

      .list__item:hover &,
      .list__item--active & {
        opacity: 1;
      }

      &:hover {
        color: var(--color-error);
        background: var(--color-error-light);
      }

      @media (hover: none) {
        opacity: 0.6;
      }
    }

    .list__empty {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      text-align: center;
      padding: $spacing-xl $spacing-lg;
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

  protected typeIconSvg(type: TriggerType): string {
    switch (type) {
      case 'webhook':
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
      case 'poll':
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';
      case 'manual':
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>';
    }
  }
}
