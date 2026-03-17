import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ArtifactService, ArtifactPanelItem, CreateArtifactPayload } from './artifact.service';
import { ApiService } from './api.service';
import { Artifact } from '../models/artifact.model';

const mockArtifact: Artifact = {
  id: 'a1',
  title: 'snippet.ts',
  type: 'code',
  language: 'typescript',
  content: 'const x = 42;\nconsole.log(x);',
  sourceType: 'chat',
  sourceId: 'conv-1',
  createdAt: '2026-03-17T00:00:00Z',
};

const mockJsonArtifact: Artifact = {
  id: 'a2',
  title: 'data.json',
  type: 'json',
  language: 'json',
  content: '{"key": "value"}',
  sourceType: 'task',
  sourceId: 'task-1',
  runId: 'run-1',
  createdAt: '2026-03-17T01:00:00Z',
};

const mockPanelItem: ArtifactPanelItem = {
  id: 'test-1',
  title: 'Test Artifact',
  type: 'code',
  language: 'typescript',
  content: 'const x = 42;',
};

const anotherPanelItem: ArtifactPanelItem = {
  id: 'test-2',
  title: 'Another Artifact',
  type: 'text',
  content: 'Hello world',
};

describe('ArtifactService', () => {
  let service: ArtifactService;
  let apiService: ApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ArtifactService, ApiService],
    });
    service = TestBed.inject(ArtifactService);
    apiService = TestBed.inject(ApiService);
  });

  // Panel state tests
  it('should start with no artifact and isOpen false', () => {
    expect(service.currentArtifact()).toBeNull();
    expect(service.isOpen()).toBe(false);
  });

  it('should open an artifact', () => {
    service.open(mockPanelItem);
    expect(service.currentArtifact()).toEqual(mockPanelItem);
    expect(service.isOpen()).toBe(true);
  });

  it('should close an artifact', () => {
    service.open(mockPanelItem);
    service.close();
    expect(service.currentArtifact()).toBeNull();
    expect(service.isOpen()).toBe(false);
  });

  it('should toggle open when no artifact is set', () => {
    service.toggle(mockPanelItem);
    expect(service.currentArtifact()).toEqual(mockPanelItem);
    expect(service.isOpen()).toBe(true);
  });

  it('should toggle closed when the same artifact is already open', () => {
    service.open(mockPanelItem);
    service.toggle(mockPanelItem);
    expect(service.currentArtifact()).toBeNull();
    expect(service.isOpen()).toBe(false);
  });

  it('should toggle to a different artifact when one is already open', () => {
    service.open(mockPanelItem);
    service.toggle(anotherPanelItem);
    expect(service.currentArtifact()).toEqual(anotherPanelItem);
    expect(service.isOpen()).toBe(true);
  });

  // Collection state tests
  it('should start with empty artifacts', () => {
    expect(service.artifacts()).toEqual([]);
  });

  it('should start with empty search results', () => {
    expect(service.searchResults()).toEqual([]);
  });

  it('should start with loading false', () => {
    expect(service.loading()).toBe(false);
  });

  it('should start with no error', () => {
    expect(service.error()).toBeNull();
  });

  it('should load artifacts from API', async () => {
    const mockArtifacts = [mockArtifact, mockJsonArtifact];
    vi.spyOn(apiService, 'get').mockResolvedValue(mockArtifacts);

    await service.loadArtifacts();

    expect(service.artifacts()).toEqual(mockArtifacts);
    expect(apiService.get).toHaveBeenCalledWith('/artifacts');
  });

  it('should load artifacts with filters', async () => {
    vi.spyOn(apiService, 'get').mockResolvedValue([mockArtifact]);

    await service.loadArtifacts({ type: 'code', sourceType: 'chat' });

    expect(apiService.get).toHaveBeenCalledWith('/artifacts?type=code&sourceType=chat');
  });

  it('should set error on load failure', async () => {
    vi.spyOn(apiService, 'get').mockRejectedValue(new Error('Network error'));

    await service.loadArtifacts();

    expect(service.error()).toBe('Network error');
  });

  it('should search artifacts via API', async () => {
    vi.spyOn(apiService, 'get').mockResolvedValue([mockArtifact]);

    await service.searchArtifacts('snippet');

    expect(service.searchResults()).toEqual([mockArtifact]);
    expect(apiService.get).toHaveBeenCalledWith('/artifacts/search?q=snippet');
  });

  it('should clear search results for empty query', async () => {
    service.searchResults.set([mockArtifact]);
    await service.searchArtifacts('');

    expect(service.searchResults()).toEqual([]);
  });

  it('should create an artifact and prepend to list', async () => {
    vi.spyOn(apiService, 'post').mockResolvedValue(mockArtifact);
    service.artifacts.set([mockJsonArtifact]);

    const payload: CreateArtifactPayload = {
      title: 'snippet.ts',
      type: 'code',
      language: 'typescript',
      content: 'const x = 42;\nconsole.log(x);',
      sourceType: 'chat',
      sourceId: 'conv-1',
    };

    const result = await service.createArtifact(payload);

    expect(result).toEqual(mockArtifact);
    expect(service.artifacts()).toEqual([mockArtifact, mockJsonArtifact]);
    expect(apiService.post).toHaveBeenCalledWith('/artifacts', payload);
  });

  it('should delete an artifact and remove from list', async () => {
    vi.spyOn(apiService, 'delete').mockResolvedValue(undefined);
    service.artifacts.set([mockArtifact, mockJsonArtifact]);

    await service.deleteArtifact('a1');

    expect(service.artifacts()).toEqual([mockJsonArtifact]);
    expect(apiService.delete).toHaveBeenCalledWith('/artifacts/a1');
  });

  it('should close panel when deleting the currently open artifact', async () => {
    vi.spyOn(apiService, 'delete').mockResolvedValue(undefined);
    service.artifacts.set([mockArtifact]);
    service.open({ ...mockPanelItem, id: 'a1' });

    await service.deleteArtifact('a1');

    expect(service.currentArtifact()).toBeNull();
  });

  it('should clear error', () => {
    service.error.set('some error');
    service.clearError();
    expect(service.error()).toBeNull();
  });
});
