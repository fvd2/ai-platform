import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ArtifactService } from '../core/services/artifact.service';

@Component({
  selector: 'app-artifact-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="artifact-card" (click)="onView()">
      <div class="artifact-card__header">
        <span class="artifact-card__icon">{{ typeIcon() }}</span>
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
      <button class="artifact-card__view-btn">View</button>
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;

    .artifact-card {
      border: 1px solid var(--color-border-light);
      border-radius: $radius-lg;
      background: var(--color-bg-secondary);
      padding: $spacing-sm $spacing-md;
      cursor: pointer;
      transition:
        border-color $transition-fast,
        box-shadow $transition-fast;

      &:hover {
        border-color: var(--color-primary);
        box-shadow: $shadow-sm;
      }
    }

    .artifact-card__header {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
    }

    .artifact-card__icon {
      font-size: var(--text-base);
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
    }

    .artifact-card__preview {
      font-size: var(--text-xs);
      font-family: var(--font-family-mono);
      color: var(--color-text-secondary);
      max-height: 48px;
      overflow: hidden;
      opacity: 0.8;
    }

    .artifact-card__view-btn {
      font-size: var(--text-xs);
      color: var(--color-primary);
      font-weight: var(--font-weight-medium);
      background: none;
      border: none;
      padding: $spacing-xs 0;
      margin-top: $spacing-xs;
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
        return '\uD83D\uDCBB';
      case 'markdown':
        return '\uD83D\uDCC4';
      case 'table':
        return '\uD83D\uDCCA';
      case 'json':
        return '\uD83D\uDD27';
      default:
        return '\uD83D\uDCDD';
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
