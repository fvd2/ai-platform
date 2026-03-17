import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="status-badge" [class]="'status-badge status-badge--' + status()">
      <span class="status-badge__dot"></span>
      <span class="status-badge__label">{{ label() || status() }}</span>
    </span>
  `,
  styles: `
    @use 'styles/variables' as *;

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: $spacing-2xs $spacing-sm;
      border-radius: $radius-full;
      font-size: var(--text-xs);
      font-weight: var(--font-weight-medium);
    }

    .status-badge__dot {
      width: 7px;
      height: 7px;
      border-radius: $radius-full;
    }

    .status-badge__label {
      text-transform: capitalize;
    }

    .status-badge--active {
      background: var(--color-success-light);
      .status-badge__dot {
        background: var(--color-status-active);
      }
      .status-badge__label {
        color: var(--color-success-text);
      }
    }

    .status-badge--paused {
      background: var(--color-bg-tertiary);
      .status-badge__dot {
        background: var(--color-status-paused);
      }
      .status-badge__label {
        color: var(--color-text-muted);
      }
    }

    .status-badge--error {
      background: var(--color-error-light);
      .status-badge__dot {
        background: var(--color-status-error);
      }
      .status-badge__label {
        color: var(--color-error-text);
      }
    }

    .status-badge--running {
      background: var(--color-primary-lighter);
      .status-badge__dot {
        background: var(--color-status-running);
        animation: pulse 1.5s ease-in-out infinite;
      }
      .status-badge__label {
        color: var(--color-primary);
      }
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.4;
      }
    }
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<'active' | 'paused' | 'error' | 'running'>();
  readonly label = input<string>('');
}
