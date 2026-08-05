import { Component, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { PersianDatePipe } from '../../pipes/persian-date.pipe';
import { SearchComponent } from '../search/search.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [PersianDatePipe, SearchComponent],
  template: `
    <header class="header-glass px-4 lg:px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button
            (click)="toggleSidebar.emit()"
            class="lg:hidden p-2 rounded-xl hover:bg-galaxy-hover text-slate-300 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <div>
            <h2 class="text-lg font-semibold text-white">{{ pageTitle }}</h2>
            <p class="text-sm text-slate-400">{{ currentDate | persianDate }}</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <app-search></app-search>
          @if (currentActivity) {
            <div class="hidden md:flex activity-badge">
              <span class="activity-dot"></span>
              <span class="text-sm text-primary-300">{{ currentActivity }}</span>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
    }

    .header-glass {
      background: rgba(10, 10, 26, 0.6);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(139, 92, 246, 0.08);
    }

    .activity-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 12px;
      backdrop-filter: blur(8px);
    }

    .activity-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.2); }
    }
  `]
})
export class HeaderComponent implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();

  private router = inject(Router);

  pageTitle = 'داشبورد';
  currentDate = new Date();
  currentActivity: string | null = null;

  private pageTitles: Record<string, string> = {
    '/dashboard': 'داشبورد',
    '/roadmap': 'نقشه راه',
    '/schedule': 'برنامه روزانه',
    '/workout': 'ورزش',
    '/supplements': 'مکمل‌ها',
    '/habits': 'عادت‌ها',
    '/finance': 'مالی',
    '/resources': 'منابع',
    '/checklist': 'چک‌لیست',
    '/login': 'ورود'
  };

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.pageTitle = this.pageTitles[event.url] || 'داشبورد';
      this.updateCurrentActivity();
    });

    this.updateCurrentActivity();
    setInterval(() => {
      this.currentDate = new Date();
      this.updateCurrentActivity();
    }, 60000);
  }

  private updateCurrentActivity() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 7) {
      this.currentActivity = 'بیدار شدن و صبحانه';
    } else if (hour >= 7 && hour < 9) {
      this.currentActivity = 'یادگیری و مطالعه';
    } else if (hour >= 9 && hour < 17) {
      this.currentActivity = 'کار';
    } else if (hour >= 17 && hour < 19) {
      this.currentActivity = 'ورزش';
    } else if (hour >= 19 && hour < 21) {
      this.currentActivity = 'یادگیری و پروژه';
    } else if (hour >= 21 && hour < 23) {
      this.currentActivity = 'استراحت و تفریح';
    } else {
      this.currentActivity = 'خواب';
    }
  }
}
