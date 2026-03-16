import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-tasks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <h1>Scheduled Tasks</h1>
      <p class="page__description">Coming in Phase 2 — create recurring AI tasks with cron schedules.</p>
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
export class TasksComponent {}
