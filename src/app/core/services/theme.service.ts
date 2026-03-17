import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ai-platform-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.loadTheme());

  private readonly systemDarkQuery =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;

  constructor() {
    effect(() => {
      const theme = this.theme();
      localStorage.setItem(STORAGE_KEY, theme);
      this.applyTheme(theme);
    });

    this.systemDarkQuery?.addEventListener('change', () => {
      if (this.theme() === 'system') {
        this.applyTheme('system');
      }
    });
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  isDark(): boolean {
    const theme = this.theme();
    if (theme === 'system') {
      return this.systemDarkQuery?.matches ?? false;
    }
    return theme === 'dark';
  }

  private applyTheme(theme: Theme): void {
    const isDark =
      theme === 'dark' || (theme === 'system' && (this.systemDarkQuery?.matches ?? false));
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  private loadTheme(): Theme {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system';
  }
}
