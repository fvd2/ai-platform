import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="status-badge" [class]="'status-badge--' + status()">
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
    }

    .status-badge__dot {
      width: 8px;
      height: 8px;
      border-radius: $radius-full;
    }

    .status-badge__label {
      font-size: var(--text-xs);
      font-weight: var(--font-weight-medium);
      text-transform: capitalize;
    }

    .status-badge--active {
      .status-badge__dot {
        background: var(--color-status-active);
      }
      .status-badge__label {
        color: var(--color-status-active);
      }
    }

    .status-badge--paused {
      .status-badge__dot {
        background: var(--color-status-paused);
      }
      .status-badge__label {
        color: var(--color-status-paused);
      }
    }

    .status-badge--error {
      .status-badge__dot {
        background: var(--color-status-error);
      }
      .status-badge__label {
        color: var(--color-status-error);
      }
    }

    .status-badge--running {
      .status-badge__dot {
        background: var(--color-status-running);
        animation: pulse 1.5s ease-in-out infinite;
      }
      .status-badge__label {
        color: var(--color-status-running);
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
