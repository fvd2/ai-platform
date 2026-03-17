import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService, type Theme } from '../../core/services/theme.service';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page__header">
        <h1 class="page__title">Settings</h1>
        <p class="page__description">API keys, model selection, and preferences.</p>
      </div>

      <div class="page__content">
        <section class="section">
          <h2 class="section__title">Appearance</h2>
          <div class="section__card">
            <div class="theme-picker">
              <label class="theme-picker__label">Theme</label>
              <div class="theme-picker__options">
                @for (option of themeOptions; track option.value) {
                  <button
                    class="theme-option"
                    [class.theme-option--active]="themeService.theme() === option.value"
                    (click)="themeService.setTheme(option.value)"
                  >
                    <svg class="theme-option__icon" [innerHTML]="option.svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></svg>
                    <span class="theme-option__label">{{ option.label }}</span>
                  </button>
                }
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;

    .page {
      padding: $spacing-xl $spacing-xl;
      max-width: 640px;

      @include mobile {
        padding: $spacing-md;
      }
    }

    .page__header {
      margin-bottom: $spacing-xl;
    }

    .page__title {
      font-size: var(--text-2xl);
      font-weight: var(--font-weight-bold);
      letter-spacing: -0.02em;
      margin: 0;
    }

    .page__description {
      color: var(--color-text-muted);
      margin-top: $spacing-xs;
      font-size: var(--text-sm);
    }

    .page__content {
      display: flex;
      flex-direction: column;
      gap: $spacing-xl;
    }

    .section__title {
      font-size: var(--text-base);
      font-weight: var(--font-weight-semibold);
      margin-bottom: $spacing-md;
    }

    .section__card {
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-light);
      border-radius: $radius-xl;
      padding: $spacing-lg;
      box-shadow: $shadow-xs;

      @include mobile {
        padding: $spacing-md;
        border-radius: $radius-lg;
      }
    }

    .theme-picker__label {
      display: block;
      font-size: var(--text-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-secondary);
      margin-bottom: $spacing-sm;
    }

    .theme-picker__options {
      display: flex;
      gap: $spacing-sm;
    }

    .theme-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $spacing-xs;
      padding: $spacing-md $spacing-lg;
      border: 2px solid var(--color-border);
      border-radius: $radius-xl;
      background: var(--color-bg-primary);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all $transition-fast;

      &:hover {
        border-color: var(--color-primary-light);
        color: var(--color-text-primary);
      }

      &--active {
        border-color: var(--color-primary);
        background: var(--color-primary-lighter);
        color: var(--color-primary);
      }
    }

    .theme-option__icon {
      display: flex;
    }

    .theme-option__label {
      font-size: var(--text-sm);
      font-weight: var(--font-weight-medium);
    }
  `,
})
export class SettingsComponent {
  protected readonly themeService = inject(ThemeService);

  protected readonly themeOptions: { value: Theme; label: string; svg: string }[] = [
    {
      value: 'light',
      label: 'Light',
      svg: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    },
    {
      value: 'dark',
      label: 'Dark',
      svg: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    },
    {
      value: 'system',
      label: 'System',
      svg: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    },
  ];
}
