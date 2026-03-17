import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SettingsComponent } from './settings';
import { ThemeService } from '../../core/services/theme.service';
import { TraceService } from '../../core/services/trace.service';
import { ApiService } from '../../core/services/api.service';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let apiService: ApiService;

  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
    }).compileComponents();

    apiService = TestBed.inject(ApiService);
    // Mock all API calls that happen on init
    vi.spyOn(apiService, 'get').mockResolvedValue([]);

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

  it('should inject TraceService', () => {
    expect(component['traceService']).toBeInstanceOf(TraceService);
  });

  it('should format numbers correctly', () => {
    expect(component['formatNumber'](500)).toBe('500');
    expect(component['formatNumber'](1500)).toBe('1.5K');
    expect(component['formatNumber'](1_500_000)).toBe('1.50M');
  });

  it('should start with no selected trace', () => {
    expect(component['selectedTrace']()).toBeNull();
  });
});
