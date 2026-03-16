import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Conversation } from '../../core/models/conversation.model';

@Component({
  selector: 'app-conversation-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="list">
      <button class="list__new-btn" (click)="create.emit()">+ New Chat</button>
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
            <span class="list__item-title">{{ conv.title }}</span>
            <button
              class="list__item-delete"
              aria-label="Delete conversation"
              (click)="$event.stopPropagation(); remove.emit(conv.id)"
            >
              &times;
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
      gap: $spacing-2xs;
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
      }
    }

    .list__item-title {
      font-size: var(--text-sm);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
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

      .list__item:hover & {
        opacity: 1;
      }

      &:hover {
        color: var(--color-error);
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
export class ConversationListComponent {
  readonly conversations = input.required<Conversation[]>();
  readonly activeId = input<string | null>(null);

  readonly create = output<void>();
  readonly select = output<string>();
  readonly remove = output<string>();
}
