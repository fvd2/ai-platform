import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Conversation } from '../../core/models/conversation.model';

@Component({
  selector: 'app-conversation-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="list">
      <div class="list__header">
        <span class="list__title">Conversations</span>
        <button class="list__new-btn" (click)="create.emit()" title="New chat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
      <div class="list__items">
        @for (conv of conversations(); track conv.id) {
          <div
            class="list__item"
            [class.list__item--active]="conv.id === activeId()"
            role="button"
            tabindex="0"
            (click)="select.emit(conv.id)"
            (keydown.enter)="select.emit(conv.id)"
          >
            <svg class="list__item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span class="list__item-title">{{ conv.title }}</span>
            <button
              class="list__item-delete"
              aria-label="Delete conversation"
              (click)="$event.stopPropagation(); remove.emit(conv.id)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        } @empty {
          <p class="list__empty">No conversations yet</p>
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
      gap: 1px;
      padding: 0 $spacing-sm;
    }

    .list__item {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
      padding: $spacing-sm $spacing-md;
      border-radius: $radius-lg;
      cursor: pointer;
      transition: all $transition-fast;

      &:hover {
        background: var(--color-bg-secondary);
      }

      &--active {
        background: var(--color-primary-lighter);

        .list__item-icon {
          color: var(--color-primary);
        }

        .list__item-title {
          color: var(--color-primary-dark);
          font-weight: var(--font-weight-medium);
        }
      }
    }

    .list__item-icon {
      flex-shrink: 0;
      color: var(--color-text-muted);
    }

    .list__item-title {
      font-size: var(--text-sm);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      color: var(--color-text-primary);
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
export class ConversationListComponent {
  readonly conversations = input.required<Conversation[]>();
  readonly activeId = input<string | null>(null);

  readonly create = output<void>();
  readonly select = output<string>();
  readonly remove = output<string>();
}
