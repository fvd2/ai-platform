import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { MermaidData } from '../../core/models/dynamic-block.model';

@Component({
  selector: 'app-mermaid-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mermaid-block">
      @if (error()) {
        <div class="mermaid-block__fallback">
          <pre class="mermaid-block__code">{{ data().definition }}</pre>
          <span class="mermaid-block__error">{{ error() }}</span>
        </div>
      } @else {
        <div #container class="mermaid-block__container"></div>
      }
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;

    .mermaid-block {
      padding: $spacing-sm;
    }

    .mermaid-block__container {
      display: flex;
      justify-content: center;

      :deep(svg) {
        max-width: 100%;
        height: auto;
      }
    }

    .mermaid-block__fallback {
      background: var(--color-bg-secondary);
      border-radius: $radius-md;
      padding: $spacing-sm;
    }

    .mermaid-block__code {
      font-size: var(--text-xs);
      font-family: 'SF Mono', 'Fira Code', monospace;
      white-space: pre-wrap;
      margin: 0 0 $spacing-xs;
      color: var(--color-text-secondary);
    }

    .mermaid-block__error {
      font-size: var(--text-xs);
      color: var(--color-error);
    }
  `,
})
export class MermaidBlockComponent {
  readonly data = input.required<MermaidData>();
  protected readonly error = signal('');
  private readonly container = viewChild<ElementRef<HTMLDivElement>>('container');
  private renderCount = 0;

  constructor() {
    effect(() => {
      const definition = this.data().definition;
      const el = this.container()?.nativeElement;
      if (!el || !definition) return;
      this.renderMermaid(el, definition);
    });
  }

  private async renderMermaid(el: HTMLElement, definition: string): Promise<void> {
    try {
      const mermaid = await import('mermaid');
      mermaid.default.initialize({ startOnLoad: false, theme: 'neutral' });
      const id = `mermaid-${++this.renderCount}`;
      const { svg } = await mermaid.default.render(id, definition);
      el.innerHTML = svg;
      this.error.set('');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to render diagram');
    }
  }
}
