import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-run-history-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    <div class="run-item" [class.run-item--expanded]="expanded()">
      <button class="run-item__header" (click)="expanded.set(!expanded())">
        <span class="run-item__status-icon" [class]="'run-item__status-icon--' + status()">
          @switch (status()) {
            @case ('success') {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            }
            @case ('error') {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            }
            @case ('running') {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
              </svg>
            }
          }
        </span>
        <span class="run-item__time">{{ timestamp() | date: 'MMM d, h:mm a' }}</span>
        @if (summary()) {
          <span class="run-item__summary">{{ summary() }}</span>
        }
        <svg class="run-item__chevron" [class.run-item__chevron--open]="expanded()" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      @if (expanded()) {
        <div class="run-item__body">
          @if (error()) {
            <div class="run-item__error">{{ error() }}</div>
          }
          @if (output()) {
            <pre class="run-item__output">{{ output() }}</pre>
          }
        </div>
      }
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;

    .run-item {
      border-bottom: 1px solid var(--color-border-light);

      &:last-child {
        border-bottom: none;
      }
    }

    .run-item__header {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
      padding: $spacing-sm $spacing-md;
      width: 100%;
      background: none;
      border: none;
      cursor: pointer;
      text-align: left;
      transition: background $transition-fast;

      &:hover {
        background: var(--color-bg-secondary);
      }
    }

    .run-item__status-icon {
      width: 24px;
      height: 24px;
      border-radius: $radius-full;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &--success {
        background: var(--color-success-light);
        color: var(--color-success);
      }

      &--error {
        background: var(--color-error-light);
        color: var(--color-error);
      }

      &--running {
        background: var(--color-primary-lighter);
        color: var(--color-status-running);
        animation: pulse 1.5s ease-in-out infinite;
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

    .run-item__time {
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
      white-space: nowrap;
    }

    .run-item__summary {
      font-size: var(--text-sm);
      color: var(--color-text-primary);
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .run-item__chevron {
      color: var(--color-text-muted);
      margin-left: auto;
      flex-shrink: 0;
      transition: transform $transition-fast;

      &--open {
        transform: rotate(180deg);
      }
    }

    .run-item__body {
      padding: $spacing-sm $spacing-md $spacing-md calc(24px + $spacing-md + $spacing-sm);
    }

    .run-item__error {
      font-size: var(--text-sm);
      color: var(--color-error-text);
      background: var(--color-error-light);
      padding: $spacing-sm $spacing-md;
      border-radius: $radius-md;
      margin-bottom: $spacing-sm;
    }

    .run-item__output {
      font-size: var(--text-xs);
      font-family: var(--font-family-mono);
      white-space: pre-wrap;
      background: var(--color-bg-secondary);
      padding: $spacing-sm $spacing-md;
      border-radius: $radius-md;
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid var(--color-border-light);
    }
  `,
  host: {
    '[class.run-item-host--success]': "status() === 'success'",
    '[class.run-item-host--error]': "status() === 'error'",
    '[class.run-item-host--running]': "status() === 'running'",
  },
})
export class RunHistoryItemComponent {
  readonly status = input.required<'running' | 'success' | 'error'>();
  readonly timestamp = input.required<string>();
  readonly summary = input<string>('');
  readonly output = input<string>('');
  readonly error = input<string>('');

  readonly expanded = signal(false);
}
