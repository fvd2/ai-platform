import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-triggers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <h1>Data Triggers</h1>
      <p class="page__description">Coming in Phase 3 — set up event-driven AI workflows.</p>
    </div>
  `,
  styles: `
    .page {
      padding: 2rem;
    }
    .page__description {
      color: var(--color-text-muted);
      margin-top: 0.5rem;
    }
  `,
})
export class TriggersComponent {}
