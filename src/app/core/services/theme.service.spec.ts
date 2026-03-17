import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ThemeService, type Theme } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('should default to system theme when no stored preference', () => {
    expect(service.theme()).toBe('system');
  });

  it('should set theme', () => {
    service.setTheme('dark');
    expect(service.theme()).toBe('dark');
  });

  it('should report isDark correctly for dark theme', () => {
    service.setTheme('dark');
    expect(service.isDark()).toBe(true);
  });

  it('should report isDark correctly for light theme', () => {
    service.setTheme('light');
    expect(service.isDark()).toBe(false);
  });

  it('should cycle through all theme values', () => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    for (const theme of themes) {
      service.setTheme(theme);
      expect(service.theme()).toBe(theme);
    }
  });
});
