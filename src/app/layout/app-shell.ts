import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ArtifactService } from '../core/services/artifact.service';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside class="shell__rail">
        <div class="shell__logo">AI</div>
        <nav class="shell__nav" aria-label="Main navigation">
          <a
            routerLink="/chat"
            routerLinkActive="shell__nav-item--active"
            #chatLink="routerLinkActive"
            class="shell__nav-item"
            [attr.aria-current]="chatLink.isActive ? 'page' : null"
            title="Chat"
          >
            <span class="shell__nav-icon">💬</span>
          </a>
          <a
            routerLink="/tasks"
            routerLinkActive="shell__nav-item--active"
            #tasksLink="routerLinkActive"
            class="shell__nav-item"
            [attr.aria-current]="tasksLink.isActive ? 'page' : null"
            title="Tasks"
          >
            <span class="shell__nav-icon">📋</span>
          </a>
          <a
            routerLink="/triggers"
            routerLinkActive="shell__nav-item--active"
            #triggersLink="routerLinkActive"
            class="shell__nav-item"
            [attr.aria-current]="triggersLink.isActive ? 'page' : null"
            title="Triggers"
          >
            <span class="shell__nav-icon">⚡</span>
          </a>
        </nav>
        <a
          routerLink="/settings"
          routerLinkActive="shell__nav-item--active"
          #settingsLink="routerLinkActive"
          class="shell__nav-item shell__nav-item--bottom"
          [attr.aria-current]="settingsLink.isActive ? 'page' : null"
          title="Settings"
        >
          <span class="shell__nav-icon">⚙️</span>
        </a>
      </aside>
      <main class="shell__content">
        <router-outlet />
      </main>
      @if (artifactService.isOpen()) {
        <aside class="shell__artifact-panel">
          <div class="artifact-panel">
            <div class="artifact-panel__header">
              <span class="artifact-panel__title">{{
                artifactService.currentArtifact()?.title
              }}</span>
              <div class="artifact-panel__actions">
                <button (click)="onCopyArtifact()" title="Copy to clipboard">📋</button>
                <button
                  (click)="artifactService.close()"
                  title="Close"
                  aria-label="Close artifact panel"
                >
                  &times;
                </button>
              </div>
            </div>
            <div class="artifact-panel__meta">
              <span class="artifact-panel__type">{{
                artifactService.currentArtifact()?.type
              }}</span>
              @if (artifactService.currentArtifact()?.language) {
                <span class="artifact-panel__language">{{
                  artifactService.currentArtifact()?.language
                }}</span>
              }
            </div>
            <div class="artifact-panel__content">
              <pre><code>{{ artifactService.currentArtifact()?.content }}</code></pre>
            </div>
          </div>
        </aside>
      }
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;

    .shell {
      display: flex;
      min-height: 100dvh;

      @include mobile-and-tablet {
        flex-direction: column;
      }
    }

    // ── Icon Rail ──
    .shell__rail {
      width: var(--nav-rail-width);
      min-width: var(--nav-rail-width);
      background: var(--color-bg-dark);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: $spacing-sm 0;

      @include mobile-and-tablet {
        width: 100%;
        min-width: unset;
        flex-direction: row;
        order: 1;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 100;
        height: $mobile-bottom-nav-height;
        padding: 0;
        border-top: 1px solid rgb(255 255 255 / 0.1);
      }
    }

    .shell__logo {
      font-size: var(--text-lg);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-inverse);
      padding: $spacing-sm 0 $spacing-lg;
      user-select: none;

      @include mobile-and-tablet {
        display: none;
      }
    }

    .shell__nav {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $spacing-xs;
      width: 100%;

      @include mobile-and-tablet {
        flex-direction: row;
        justify-content: space-around;
        gap: 0;
        height: 100%;
      }
    }

    .shell__nav-item {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: $radius-md;
      color: var(--color-text-inverse);
      text-decoration: none;
      transition:
        background $transition-fast,
        color $transition-fast;
      border: none;
      background: transparent;
      cursor: pointer;
      opacity: 0.7;

      &:hover {
        background: rgb(255 255 255 / 0.1);
        opacity: 1;
      }

      &--active {
        background: rgb(59 130 246 / 0.15);
        color: var(--color-primary-light);
        opacity: 1;
      }

      &--bottom {
        margin-top: auto;
        margin-bottom: $spacing-sm;

        @include mobile-and-tablet {
          margin-top: 0;
          margin-bottom: 0;
        }
      }

      @include mobile-and-tablet {
        width: 48px;
        height: 48px;
        border-radius: $radius-lg;
      }
    }

    .shell__nav-icon {
      font-size: 20px;
      line-height: 1;

      @include mobile-and-tablet {
        font-size: 22px;
      }
    }

    // ── Main Content ──
    .shell__content {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-width: 0;

      @include mobile-and-tablet {
        padding-bottom: $mobile-bottom-nav-height;
      }
    }

    // ── Artifact Panel ──
    .shell__artifact-panel {
      width: var(--artifact-panel-width);
      min-width: var(--artifact-panel-width);
      border-left: 1px solid var(--color-border);
      background: var(--color-bg-primary);
      animation: slide-in-right $transition-slow;

      @include mobile-and-tablet {
        position: fixed;
        inset: 0;
        bottom: $mobile-bottom-nav-height;
        width: 100%;
        min-width: unset;
        z-index: 50;
        border-left: none;
        animation: slide-up $transition-slow;
      }
    }

    @keyframes slide-in-right {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slide-up {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .artifact-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .artifact-panel__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: $spacing-sm $spacing-md;
      border-bottom: 1px solid var(--color-border);
      gap: $spacing-sm;
    }

    .artifact-panel__title {
      font-size: var(--text-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }

    .artifact-panel__actions {
      display: flex;
      align-items: center;
      gap: $spacing-2xs;
      flex-shrink: 0;

      button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        border-radius: $radius-sm;
        font-size: var(--text-base);
        color: var(--color-text-secondary);
        cursor: pointer;
        transition: background $transition-fast;

        &:hover {
          background: var(--color-bg-secondary);
          color: var(--color-text-primary);
        }

        @include mobile-and-tablet {
          width: 40px;
          height: 40px;
        }
      }
    }

    .artifact-panel__meta {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
      padding: $spacing-xs $spacing-md;
      border-bottom: 1px solid var(--color-border-light);
    }

    .artifact-panel__type,
    .artifact-panel__language {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      padding: $spacing-2xs $spacing-xs;
      background: var(--color-bg-tertiary);
      border-radius: $radius-sm;
    }

    .artifact-panel__content {
      flex: 1;
      overflow-y: auto;
      padding: $spacing-md;

      pre {
        margin: 0;
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      code {
        font-family: var(--font-family-mono);
        font-size: var(--text-sm);
        line-height: var(--line-height-relaxed);
        color: var(--color-text-primary);
      }
    }
  `,
})
export class AppShellComponent {
  protected readonly artifactService = inject(ArtifactService);

  onCopyArtifact(): void {
    const content = this.artifactService.currentArtifact()?.content;
    if (content) {
      navigator.clipboard.writeText(content);
    }
  }
}
