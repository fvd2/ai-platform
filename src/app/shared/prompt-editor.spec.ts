import { describe, it, expect, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { PromptEditorComponent } from './prompt-editor';

describe('PromptEditorComponent', () => {
  let fixture: ComponentFixture<PromptEditorComponent>;

  function createComponent(options: { value?: string; placeholder?: string; label?: string; rows?: number } = {}) {
    TestBed.configureTestingModule({ imports: [PromptEditorComponent] });
    fixture = TestBed.createComponent(PromptEditorComponent);
    if (options.value !== undefined) {
      fixture.componentRef.setInput('value', options.value);
    }
    if (options.placeholder !== undefined) {
      fixture.componentRef.setInput('placeholder', options.placeholder);
    }
    if (options.label !== undefined) {
      fixture.componentRef.setInput('label', options.label);
    }
    if (options.rows !== undefined) {
      fixture.componentRef.setInput('rows', options.rows);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('should render default label', () => {
    createComponent();
    const label = fixture.nativeElement.querySelector('.prompt-editor__label');
    expect(label?.textContent?.trim()).toBe('Prompt');
  });

  it('should render custom label', () => {
    createComponent({ label: 'System Prompt' });
    const label = fixture.nativeElement.querySelector('.prompt-editor__label');
    expect(label?.textContent?.trim()).toBe('System Prompt');
  });

  it('should render textarea with default placeholder', () => {
    createComponent();
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('.prompt-editor__textarea');
    expect(textarea.placeholder).toBe('Enter your AI prompt...');
  });

  it('should render textarea with custom placeholder', () => {
    createComponent({ placeholder: 'Type here...' });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('.prompt-editor__textarea');
    expect(textarea.placeholder).toBe('Type here...');
  });

  it('should render textarea with value', () => {
    createComponent({ value: 'Hello world' });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('.prompt-editor__textarea');
    expect(textarea.value).toBe('Hello world');
  });

  it('should render textarea with custom rows', () => {
    createComponent({ rows: 10 });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('.prompt-editor__textarea');
    expect(textarea.rows).toBe(10);
  });

  it('should use default rows of 6', () => {
    createComponent();
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('.prompt-editor__textarea');
    expect(textarea.rows).toBe(6);
  });

  it('should emit valueChange on input', () => {
    createComponent();
    const spy = vi.fn();
    fixture.componentInstance.valueChange.subscribe(spy);
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('.prompt-editor__textarea');
    textarea.value = 'new value';
    textarea.dispatchEvent(new Event('input'));
    expect(spy).toHaveBeenCalledWith('new value');
  });
});
