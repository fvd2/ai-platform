import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside class="shell__sidebar">
        <div class="shell__logo">AI Platform</div>
        <nav class="shell__nav" aria-label="Main navigation">
          <a
            routerLink="/chat"
            routerLinkActive="shell__nav-item--active"
            #chatLink="routerLinkActive"
            class="shell__nav-item"
            [attr.aria-current]="chatLink.isActive ? 'page' : null"
          >
            <span class="shell__nav-icon">💬</span>
            <span>Chat</span>
          </a>
          <a
            routerLink="/tasks"
            routerLinkActive="shell__nav-item--active"
            #tasksLink="routerLinkActive"
            class="shell__nav-item"
            [attr.aria-current]="tasksLink.isActive ? 'page' : null"
          >
            <span class="shell__nav-icon">📋</span>
            <span>Tasks</span>
          </a>
          <a
            routerLink="/triggers"
            routerLinkActive="shell__nav-item--active"
            #triggersLink="routerLinkActive"
            class="shell__nav-item"
            [attr.aria-current]="triggersLink.isActive ? 'page' : null"
          >
            <span class="shell__nav-icon">⚡</span>
            <span>Triggers</span>
          </a>
          <a
            routerLink="/settings"
            routerLinkActive="shell__nav-item--active"
            #settingsLink="routerLinkActive"
            class="shell__nav-item"
            [attr.aria-current]="settingsLink.isActive ? 'page' : null"
          >
            <span class="shell__nav-icon">⚙️</span>
            <span>Settings</span>
          </a>
        </nav>
      </aside>
      <main class="shell__content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;

    .shell {
      display: flex;
      min-height: 100dvh;
    }

    .shell__sidebar {
      width: var(--sidebar-width);
      min-width: var(--sidebar-width);
      background: var(--color-bg-primary);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      padding: $spacing-md;
    }

    .shell__logo {
      font-size: var(--text-lg);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-primary);
      padding: $spacing-sm $spacing-sm $spacing-lg;
    }

    .shell__nav {
      display: flex;
      flex-direction: column;
      gap: $spacing-2xs;
    }

    .shell__nav-item {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
      padding: $spacing-sm $spacing-md;
      border-radius: $radius-md;
      color: var(--color-text-secondary);
      font-size: var(--text-sm);
      font-weight: var(--font-weight-medium);
      text-decoration: none;
      transition: background $transition-fast, color $transition-fast;

      &:hover {
        background: var(--color-bg-secondary);
        color: var(--color-text-primary);
      }

      &--active {
        background: var(--color-primary-lighter);
        color: var(--color-primary);
      }
    }

    .shell__nav-icon {
      font-size: var(--text-base);
      width: 1.5rem;
      text-align: center;
    }

    .shell__content {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
  `,
})
export class AppShellComponent {}
