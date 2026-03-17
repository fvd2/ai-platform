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
        <div class="shell__logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="url(#logoGrad)" />
            <path
              d="M8 19V9l6 5 6-5v10"
              stroke="#fff"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="28" y2="28">
                <stop stop-color="#818cf8" />
                <stop offset="1" stop-color="#7c3aed" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <nav class="shell__nav" aria-label="Main navigation">
          <a
            routerLink="/chat"
            routerLinkActive="shell__nav-item--active"
            #chatLink="routerLinkActive"
            class="shell__nav-item"
            [attr.aria-current]="chatLink.isActive ? 'page' : null"
            title="Chat"
          >
            <svg class="shell__nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span class="shell__nav-label">Chat</span>
          </a>
          <a
            routerLink="/tasks"
            routerLinkActive="shell__nav-item--active"
            #tasksLink="routerLinkActive"
            class="shell__nav-item"
            [attr.aria-current]="tasksLink.isActive ? 'page' : null"
            title="Tasks"
          >
            <svg class="shell__nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span class="shell__nav-label">Tasks</span>
          </a>
          <a
            routerLink="/triggers"
            routerLinkActive="shell__nav-item--active"
            #triggersLink="routerLinkActive"
            class="shell__nav-item"
            [attr.aria-current]="triggersLink.isActive ? 'page' : null"
            title="Triggers"
          >
            <svg class="shell__nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span class="shell__nav-label">Triggers</span>
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
          <svg class="shell__nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span class="shell__nav-label">Settings</span>
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
                <button (click)="onCopyArtifact()" title="Copy to clipboard" class="artifact-panel__action-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                <button
                  (click)="artifactService.close()"
                  title="Close"
                  aria-label="Close artifact panel"
                  class="artifact-panel__action-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
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
      background: var(--gradient-nav);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: $spacing-md 0;
      border-right: 1px solid rgb(255 255 255 / 0.06);

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
        border-top: 1px solid rgb(255 255 255 / 0.08);
        border-right: none;
      }
    }

    .shell__logo {
      padding: 0 0 $spacing-lg;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: center;

      @include mobile-and-tablet {
        display: none;
      }
    }

    .shell__nav {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $spacing-2xs;
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
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: $radius-lg;
      color: rgb(255 255 255 / 0.55);
      text-decoration: none;
      transition: all $transition-fast;
      border: none;
      background: transparent;
      cursor: pointer;
      gap: 2px;
      position: relative;

      &:hover {
        background: rgb(255 255 255 / 0.08);
        color: rgb(255 255 255 / 0.9);
      }

      &--active {
        background: rgb(255 255 255 / 0.12);
        color: #fff;

        &::before {
          content: '';
          position: absolute;
          left: -2px;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background: var(--color-primary);
          border-radius: 0 2px 2px 0;

          @include mobile-and-tablet {
            left: 50%;
            top: auto;
            bottom: 0;
            transform: translateX(-50%);
            width: 20px;
            height: 3px;
            border-radius: 2px 2px 0 0;
          }
        }
      }

      &--bottom {
        margin-top: auto;
        margin-bottom: $spacing-xs;

        @include mobile-and-tablet {
          margin-top: 0;
          margin-bottom: 0;
        }
      }

      @include mobile-and-tablet {
        width: 52px;
        height: 52px;
        border-radius: $radius-lg;
      }
    }

    .shell__nav-icon {
      width: 20px;
      height: 20px;

      @include mobile-and-tablet {
        width: 22px;
        height: 22px;
      }
    }

    .shell__nav-label {
      font-size: 10px;
      font-weight: var(--font-weight-medium);
      letter-spacing: 0.01em;

      @include mobile-and-tablet {
        font-size: 10px;
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
      box-shadow: -4px 0 24px rgb(0 0 0 / 0.04);

      @include mobile-and-tablet {
        position: fixed;
        inset: 0;
        bottom: $mobile-bottom-nav-height;
        width: 100%;
        min-width: unset;
        z-index: 50;
        border-left: none;
        animation: slide-up $transition-slow;
        box-shadow: 0 -4px 24px rgb(0 0 0 / 0.1);
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
    }

    .artifact-panel__action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      border-radius: $radius-md;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all $transition-fast;

      &:hover {
        background: var(--color-bg-tertiary);
        color: var(--color-text-primary);
      }

      @include mobile-and-tablet {
        width: 40px;
        height: 40px;
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
      padding: $spacing-2xs $spacing-sm;
      background: var(--color-bg-tertiary);
      border-radius: $radius-full;
      font-weight: var(--font-weight-medium);
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
