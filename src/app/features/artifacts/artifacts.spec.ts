import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ArtifactsComponent } from './artifacts';
import { ArtifactService } from '../../core/services/artifact.service';
import { ApiService } from '../../core/services/api.service';

describe('ArtifactsComponent', () => {
  let component: ArtifactsComponent;
  let artifactService: ArtifactService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArtifactsComponent],
      providers: [ArtifactService, ApiService],
    }).compileComponents();

    artifactService = TestBed.inject(ArtifactService);
    // Prevent real API calls during construction
    vi.spyOn(artifactService, 'loadArtifacts').mockResolvedValue(undefined);

    const fixture = TestBed.createComponent(ArtifactsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call loadArtifacts on construction', () => {
    expect(artifactService.loadArtifacts).toHaveBeenCalled();
  });

  it('should display empty artifacts initially', () => {
    expect(component['displayedArtifacts']()).toEqual([]);
  });

  it('should return correct empty message when no filters', () => {
    expect(component['emptyMessage']()).toContain('Artifacts from your chats');
  });

  it('should return filter empty message when type filter active', () => {
    component['typeFilter'].set('code');
    expect(component['emptyMessage']()).toContain('No artifacts match the current filters');
  });

  it('should return search empty message when searching', () => {
    component['searchQuery'].set('test');
    expect(component['emptyMessage']()).toContain('No artifacts match your search');
  });

  it('should format date correctly', () => {
    const formatted = component['formatDate']('2026-03-17T00:00:00Z');
    expect(formatted).toContain('Mar');
    expect(formatted).toContain('17');
    expect(formatted).toContain('2026');
  });

  it('should get preview from first 3 lines', () => {
    const artifact = {
      id: '1',
      title: 'test',
      type: 'code' as const,
      content: 'line1\nline2\nline3\nline4\nline5',
      sourceType: 'chat' as const,
      sourceId: 'c1',
      createdAt: '2026-03-17',
    };
    const preview = component['getPreview'](artifact);
    expect(preview).toBe('line1\nline2\nline3');
  });

  it('should open artifact in panel on view', () => {
    const openSpy = vi.spyOn(artifactService, 'open');
    const artifact = {
      id: 'a1',
      title: 'test.ts',
      type: 'code' as const,
      language: 'typescript',
      content: 'const x = 1;',
      sourceType: 'chat' as const,
      sourceId: 'c1',
      createdAt: '2026-03-17',
    };

    component['onViewArtifact'](artifact);

    expect(openSpy).toHaveBeenCalledWith({
      id: 'a1',
      title: 'test.ts',
      type: 'code',
      language: 'typescript',
      content: 'const x = 1;',
    });
  });

  it('should filter displayed artifacts by type', () => {
    artifactService.artifacts.set([
      {
        id: '1',
        title: 'code.ts',
        type: 'code',
        content: 'x',
        sourceType: 'chat',
        sourceId: 'c1',
        createdAt: '2026-03-17',
      },
      {
        id: '2',
        title: 'data.json',
        type: 'json',
        language: 'json',
        content: '{}',
        sourceType: 'chat',
        sourceId: 'c1',
        createdAt: '2026-03-17',
      },
    ]);

    component['typeFilter'].set('code');
    const results = component['displayedArtifacts']();
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('code');
  });

  it('should filter displayed artifacts by source', () => {
    artifactService.artifacts.set([
      {
        id: '1',
        title: 'code.ts',
        type: 'code',
        content: 'x',
        sourceType: 'chat',
        sourceId: 'c1',
        createdAt: '2026-03-17',
      },
      {
        id: '2',
        title: 'output.txt',
        type: 'text',
        content: 'hello',
        sourceType: 'task',
        sourceId: 't1',
        createdAt: '2026-03-17',
      },
    ]);

    component['sourceFilter'].set('task');
    const results = component['displayedArtifacts']();
    expect(results).toHaveLength(1);
    expect(results[0].sourceType).toBe('task');
  });

  it('should use search results when search query is set', () => {
    artifactService.artifacts.set([
      {
        id: '1',
        title: 'code.ts',
        type: 'code',
        content: 'x',
        sourceType: 'chat',
        sourceId: 'c1',
        createdAt: '2026-03-17',
      },
    ]);
    artifactService.searchResults.set([
      {
        id: '2',
        title: 'found.ts',
        type: 'code',
        content: 'y',
        sourceType: 'chat',
        sourceId: 'c2',
        createdAt: '2026-03-17',
      },
    ]);

    component['searchQuery'].set('found');
    const results = component['displayedArtifacts']();
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('found.ts');
  });
});
