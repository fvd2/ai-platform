import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService, type Theme } from '../../core/services/theme.service';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <h1>Settings</h1>
      <p class="page__description">API keys, model selection, and preferences.</p>

      <section class="section">
        <h2 class="section__title">Appearance</h2>
        <div class="theme-picker">
          <label class="theme-picker__label">Theme</label>
          <div class="theme-picker__options">
            @for (option of themeOptions; track option.value) {
              <button
                class="theme-option"
                [class.theme-option--active]="themeService.theme() === option.value"
                (click)="themeService.setTheme(option.value)"
              >
                <span class="theme-option__icon">{{ option.icon }}</span>
                <span class="theme-option__label">{{ option.label }}</span>
              </button>
            }
          </div>
        </div>
      </section>
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

    .section {
      margin-top: 2rem;
    }
    .section__title {
      font-size: var(--text-lg);
      font-weight: var(--font-weight-semibold);
      margin-bottom: 1rem;
    }

    .theme-picker__label {
      display: block;
      font-size: var(--text-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-secondary);
      margin-bottom: 0.5rem;
    }
    .theme-picker__options {
      display: flex;
      gap: 0.5rem;
    }

    .theme-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.375rem;
      padding: 0.75rem 1.25rem;
      border: 2px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-bg-primary);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition:
        border-color $transition-fast,
        background $transition-fast,
        color $transition-fast;

      &:hover {
        border-color: var(--color-primary);
        color: var(--color-text-primary);
      }

      &--active {
        border-color: var(--color-primary);
        background: var(--color-primary-lighter);
        color: var(--color-primary);
      }
    }
    .theme-option__icon {
      font-size: 1.25rem;
    }
    .theme-option__label {
      font-size: var(--text-sm);
      font-weight: var(--font-weight-medium);
    }
  `,
})
export class SettingsComponent {
  protected readonly themeService = inject(ThemeService);

  protected readonly themeOptions: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: '\u2600\uFE0F' },
    { value: 'dark', label: 'Dark', icon: '\uD83C\uDF19' },
    { value: 'system', label: 'System', icon: '\uD83D\uDCBB' },
  ];
}
