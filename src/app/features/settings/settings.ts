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
    @use 'styles/variables' as *;

    .page {
      padding: 2rem;

      @include mobile {
        padding: 1rem;
      }
    }
    .page__description {
      color: var(--color-text-muted);
      margin-top: 0.5rem;
    }
  `,
})
export class SettingsComponent {}
