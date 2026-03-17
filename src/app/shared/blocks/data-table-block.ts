import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { DataTableData } from '../../core/models/dynamic-block.model';

@Component({
  selector: 'app-data-table-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="data-table-block">
      <div class="data-table-block__scroll">
        <table class="data-table-block__table">
          <thead>
            <tr>
              @for (col of data().columns; track col.key) {
                <th (click)="toggleSort(col.key)" class="data-table-block__th">
                  {{ col.label }}
                  @if (sortKey() === col.key) {
                    <span class="data-table-block__sort">{{ sortDir() === 'asc' ? '▲' : '▼' }}</span>
                  }
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of sortedRows(); track $index) {
              <tr>
                @for (col of data().columns; track col.key) {
                  <td class="data-table-block__td">{{ row[col.key] }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;

    .data-table-block__scroll {
      overflow-x: auto;
    }

    .data-table-block__table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm);
    }

    .data-table-block__th {
      text-align: left;
      padding: $spacing-xs $spacing-sm;
      border-bottom: 2px solid var(--color-border);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-secondary);
      cursor: pointer;
      user-select: none;
      white-space: nowrap;

      &:hover {
        color: var(--color-text-primary);
      }
    }

    .data-table-block__sort {
      font-size: var(--text-xs);
      margin-left: $spacing-xs;
    }

    .data-table-block__td {
      padding: $spacing-xs $spacing-sm;
      border-bottom: 1px solid var(--color-border);
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: var(--text-xs);
    }

    tr:nth-child(even) {
      background: var(--color-bg-secondary);
    }

    tr:hover {
      background: var(--color-bg-tertiary);
    }
  `,
})
export class DataTableBlockComponent {
  readonly data = input.required<DataTableData>();

  protected readonly sortKey = signal<string | null>(null);
  protected readonly sortDir = signal<'asc' | 'desc'>('asc');

  protected readonly sortedRows = computed(() => {
    const rows = [...this.data().rows];
    const key = this.sortKey();
    if (!key) return rows;

    const dir = this.sortDir();
    return rows.sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const cmp = typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal));

      return dir === 'asc' ? cmp : -cmp;
    });
  });

  toggleSort(key: string): void {
    if (this.sortKey() === key) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }
}
