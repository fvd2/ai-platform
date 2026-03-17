import { describe, it, expect, beforeEach } from 'vitest';
import { ArtifactService, ArtifactPanelItem } from './artifact.service';

describe('ArtifactService', () => {
  let service: ArtifactService;

  const mockArtifact: ArtifactPanelItem = {
    id: 'test-1',
    title: 'Test Artifact',
    type: 'code',
    language: 'typescript',
    content: 'const x = 42;',
  };

  const anotherArtifact: ArtifactPanelItem = {
    id: 'test-2',
    title: 'Another Artifact',
    type: 'text',
    content: 'Hello world',
  };

  beforeEach(() => {
    service = new ArtifactService();
  });

  it('should start with no artifact and isOpen false', () => {
    expect(service.currentArtifact()).toBeNull();
    expect(service.isOpen()).toBe(false);
  });

  it('should open an artifact', () => {
    service.open(mockArtifact);

    expect(service.currentArtifact()).toEqual(mockArtifact);
    expect(service.isOpen()).toBe(true);
  });

  it('should close an artifact', () => {
    service.open(mockArtifact);
    service.close();

    expect(service.currentArtifact()).toBeNull();
    expect(service.isOpen()).toBe(false);
  });

  it('should toggle open when no artifact is set', () => {
    service.toggle(mockArtifact);

    expect(service.currentArtifact()).toEqual(mockArtifact);
    expect(service.isOpen()).toBe(true);
  });

  it('should toggle closed when the same artifact is already open', () => {
    service.open(mockArtifact);
    service.toggle(mockArtifact);

    expect(service.currentArtifact()).toBeNull();
    expect(service.isOpen()).toBe(false);
  });

  it('should toggle to a different artifact when one is already open', () => {
    service.open(mockArtifact);
    service.toggle(anotherArtifact);

    expect(service.currentArtifact()).toEqual(anotherArtifact);
    expect(service.isOpen()).toBe(true);
  });
});
