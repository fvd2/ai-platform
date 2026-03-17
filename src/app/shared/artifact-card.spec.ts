import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ArtifactCardComponent } from './artifact-card';
import { ArtifactService } from '../core/services/artifact.service';

describe('ArtifactCardComponent', () => {
  let fixture: ComponentFixture<ArtifactCardComponent>;
  let artifactService: ArtifactService;

  function createComponent(
    title: string,
    type: 'code' | 'markdown' | 'table' | 'json' | 'text',
    content: string,
    options: { language?: string; preview?: string } = {},
  ) {
    TestBed.configureTestingModule({ imports: [ArtifactCardComponent] });
    artifactService = TestBed.inject(ArtifactService);
    fixture = TestBed.createComponent(ArtifactCardComponent);
    fixture.componentRef.setInput('title', title);
    fixture.componentRef.setInput('type', type);
    fixture.componentRef.setInput('content', content);
    if (options.language) {
      fixture.componentRef.setInput('language', options.language);
    }
    if (options.preview) {
      fixture.componentRef.setInput('preview', options.preview);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('should render title', () => {
    createComponent('My Code', 'code', 'const x = 1;');
    const title = fixture.nativeElement.querySelector('.artifact-card__title');
    expect(title?.textContent?.trim()).toBe('My Code');
  });

  it('should render type in meta', () => {
    createComponent('My Code', 'code', 'const x = 1;');
    const meta = fixture.nativeElement.querySelector('.artifact-card__meta');
    expect(meta?.textContent).toContain('code');
  });

  it('should render language in meta when provided', () => {
    createComponent('My Code', 'code', 'const x = 1;', { language: 'typescript' });
    const meta = fixture.nativeElement.querySelector('.artifact-card__meta');
    expect(meta?.textContent).toContain('typescript');
  });

  it('should render preview when provided', () => {
    createComponent('My Code', 'code', 'const x = 1;', { preview: 'const x' });
    const preview = fixture.nativeElement.querySelector('.artifact-card__preview');
    expect(preview?.textContent?.trim()).toBe('const x');
  });

  it('should not render preview when empty', () => {
    createComponent('My Code', 'code', 'const x = 1;');
    const preview = fixture.nativeElement.querySelector('.artifact-card__preview');
    expect(preview).toBeNull();
  });

  it('should compute correct icon for code type', () => {
    createComponent('My Code', 'code', 'const x = 1;');
    expect(fixture.componentInstance.typeIcon()).toBe('code');
  });

  it('should compute correct icon for markdown type', () => {
    createComponent('Doc', 'markdown', '# Hello');
    expect(fixture.componentInstance.typeIcon()).toBe('file');
  });

  it('should compute correct icon for table type', () => {
    createComponent('Data', 'table', 'a,b');
    expect(fixture.componentInstance.typeIcon()).toBe('table');
  });

  it('should compute correct icon for json type', () => {
    createComponent('Config', 'json', '{}');
    expect(fixture.componentInstance.typeIcon()).toBe('braces');
  });

  it('should compute correct icon for text type', () => {
    createComponent('Note', 'text', 'hello');
    expect(fixture.componentInstance.typeIcon()).toBe('file');
  });

  it('should call ArtifactService.open when clicked', () => {
    createComponent('My Code', 'code', 'const x = 1;', { language: 'typescript' });
    const openSpy = vi.spyOn(artifactService, 'open');
    const card: HTMLElement = fixture.nativeElement.querySelector('.artifact-card');
    card.click();
    expect(openSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'My Code',
        type: 'code',
        language: 'typescript',
        content: 'const x = 1;',
      }),
    );
  });

  it('should have a View button', () => {
    createComponent('My Code', 'code', 'const x = 1;');
    const btn = fixture.nativeElement.querySelector('.artifact-card__view-btn');
    expect(btn?.textContent?.trim()).toBe('View');
  });
});
