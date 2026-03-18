import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ArtifactService } from '../../core/services/artifact.service';
import { ArtifactType, ArtifactSourceType, Artifact } from '../../core/models/artifact.model';
import { EmptyStateComponent } from '../../shared/empty-state';

@Component({
  selector: 'app-artifacts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <div class="artifacts">
      <header class="artifacts__header">
        <h1 class="artifacts__title">Artifacts</h1>
        <p class="artifacts__subtitle">Browse and search all generated artifacts</p>
      </header>

      <div class="artifacts__toolbar">
        <div class="artifacts__search">
          <svg class="artifacts__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            class="artifacts__search-input"
            placeholder="Search artifacts..."
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
          />
          @if (searchQuery()) {
            <button class="artifacts__search-clear" (click)="clearSearch()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          }
        </div>

        <div class="artifacts__filters">
          <select
            class="artifacts__filter-select"
            [value]="typeFilter()"
            (change)="onTypeFilter($event)"
          >
            <option value="">All types</option>
            <option value="code">Code</option>
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
            <option value="table">Table</option>
            <option value="text">Text</option>
          </select>
          <select
            class="artifacts__filter-select"
            [value]="sourceFilter()"
            (change)="onSourceFilter($event)"
          >
            <option value="">All sources</option>
            <option value="chat">Chat</option>
            <option value="task">Task</option>
            <option value="trigger">Trigger</option>
          </select>
        </div>
      </div>

      @if (artifactService.loading()) {
        <div class="artifacts__loading">Loading artifacts...</div>
      } @else if (displayedArtifacts().length === 0) {
        <app-empty-state
          title="No artifacts found"
          [description]="emptyMessage()"
        />
      } @else {
        <div class="artifacts__grid">
          @for (artifact of displayedArtifacts(); track artifact.id) {
            <div class="artifact-card" (click)="onViewArtifact(artifact)">
              <div class="artifact-card__header">
                <div class="artifact-card__icon-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    @switch (artifact.type) {
                      @case ('code') {
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      }
                      @case ('json') {
                        <line x1="4" y1="7" x2="20" y2="7" />
                        <line x1="4" y1="12" x2="20" y2="12" />
                        <line x1="4" y1="17" x2="14" y2="17" />
                      }
                      @case ('markdown') {
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      }
                      @default {
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      }
                    }
                  </svg>
                </div>
                <span class="artifact-card__title">{{ artifact.title }}</span>
              </div>
              <div class="artifact-card__badges">
                <span class="artifact-card__badge artifact-card__badge--type">{{ artifact.type }}</span>
                @if (artifact.language) {
                  <span class="artifact-card__badge artifact-card__badge--lang">{{ artifact.language }}</span>
                }
                <span class="artifact-card__badge artifact-card__badge--source">{{ artifact.sourceType }}</span>
              </div>
              <div class="artifact-card__preview">{{ getPreview(artifact) }}</div>
              <div class="artifact-card__footer">
                <span class="artifact-card__date">{{ formatDate(artifact.createdAt) }}</span>
                <span class="artifact-card__view-btn">View</span>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;

    .artifacts {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow-y: auto;
      padding: $spacing-xl $spacing-xl $spacing-2xl;

      @include mobile {
        padding: $spacing-md;
      }
    }

    .artifacts__header {
      margin-bottom: $spacing-lg;
    }

    .artifacts__title {
      font-size: var(--text-xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-primary);
      letter-spacing: -0.02em;
      margin: 0;
    }

    .artifacts__subtitle {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin: $spacing-xs 0 0;
    }

    .artifacts__toolbar {
      display: flex;
      gap: $spacing-md;
      align-items: center;
      margin-bottom: $spacing-lg;
      flex-wrap: wrap;
    }

    .artifacts__search {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
      flex: 1;
      min-width: 200px;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: $radius-lg;
      padding: $spacing-sm $spacing-md;
      transition: border-color $transition-fast;

      &:focus-within {
        border-color: var(--color-primary);
      }
    }

    .artifacts__search-icon {
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    .artifacts__search-input {
      flex: 1;
      background: none;
      border: none;
      outline: none;
      font-size: var(--text-sm);
      color: var(--color-text-primary);
      font-family: inherit;

      &::placeholder {
        color: var(--color-text-muted);
      }
    }

    .artifacts__search-clear {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--color-text-muted);
      padding: $spacing-2xs;
      border-radius: $radius-sm;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        color: var(--color-text-primary);
        background: var(--color-bg-tertiary);
      }
    }

    .artifacts__filters {
      display: flex;
      gap: $spacing-sm;
    }

    .artifacts__filter-select {
      padding: $spacing-sm $spacing-md;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: $radius-lg;
      color: var(--color-text-primary);
      font-size: var(--text-sm);
      font-family: inherit;
      cursor: pointer;
      outline: none;

      &:focus {
        border-color: var(--color-primary);
      }
    }

    .artifacts__loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: $spacing-2xl;
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .artifacts__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: $spacing-md;

      @include mobile {
        grid-template-columns: 1fr;
      }
    }

    .artifact-card {
      border: 1px solid var(--color-border);
      border-radius: $radius-lg;
      background: var(--color-bg-primary);
      padding: $spacing-md;
      cursor: pointer;
      transition: all $transition-fast;
      display: flex;
      flex-direction: column;
      gap: $spacing-sm;

      &:hover {
        border-color: var(--color-primary);
        box-shadow: $shadow-sm;
        transform: translateY(-1px);
      }
    }

    .artifact-card__header {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
    }

    .artifact-card__icon-badge {
      width: 28px;
      height: 28px;
      border-radius: $radius-md;
      background: var(--gradient-surface);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-primary);
      flex-shrink: 0;
    }

    .artifact-card__title {
      font-size: var(--text-sm);
      font-weight: var(--font-weight-semibold);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--color-text-primary);
    }

    .artifact-card__badges {
      display: flex;
      gap: $spacing-xs;
      flex-wrap: wrap;
    }

    .artifact-card__badge {
      font-size: var(--text-xs);
      padding: $spacing-2xs $spacing-sm;
      border-radius: $radius-full;
      font-weight: var(--font-weight-medium);

      &--type {
        background: var(--color-bg-tertiary);
        color: var(--color-text-secondary);
      }

      &--lang {
        background: var(--gradient-surface);
        color: var(--color-primary);
      }

      &--source {
        background: var(--color-bg-tertiary);
        color: var(--color-text-muted);
      }
    }

    .artifact-card__preview {
      font-size: var(--text-xs);
      font-family: var(--font-family-mono);
      color: var(--color-text-secondary);
      max-height: 54px;
      overflow: hidden;
      opacity: 0.7;
      white-space: pre-wrap;
      line-height: 1.4;
    }

    .artifact-card__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: auto;
    }

    .artifact-card__date {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .artifact-card__view-btn {
      font-size: var(--text-xs);
      color: var(--color-primary);
      font-weight: var(--font-weight-medium);
    }
  `,
})
export class ArtifactsComponent {
  protected readonly artifactService = inject(ArtifactService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly searchQuery = signal('');
  protected readonly typeFilter = signal<ArtifactType | ''>('');
  protected readonly sourceFilter = signal<ArtifactSourceType | ''>('');

  private readonly searchSubject = new Subject<string>();

  protected readonly isSearching = computed(() => this.searchQuery().trim().length > 0);

  protected readonly displayedArtifacts = computed(() => {
    if (this.isSearching()) {
      return this.applyLocalFilters(this.artifactService.searchResults());
    }
    return this.applyLocalFilters(this.artifactService.artifacts());
  });

  protected readonly emptyMessage = computed(() => {
    if (this.isSearching()) {
      return 'No artifacts match your search. Try a different query.';
    }
    if (this.typeFilter() || this.sourceFilter()) {
      return 'No artifacts match the current filters.';
    }
    return 'Artifacts from your chats, tasks, and triggers will appear here.';
  });

  constructor() {
    this.artifactService.loadArtifacts();

    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        if (query.trim()) {
          this.artifactService.searchArtifacts(query);
        } else {
          this.artifactService.searchResults.set([]);
        }
      });
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
    this.artifactService.searchResults.set([]);
  }

  protected onTypeFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ArtifactType | '';
    this.typeFilter.set(value);
    if (!this.isSearching()) {
      const filters: { type?: ArtifactType; sourceType?: ArtifactSourceType } = {};
      if (value) filters.type = value;
      const src = this.sourceFilter();
      if (src) filters.sourceType = src;
      this.artifactService.loadArtifacts(filters);
    }
  }

  protected onSourceFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ArtifactSourceType | '';
    this.sourceFilter.set(value);
    if (!this.isSearching()) {
      const filters: { type?: ArtifactType; sourceType?: ArtifactSourceType } = {};
      const t = this.typeFilter();
      if (t) filters.type = t;
      if (value) filters.sourceType = value;
      this.artifactService.loadArtifacts(filters);
    }
  }

  protected onViewArtifact(artifact: Artifact): void {
    this.artifactService.open({
      id: artifact.id,
      title: artifact.title,
      type: artifact.type,
      language: artifact.language,
      content: artifact.content,
    });
  }

  protected getPreview(artifact: Artifact): string {
    return artifact.content.split('\n').slice(0, 3).join('\n');
  }

  protected formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  private applyLocalFilters(artifacts: Artifact[]): Artifact[] {
    let result = artifacts;
    const typeF = this.typeFilter();
    const sourceF = this.sourceFilter();
    if (typeF) {
      result = result.filter((a) => a.type === typeF);
    }
    if (sourceF) {
      result = result.filter((a) => a.sourceType === sourceF);
    }
    return result;
  }
}
