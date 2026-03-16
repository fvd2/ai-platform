import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/app-shell').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'chat',
        loadComponent: () => import('./features/chat/chat').then((m) => m.ChatComponent),
      },
      {
        path: 'chat/:conversationId',
        loadComponent: () => import('./features/chat/chat').then((m) => m.ChatComponent),
      },
      {
        path: 'tasks',
        loadComponent: () => import('./features/tasks/tasks').then((m) => m.TasksComponent),
      },
      {
        path: 'triggers',
        loadComponent: () =>
          import('./features/triggers/triggers').then((m) => m.TriggersComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings').then((m) => m.SettingsComponent),
      },
      { path: '', redirectTo: 'chat', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
