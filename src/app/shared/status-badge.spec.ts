import { describe, it, expect } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { StatusBadgeComponent } from './status-badge';

describe('StatusBadgeComponent', () => {
  let fixture: ComponentFixture<StatusBadgeComponent>;

  function createComponent(status: 'active' | 'paused' | 'error' | 'running', label = '') {
    TestBed.configureTestingModule({ imports: [StatusBadgeComponent] });
    fixture = TestBed.createComponent(StatusBadgeComponent);
    fixture.componentRef.setInput('status', status);
    if (label) {
      fixture.componentRef.setInput('label', label);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('should render with active status', () => {
    createComponent('active');
    const el: HTMLElement = fixture.nativeElement;
    const badge = el.querySelector('.status-badge');
    expect(badge?.classList.contains('status-badge--active')).toBe(true);
  });

  it('should display status text as label when no label override', () => {
    createComponent('paused');
    const label = fixture.nativeElement.querySelector('.status-badge__label');
    expect(label?.textContent?.trim()).toBe('paused');
  });

  it('should display custom label when provided', () => {
    createComponent('error', 'Failed');
    const label = fixture.nativeElement.querySelector('.status-badge__label');
    expect(label?.textContent?.trim()).toBe('Failed');
  });

  it('should render the dot element', () => {
    createComponent('running');
    const dot = fixture.nativeElement.querySelector('.status-badge__dot');
    expect(dot).toBeTruthy();
  });

  it('should apply running status class', () => {
    createComponent('running');
    const badge = fixture.nativeElement.querySelector('.status-badge');
    expect(badge?.classList.contains('status-badge--running')).toBe(true);
  });

  it('should apply error status class', () => {
    createComponent('error');
    const badge = fixture.nativeElement.querySelector('.status-badge');
    expect(badge?.classList.contains('status-badge--error')).toBe(true);
  });
});
