import { describe, it, expect } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RunHistoryItemComponent } from './run-history-item';

describe('RunHistoryItemComponent', () => {
  let fixture: ComponentFixture<RunHistoryItemComponent>;

  function createComponent(
    status: 'running' | 'success' | 'error',
    timestamp: string,
    options: { summary?: string; output?: string; error?: string } = {},
  ) {
    TestBed.configureTestingModule({ imports: [RunHistoryItemComponent] });
    fixture = TestBed.createComponent(RunHistoryItemComponent);
    fixture.componentRef.setInput('status', status);
    fixture.componentRef.setInput('timestamp', timestamp);
    if (options.summary) {
      fixture.componentRef.setInput('summary', options.summary);
    }
    if (options.output) {
      fixture.componentRef.setInput('output', options.output);
    }
    if (options.error) {
      fixture.componentRef.setInput('error', options.error);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('should render success status indicator with SVG icon', () => {
    createComponent('success', '2026-03-16T10:00:00Z');
    const statusIcon = fixture.nativeElement.querySelector('.run-item__status-icon--success');
    expect(statusIcon).toBeTruthy();
    expect(statusIcon.querySelector('svg')).toBeTruthy();
  });

  it('should render error status indicator with SVG icon', () => {
    createComponent('error', '2026-03-16T10:00:00Z');
    const statusIcon = fixture.nativeElement.querySelector('.run-item__status-icon--error');
    expect(statusIcon).toBeTruthy();
    expect(statusIcon.querySelector('svg')).toBeTruthy();
  });

  it('should render running status indicator with SVG icon', () => {
    createComponent('running', '2026-03-16T10:00:00Z');
    const statusIcon = fixture.nativeElement.querySelector('.run-item__status-icon--running');
    expect(statusIcon).toBeTruthy();
    expect(statusIcon.querySelector('svg')).toBeTruthy();
  });

  it('should display formatted timestamp', () => {
    createComponent('success', '2026-03-16T10:00:00Z');
    const time = fixture.nativeElement.querySelector('.run-item__time');
    expect(time?.textContent?.trim()).toBeTruthy();
  });

  it('should render summary when provided', () => {
    createComponent('success', '2026-03-16T10:00:00Z', { summary: 'Task completed' });
    const summary = fixture.nativeElement.querySelector('.run-item__summary');
    expect(summary?.textContent?.trim()).toBe('Task completed');
  });

  it('should not render summary when empty', () => {
    createComponent('success', '2026-03-16T10:00:00Z');
    const summary = fixture.nativeElement.querySelector('.run-item__summary');
    expect(summary).toBeNull();
  });

  it('should start collapsed', () => {
    createComponent('success', '2026-03-16T10:00:00Z', { output: 'some output' });
    expect(fixture.componentInstance.expanded()).toBe(false);
    const body = fixture.nativeElement.querySelector('.run-item__body');
    expect(body).toBeNull();
  });

  it('should expand when header is clicked', () => {
    createComponent('success', '2026-03-16T10:00:00Z', { output: 'some output' });
    const header: HTMLButtonElement = fixture.nativeElement.querySelector('.run-item__header');
    header.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.expanded()).toBe(true);
    const body = fixture.nativeElement.querySelector('.run-item__body');
    expect(body).toBeTruthy();
  });

  it('should show output when expanded', () => {
    createComponent('success', '2026-03-16T10:00:00Z', { output: 'Result data' });
    fixture.componentInstance.expanded.set(true);
    fixture.detectChanges();
    const output = fixture.nativeElement.querySelector('.run-item__output');
    expect(output?.textContent?.trim()).toBe('Result data');
  });

  it('should show error when expanded and error exists', () => {
    createComponent('error', '2026-03-16T10:00:00Z', { error: 'Something went wrong' });
    fixture.componentInstance.expanded.set(true);
    fixture.detectChanges();
    const errorEl = fixture.nativeElement.querySelector('.run-item__error');
    expect(errorEl?.textContent?.trim()).toBe('Something went wrong');
  });

  it('should collapse when header is clicked again', () => {
    createComponent('success', '2026-03-16T10:00:00Z', { output: 'data' });
    const header: HTMLButtonElement = fixture.nativeElement.querySelector('.run-item__header');
    header.click();
    fixture.detectChanges();
    header.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.expanded()).toBe(false);
    const body = fixture.nativeElement.querySelector('.run-item__body');
    expect(body).toBeNull();
  });

  it('should render SVG chevron when collapsed', () => {
    createComponent('success', '2026-03-16T10:00:00Z');
    const chevron = fixture.nativeElement.querySelector('.run-item__chevron');
    expect(chevron).toBeTruthy();
    expect(chevron.tagName.toLowerCase()).toBe('svg');
    expect(chevron.classList.contains('run-item__chevron--open')).toBe(false);
  });

  it('should add open class to chevron when expanded', () => {
    createComponent('success', '2026-03-16T10:00:00Z');
    fixture.componentInstance.expanded.set(true);
    fixture.detectChanges();
    const chevron = fixture.nativeElement.querySelector('.run-item__chevron');
    expect(chevron.classList.contains('run-item__chevron--open')).toBe(true);
  });
});
