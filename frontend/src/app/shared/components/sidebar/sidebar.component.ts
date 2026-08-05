import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside
      class="fixed top-0 right-0 h-full w-64 z-40 transition-transform duration-300 sidebar-glass"
      [class.translate-x-full]="!isOpen"
      [class.translate-x-0]="isOpen"
      [class.lg:translate-x-0]="true"
    >
      <div class="flex flex-col h-full">
        <!-- Logo -->
        <div class="p-6 border-b border-galaxy-border">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center glow">
              <span class="text-xl">🌌</span>
            </div>
            <div>
              <h1 class="text-lg font-bold bg-gradient-to-l from-primary-300 to-primary-500 bg-clip-text text-transparent">
                مموری مغر
              </h1>
              <p class="text-xs text-slate-500">مدیریت زندگی</p>
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 p-4 space-y-1">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="nav-active"
              class="nav-item"
              (click)="onNavClick()"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          }
          <div class="pt-2 mt-2 border-t border-galaxy-border">
            <a
              routerLink="/settings"
              routerLinkActive="nav-active"
              class="nav-item"
              (click)="onNavClick()"
            >
              <span class="nav-icon">⚙️</span>
              <span class="nav-label">تنظیمات</span>
            </a>
          </div>
        </nav>

        <!-- Footer -->
        <div class="p-4 border-t border-galaxy-border">
          @if (authService.user()) {
            <div class="flex items-center gap-3 mb-3 px-2">
              @if (authService.user()?.avatar) {
                <img [src]="authService.user().avatar" class="w-8 h-8 rounded-full border border-galaxy-border" alt="avatar">
              } @else {
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-sm font-bold">
                  {{ authService.user()?.name?.charAt(0) || 'م' }}
                </div>
              }
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-white truncate">{{ authService.user()?.name }}</p>
                <p class="text-xs text-slate-500 truncate">{{ authService.user()?.email }}</p>
              </div>
            </div>
          }
          <button
            (click)="onLogout()"
            class="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm"
          >
            <span>🚪</span>
            <span>خروج</span>
          </button>
        </div>
      </div>
    </aside>

    @if (isOpen) {
      <div
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
        (click)="onNavClick()"
      ></div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .sidebar-glass {
      background: rgba(10, 10, 26, 0.85);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-left: 1px solid rgba(139, 92, 246, 0.1);
      box-shadow: -4px 0 30px rgba(0, 0, 0, 0.3);
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 12px;
      color: #94a3b8;
      transition: all 0.2s ease;
      border: 1px solid transparent;
      text-decoration: none;
    }

    .nav-item:hover {
      background: rgba(139, 92, 246, 0.08);
      color: #e2e8f0;
      border-color: rgba(139, 92, 246, 0.1);
    }

    .nav-active {
      background: rgba(139, 92, 246, 0.15) !important;
      color: #a78bfa !important;
      border-color: rgba(139, 92, 246, 0.25) !important;
      box-shadow: 0 0 15px rgba(139, 92, 246, 0.1);
    }

    .nav-icon {
      font-size: 1.1rem;
      width: 24px;
      text-align: center;
    }

    .nav-label {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .glass-panel {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(139, 92, 246, 0.08);
    }
  `]
})
export class SidebarComponent {
  @Input() isOpen = false;
  @Output() toggle = new EventEmitter<void>();

  authService = inject(AuthService);

  navItems = [
    { path: '/dashboard', icon: '🏠', label: 'داشبورد' },
    { path: '/roadmap', icon: '🗺️', label: 'نقشه راه' },
    { path: '/schedule', icon: '📅', label: 'برنامه روزانه' },
    { path: '/workout', icon: '🏋️', label: 'ورزش' },
    { path: '/supplements', icon: '💊', label: 'مکمل‌ها' },
    { path: '/habits', icon: '✅', label: 'عادت‌ها' },
    { path: '/finance', icon: '💰', label: 'مالی' },
    { path: '/resources', icon: '📚', label: 'منابع' },
    { path: '/checklist', icon: '📋', label: 'چک‌لیست' },
  ];

  onNavClick() {
    this.toggle.emit();
  }

  onLogout() {
    this.authService.logout();
  }
}
