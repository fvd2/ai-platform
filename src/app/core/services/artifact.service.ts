import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { Artifact, ArtifactType, ArtifactSourceType } from '../models/artifact.model';

export interface ArtifactPanelItem {
  id: string;
  title: string;
  type: ArtifactType;
  language?: string;
  content: string;
}

export interface CreateArtifactPayload {
  title: string;
  type: ArtifactType;
  language?: string;
  content: string;
  sourceType: ArtifactSourceType;
  sourceId: string;
  runId?: string;
}

export interface ArtifactFilters {
  type?: ArtifactType;
  sourceType?: ArtifactSourceType;
}

@Injectable({ providedIn: 'root' })
export class ArtifactService {
  private readonly api = inject(ApiService);

  // Panel state
  private readonly _currentArtifact = signal<ArtifactPanelItem | null>(null);
  readonly currentArtifact = this._currentArtifact.asReadonly();
  readonly isOpen = computed(() => this._currentArtifact() !== null);

  // Collection state
  readonly artifacts = signal<Artifact[]>([]);
  readonly searchResults = signal<Artifact[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  open(artifact: ArtifactPanelItem): void {
    this._currentArtifact.set(artifact);
  }

  close(): void {
    this._currentArtifact.set(null);
  }

  toggle(artifact: ArtifactPanelItem): void {
    if (this._currentArtifact()?.id === artifact.id) {
      this.close();
    } else {
      this.open(artifact);
    }
  }

  async loadArtifacts(filters?: ArtifactFilters): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.set('type', filters.type);
      if (filters?.sourceType) params.set('sourceType', filters.sourceType);
      const query = params.toString();
      const path = query ? `/artifacts?${query}` : '/artifacts';
      const data = await this.api.get<Artifact[]>(path);
      this.artifacts.set(data);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async searchArtifacts(query: string): Promise<void> {
    if (!query.trim()) {
      this.searchResults.set([]);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.api.get<Artifact[]>(
        `/artifacts/search?q=${encodeURIComponent(query.trim())}`,
      );
      this.searchResults.set(data);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async createArtifact(payload: CreateArtifactPayload): Promise<Artifact> {
    const artifact = await this.api.post<Artifact>('/artifacts', payload);
    this.artifacts.update((list) => [artifact, ...list]);
    return artifact;
  }

  async deleteArtifact(id: string): Promise<void> {
    await this.api.delete(`/artifacts/${id}`);
    this.artifacts.update((list) => list.filter((a) => a.id !== id));
    if (this._currentArtifact()?.id === id) {
      this.close();
    }
  }

  downloadArtifact(id: string): void {
    const link = document.createElement('a');
    link.href = `/api/artifacts/${id}/download`;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  clearError(): void {
    this.error.set(null);
  }
}
