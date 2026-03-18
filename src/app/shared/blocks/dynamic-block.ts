import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { JsonPipe } from '@angular/common';
import {
  ChartData,
  DataTableData,
  DynamicBlock,
  KeyValueData,
  MermaidData,
} from '../../core/models/dynamic-block.model';
import { ChartBlockComponent } from './chart-block';
import { DataTableBlockComponent } from './data-table-block';
import { KeyValueBlockComponent } from './key-value-block';
import { MermaidBlockComponent } from './mermaid-block';

@Component({
  selector: 'app-dynamic-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JsonPipe, ChartBlockComponent, DataTableBlockComponent, MermaidBlockComponent, KeyValueBlockComponent],
  template: `
    <div class="dynamic-block">
      @if (block().title) {
        <div class="dynamic-block__title">{{ block().title }}</div>
      }
      <div class="dynamic-block__content">
        @switch (block().type) {
          @case ('chart') {
            <app-chart-block [data]="asChart()" />
          }
          @case ('data-table') {
            <app-data-table-block [data]="asTable()" />
          }
          @case ('mermaid') {
            <app-mermaid-block [data]="asMermaid()" />
          }
          @case ('key-value') {
            <app-key-value-block [data]="asKeyValue()" />
          }
          @default {
            <pre class="dynamic-block__fallback">{{ block().data | json }}</pre>
          }
        }
      </div>
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;

    .dynamic-block {
      border: 1px solid var(--color-border);
      border-radius: $radius-lg;
      overflow: hidden;
      margin: $spacing-sm 0;
      background: var(--color-bg-primary);
    }

    .dynamic-block__title {
      font-size: var(--text-sm);
      font-weight: var(--font-weight-semibold);
      padding: $spacing-xs $spacing-sm;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-bg-secondary);
      color: var(--color-text-secondary);
    }

    .dynamic-block__fallback {
      padding: $spacing-sm;
      font-size: var(--text-xs);
      font-family: 'SF Mono', 'Fira Code', monospace;
      overflow-x: auto;
      margin: 0;
    }
  `,
})
export class DynamicBlockComponent {
  readonly block = input.required<DynamicBlock>();

  asChart(): ChartData {
    return this.block().data as unknown as ChartData;
  }

  asTable(): DataTableData {
    return this.block().data as unknown as DataTableData;
  }

  asMermaid(): MermaidData {
    return this.block().data as unknown as MermaidData;
  }

  asKeyValue(): KeyValueData {
    return this.block().data as unknown as KeyValueData;
  }
}
