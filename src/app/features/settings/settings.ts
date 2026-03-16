import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <h1>Settings</h1>
      <p class="page__description">API keys, model selection, and preferences.</p>
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
export class SettingsComponent {}
