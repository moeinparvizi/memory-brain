import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'roadmap',
        loadComponent: () => import('./features/roadmap/roadmap.component').then(m => m.RoadmapComponent)
      },
      {
        path: 'schedule',
        loadComponent: () => import('./features/schedule/schedule.component').then(m => m.ScheduleComponent)
      },
      {
        path: 'workout',
        loadComponent: () => import('./features/workout/workout.component').then(m => m.WorkoutComponent)
      },
      {
        path: 'supplements',
        loadComponent: () => import('./features/supplements/supplements.component').then(m => m.SupplementsComponent)
      },
      {
        path: 'habits',
        loadComponent: () => import('./features/habits/habits.component').then(m => m.HabitsComponent)
      },
      {
        path: 'finance',
        loadComponent: () => import('./features/finance/finance.component').then(m => m.FinanceComponent)
      },
      {
        path: 'resources',
        loadComponent: () => import('./features/resources/resources.component').then(m => m.ResourcesComponent)
      },
      {
        path: 'checklist',
        loadComponent: () => import('./features/checklist/checklist.component').then(m => m.ChecklistComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      },
      { path: '**', redirectTo: 'dashboard' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
