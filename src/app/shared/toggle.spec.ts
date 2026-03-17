import { describe, it, expect, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ToggleComponent } from './toggle';

describe('ToggleComponent', () => {
  let fixture: ComponentFixture<ToggleComponent>;

  function createComponent(checked: boolean, disabled = false) {
    TestBed.configureTestingModule({ imports: [ToggleComponent] });
    fixture = TestBed.createComponent(ToggleComponent);
    fixture.componentRef.setInput('checked', checked);
    fixture.componentRef.setInput('disabled', disabled);
    fixture.detectChanges();
    return fixture;
  }

  it('should render unchecked state', () => {
    createComponent(false);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.toggle');
    expect(button.classList.contains('toggle--checked')).toBe(false);
    expect(button.getAttribute('aria-checked')).toBe('false');
  });

  it('should render checked state', () => {
    createComponent(true);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.toggle');
    expect(button.classList.contains('toggle--checked')).toBe(true);
    expect(button.getAttribute('aria-checked')).toBe('true');
  });

  it('should have role switch', () => {
    createComponent(false);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.toggle');
    expect(button.getAttribute('role')).toBe('switch');
  });

  it('should emit toggled with inverted value on click', () => {
    createComponent(false);
    const spy = vi.fn();
    fixture.componentInstance.toggled.subscribe(spy);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.toggle');
    button.click();
    expect(spy).toHaveBeenCalledWith(true);
  });

  it('should emit false when checked and clicked', () => {
    createComponent(true);
    const spy = vi.fn();
    fixture.componentInstance.toggled.subscribe(spy);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.toggle');
    button.click();
    expect(spy).toHaveBeenCalledWith(false);
  });

  it('should apply disabled class and attribute when disabled', () => {
    createComponent(false, true);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.toggle');
    expect(button.classList.contains('toggle--disabled')).toBe(true);
    expect(button.disabled).toBe(true);
  });

  it('should not emit when disabled and clicked', () => {
    createComponent(false, true);
    const spy = vi.fn();
    fixture.componentInstance.toggled.subscribe(spy);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.toggle');
    button.click();
    expect(spy).not.toHaveBeenCalled();
  });
});
