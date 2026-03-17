import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { KeyValueData } from '../../core/models/dynamic-block.model';

@Component({
  selector: 'app-key-value-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dl class="kv-block">
      @for (pair of data().pairs; track pair.key) {
        <div class="kv-block__row">
          <dt class="kv-block__key">{{ pair.key }}</dt>
          <dd class="kv-block__value">{{ pair.value }}</dd>
        </div>
      }
    </dl>
  `,
  styles: `
    @use 'styles/variables' as *;

    .kv-block {
      margin: 0;
      padding: $spacing-sm;
    }

    .kv-block__row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: $spacing-xs 0;
      border-bottom: 1px solid var(--color-border);

      &:last-child {
        border-bottom: none;
      }
    }

    .kv-block__key {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
      flex-shrink: 0;
      margin-right: $spacing-md;
    }

    .kv-block__value {
      font-size: var(--text-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      text-align: right;
      margin: 0;
    }
  `,
})
export class KeyValueBlockComponent {
  readonly data = input.required<KeyValueData>();
}
