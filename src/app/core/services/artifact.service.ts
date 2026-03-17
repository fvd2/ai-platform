import { Injectable, signal, computed } from '@angular/core';

export interface ArtifactPanelItem {
  id: string;
  title: string;
  type: 'code' | 'markdown' | 'table' | 'json' | 'text';
  language?: string;
  content: string;
}

@Injectable({ providedIn: 'root' })
export class ArtifactService {
  private readonly _currentArtifact = signal<ArtifactPanelItem | null>(null);

  readonly currentArtifact = this._currentArtifact.asReadonly();
  readonly isOpen = computed(() => this._currentArtifact() !== null);

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
}
