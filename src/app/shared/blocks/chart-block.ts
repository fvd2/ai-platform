import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ChartData } from '../../core/models/dynamic-block.model';

const DEFAULT_COLORS = [
  'var(--color-primary)',
  'var(--color-accent)',
  '#10b981',
  '#f59e0b',
  '#f43f5e',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
];

@Component({
  selector: 'app-chart-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart-block">
      @if (data().datasets.length > 1 || data().datasets[0]?.label) {
        <div class="chart-block__legend">
          @for (ds of data().datasets; track ds.label; let i = $index) {
            <span class="chart-block__legend-item">
              <span
                class="chart-block__legend-dot"
                [style.background]="getColor(i)"
              ></span>
              {{ ds.label }}
            </span>
          }
        </div>
      }

      @switch (data().type) {
        @case ('bar') {
          <div class="chart-block__bar-chart">
            <div class="chart-block__bars">
              @for (label of data().labels; track label; let i = $index) {
                <div class="chart-block__bar-group">
                  <div class="chart-block__bar-stack">
                    @for (ds of data().datasets; track ds.label; let di = $index) {
                      <div
                        class="chart-block__bar"
                        [style.height.%]="barHeight(di, i)"
                        [style.background]="getColor(di)"
                        (mouseenter)="showTooltip(ds.label + ': ' + ds.data[i])"
                        (mouseleave)="hideTooltip()"
                      ></div>
                    }
                  </div>
                  <span class="chart-block__bar-label">{{ label }}</span>
                </div>
              }
            </div>
          </div>
        }
        @case ('line') {
          <div class="chart-block__line-chart">
            <svg [attr.viewBox]="'0 0 ' + svgWidth + ' ' + svgHeight" preserveAspectRatio="none">
              @for (ds of data().datasets; track ds.label; let di = $index) {
                <polyline
                  [attr.points]="linePoints(di)"
                  fill="none"
                  [attr.stroke]="getColor(di)"
                  stroke-width="2"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
                @for (point of linePointCoords(di); track $index; let pi = $index) {
                  <circle
                    [attr.cx]="point.x"
                    [attr.cy]="point.y"
                    r="3"
                    [attr.fill]="getColor(di)"
                    class="chart-block__point"
                    (mouseenter)="showTooltip(ds.label + ': ' + ds.data[pi])"
                    (mouseleave)="hideTooltip()"
                  />
                }
              }
            </svg>
            <div class="chart-block__line-labels">
              @for (label of data().labels; track label) {
                <span>{{ label }}</span>
              }
            </div>
          </div>
        }
        @case ('pie') {
          <div class="chart-block__pie-chart">
            <svg viewBox="0 0 200 200">
              @for (slice of pieSlices(); track $index) {
                <path
                  [attr.d]="slice.path"
                  [attr.fill]="slice.color"
                  class="chart-block__pie-slice"
                  (mouseenter)="showTooltip(slice.label + ': ' + slice.value)"
                  (mouseleave)="hideTooltip()"
                />
              }
            </svg>
          </div>
        }
        @case ('doughnut') {
          <div class="chart-block__pie-chart">
            <svg viewBox="0 0 200 200">
              @for (slice of doughnutSlices(); track $index) {
                <path
                  [attr.d]="slice.path"
                  [attr.fill]="slice.color"
                  class="chart-block__pie-slice"
                  (mouseenter)="showTooltip(slice.label + ': ' + slice.value)"
                  (mouseleave)="hideTooltip()"
                />
              }
              <circle cx="100" cy="100" r="50" fill="var(--color-bg-primary)" />
            </svg>
          </div>
        }
      }

      @if (tooltip()) {
        <div class="chart-block__tooltip">{{ tooltip() }}</div>
      }
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;

    .chart-block {
      position: relative;
      padding: $spacing-sm;
    }

    .chart-block__legend {
      display: flex;
      flex-wrap: wrap;
      gap: $spacing-sm $spacing-md;
      margin-bottom: $spacing-sm;
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
    }

    .chart-block__legend-item {
      display: flex;
      align-items: center;
      gap: $spacing-xs;
    }

    .chart-block__legend-dot {
      width: 8px;
      height: 8px;
      border-radius: $radius-full;
      flex-shrink: 0;
    }

    // Bar chart
    .chart-block__bar-chart {
      height: 180px;
    }

    .chart-block__bars {
      display: flex;
      align-items: flex-end;
      gap: $spacing-xs;
      height: 160px;
      padding-bottom: $spacing-sm;
    }

    .chart-block__bar-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
    }

    .chart-block__bar-stack {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      flex: 1;
      width: 100%;
      justify-content: center;
    }

    .chart-block__bar {
      width: 100%;
      max-width: 40px;
      min-height: 2px;
      border-radius: $radius-sm $radius-sm 0 0;
      transition: opacity $transition-fast;
      cursor: pointer;

      &:hover {
        opacity: 0.8;
      }
    }

    .chart-block__bar-label {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      text-align: center;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
      padding-top: $spacing-xs;
    }

    // Line chart
    .chart-block__line-chart {
      svg {
        width: 100%;
        height: 160px;
      }
    }

    .chart-block__point {
      cursor: pointer;
      transition: r $transition-fast;

      &:hover {
        r: 5;
      }
    }

    .chart-block__line-labels {
      display: flex;
      justify-content: space-between;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      padding-top: $spacing-xs;
    }

    // Pie / doughnut chart
    .chart-block__pie-chart {
      display: flex;
      justify-content: center;

      svg {
        width: 180px;
        height: 180px;
      }
    }

    .chart-block__pie-slice {
      cursor: pointer;
      transition: opacity $transition-fast;

      &:hover {
        opacity: 0.8;
      }
    }

    // Tooltip
    .chart-block__tooltip {
      position: absolute;
      top: 0;
      right: 0;
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
      font-size: var(--text-xs);
      padding: $spacing-xs $spacing-sm;
      border-radius: $radius-sm;
      box-shadow: $shadow-md;
      pointer-events: none;
      white-space: nowrap;
      z-index: 10;
    }
  `,
})
export class ChartBlockComponent {
  readonly data = input.required<ChartData>();

  protected readonly tooltip = signal('');
  protected readonly svgWidth = 400;
  protected readonly svgHeight = 160;

  protected readonly maxValue = computed(() => {
    const allValues = this.data().datasets.flatMap((ds) => ds.data);
    return Math.max(...allValues, 1);
  });

  protected readonly pieSlices = computed(() => this.computePieSlices(0));

  protected readonly doughnutSlices = computed(() => this.computePieSlices(0));

  getColor(index: number): string {
    const ds = this.data().datasets[index];
    return ds?.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  }

  barHeight(datasetIndex: number, labelIndex: number): number {
    const value = this.data().datasets[datasetIndex]?.data[labelIndex] ?? 0;
    return (value / this.maxValue()) * 100;
  }

  linePoints(datasetIndex: number): string {
    return this.linePointCoords(datasetIndex)
      .map((p) => `${p.x},${p.y}`)
      .join(' ');
  }

  linePointCoords(datasetIndex: number): { x: number; y: number }[] {
    const ds = this.data().datasets[datasetIndex];
    if (!ds) return [];

    const max = this.maxValue();
    const count = ds.data.length;
    const padding = 20;
    const usableWidth = this.svgWidth - padding * 2;
    const usableHeight = this.svgHeight - padding * 2;

    return ds.data.map((val, i) => ({
      x: count > 1 ? padding + (i / (count - 1)) * usableWidth : padding + usableWidth / 2,
      y: padding + usableHeight - (val / max) * usableHeight,
    }));
  }

  showTooltip(text: string): void {
    this.tooltip.set(text);
  }

  hideTooltip(): void {
    this.tooltip.set('');
  }

  private computePieSlices(
    _innerRadius: number,
  ): { path: string; color: string; label: string; value: number }[] {
    const chartData = this.data();
    const ds = chartData.datasets[0];
    if (!ds) return [];

    const total = ds.data.reduce((sum, v) => sum + v, 0);
    if (total === 0) return [];

    const slices: { path: string; color: string; label: string; value: number }[] = [];
    let currentAngle = -Math.PI / 2;
    const cx = 100;
    const cy = 100;
    const r = 90;

    for (let i = 0; i < ds.data.length; i++) {
      const value = ds.data[i];
      const angle = (value / total) * Math.PI * 2;
      const endAngle = currentAngle + angle;

      const x1 = cx + r * Math.cos(currentAngle);
      const y1 = cy + r * Math.sin(currentAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);

      const largeArc = angle > Math.PI ? 1 : 0;
      const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`;

      slices.push({
        path,
        color: ds.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        label: chartData.labels[i] || `Item ${i + 1}`,
        value,
      });

      currentAngle = endAngle;
    }

    return slices;
  }
}
