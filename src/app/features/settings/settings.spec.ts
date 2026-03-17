import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SettingsComponent } from './settings';
import { ThemeService } from '../../core/services/theme.service';

describe('SettingsComponent', () => {
  let component: SettingsComponent;

  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have three theme options', () => {
    expect(component['themeOptions']).toHaveLength(3);
    expect(component['themeOptions'].map((o) => o.value)).toEqual(['light', 'dark', 'system']);
  });

  it('should inject ThemeService', () => {
    expect(component['themeService']).toBeInstanceOf(ThemeService);
  });
});
