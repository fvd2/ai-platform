import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-run-history-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    <div class="run-item" [class.run-item--expanded]="expanded()">
      <button class="run-item__header" (click)="expanded.set(!expanded())">
        <span class="run-item__status">
          @switch (status()) {
            @case ('success') {
              \u2713
            }
            @case ('error') {
              \u2717
            }
            @case ('running') {
              \u25CC
            }
          }
        </span>
        <span class="run-item__time">{{ timestamp() | date: 'MMM d, h:mm a' }}</span>
        @if (summary()) {
          <span class="run-item__summary">{{ summary() }}</span>
        }
        <span class="run-item__chevron">{{ expanded() ? '\u25BE' : '\u25B8' }}</span>
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

    .run-item__status {
      width: 20px;
      text-align: center;
      flex-shrink: 0;
    }

    .run-item--success .run-item__status,
    .run-item__header:has(.run-item__status) {
      // Status colors applied via parent modifier or adjacent logic
    }

    // Use individual selectors for status coloring
    :host:has([class='run-item']) {
      display: contents;
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
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      margin-left: auto;
    }

    .run-item__body {
      padding: $spacing-sm $spacing-md $spacing-md calc(20px + $spacing-md + $spacing-sm);
    }

    .run-item__error {
      font-size: var(--text-sm);
      color: var(--color-error-text);
      background: var(--color-error-light);
      padding: $spacing-sm;
      border-radius: $radius-sm;
      margin-bottom: $spacing-sm;
    }

    .run-item__output {
      font-size: var(--text-xs);
      font-family: var(--font-family-mono);
      white-space: pre-wrap;
      background: var(--color-bg-secondary);
      padding: $spacing-sm;
      border-radius: $radius-sm;
      max-height: 300px;
      overflow-y: auto;
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
