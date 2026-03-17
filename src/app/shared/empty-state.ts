import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state">
      <div class="empty-state__icon-wrapper">
        <span class="empty-state__icon">{{ icon() }}</span>
      </div>
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

    .empty-state__icon-wrapper {
      width: 72px;
      height: 72px;
      border-radius: $radius-2xl;
      background: var(--gradient-surface);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: $spacing-xs;
    }

    .empty-state__icon {
      font-size: 32px;
    }

    .empty-state__title {
      font-size: var(--text-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      letter-spacing: -0.01em;
    }

    .empty-state__description {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      max-width: 360px;
      text-align: center;
      line-height: var(--line-height-relaxed);
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
