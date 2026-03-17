import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ArtifactService } from '../core/services/artifact.service';

@Component({
  selector: 'app-artifact-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="artifact-card" (click)="onView()">
      <div class="artifact-card__header">
        <div class="artifact-card__icon-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </div>
        <span class="artifact-card__title">{{ title() }}</span>
      </div>
      <div class="artifact-card__meta">
        {{ type() }}@if (language()) {
          &nbsp;&middot; {{ language() }}
        }
      </div>
      @if (preview()) {
        <div class="artifact-card__preview">{{ preview() }}</div>
      }
      <span class="artifact-card__view-btn">View</span>
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;

    .artifact-card {
      border: 1px solid var(--color-border);
      border-radius: $radius-lg;
      background: var(--color-bg-primary);
      padding: $spacing-sm $spacing-md;
      cursor: pointer;
      transition: all $transition-fast;

      &:hover {
        border-color: var(--color-primary);
        box-shadow: $shadow-sm;
        transform: translateY(-1px);
      }
    }

    .artifact-card__header {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
    }

    .artifact-card__icon-badge {
      width: 24px;
      height: 24px;
      border-radius: $radius-md;
      background: var(--gradient-surface);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-primary);
      flex-shrink: 0;
    }

    .artifact-card__title {
      font-size: var(--text-sm);
      font-weight: var(--font-weight-medium);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .artifact-card__meta {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      margin-top: 2px;
      padding-left: 32px;
    }

    .artifact-card__preview {
      font-size: var(--text-xs);
      font-family: var(--font-family-mono);
      color: var(--color-text-secondary);
      max-height: 48px;
      overflow: hidden;
      opacity: 0.7;
      margin-top: $spacing-xs;
      padding-left: 32px;
    }

    .artifact-card__view-btn {
      display: inline-block;
      font-size: var(--text-xs);
      color: var(--color-primary);
      font-weight: var(--font-weight-medium);
      padding: $spacing-xs 0;
      margin-top: $spacing-xs;
      padding-left: 32px;
    }
  `,
})
export class ArtifactCardComponent {
  readonly title = input.required<string>();
  readonly type = input.required<'code' | 'markdown' | 'table' | 'json' | 'text'>();
  readonly language = input<string>('');
  readonly preview = input<string>('');
  readonly content = input.required<string>();

  private readonly artifactService = inject(ArtifactService);

  readonly typeIcon = computed(() => {
    switch (this.type()) {
      case 'code':
        return 'code';
      case 'markdown':
        return 'file';
      case 'table':
        return 'table';
      case 'json':
        return 'braces';
      default:
        return 'file';
    }
  });

  onView(): void {
    this.artifactService.open({
      id: crypto.randomUUID(),
      title: this.title(),
      type: this.type(),
      language: this.language() || undefined,
      content: this.content(),
    });
  }
}
