import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state">
      <span class="empty-state__icon">{{ icon() }}</span>
      <h3 class="empty-state__title">{{ title() }}</h3>
      @if (description()) {
        <p class="empty-state__description">{{ description() }}</p>
      }
      <div class="empty-state__actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: $spacing-md;
      padding: $spacing-2xl;
    }

    .empty-state__icon {
      font-size: 48px;
    }

    .empty-state__title {
      font-size: var(--text-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
    }

    .empty-state__description {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      max-width: 320px;
      text-align: center;
    }

    .empty-state__actions {
      margin-top: $spacing-sm;
    }
  `,
})
export class EmptyStateComponent {
  readonly icon = input<string>('\uD83D\uDCED');
  readonly title = input.required<string>();
  readonly description = input<string>('');
}
