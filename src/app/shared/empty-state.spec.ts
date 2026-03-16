import { describe, it, expect } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state';

describe('EmptyStateComponent', () => {
  let fixture: ComponentFixture<EmptyStateComponent>;

  function createComponent(title: string, description = '', icon = '') {
    TestBed.configureTestingModule({ imports: [EmptyStateComponent] });
    fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('title', title);
    if (description) {
      fixture.componentRef.setInput('description', description);
    }
    if (icon) {
      fixture.componentRef.setInput('icon', icon);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('should render title', () => {
    createComponent('No items found');
    const title = fixture.nativeElement.querySelector('.empty-state__title');
    expect(title?.textContent?.trim()).toBe('No items found');
  });

  it('should render description when provided', () => {
    createComponent('No items', 'Try creating one');
    const desc = fixture.nativeElement.querySelector('.empty-state__description');
    expect(desc?.textContent?.trim()).toBe('Try creating one');
  });

  it('should not render description when empty', () => {
    createComponent('No items');
    const desc = fixture.nativeElement.querySelector('.empty-state__description');
    expect(desc).toBeNull();
  });

  it('should render default icon', () => {
    createComponent('No items');
    const icon = fixture.nativeElement.querySelector('.empty-state__icon');
    expect(icon?.textContent?.trim()).toBeTruthy();
  });

  it('should render custom icon when provided', () => {
    createComponent('No items', '', '🔍');
    const icon = fixture.nativeElement.querySelector('.empty-state__icon');
    expect(icon?.textContent?.trim()).toBe('🔍');
  });

  it('should have actions slot', () => {
    createComponent('No items');
    const actions = fixture.nativeElement.querySelector('.empty-state__actions');
    expect(actions).toBeTruthy();
  });
});
