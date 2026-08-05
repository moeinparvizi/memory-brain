import { Component, inject, signal, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (isOpen()) {
      <div class="search-overlay" (click)="close()">
        <div class="search-modal" (click)="$event.stopPropagation()">
          <div class="search-input-row">
            <span class="text-slate-400">🔍</span>
            <input
              #searchInput
              type="text"
              [(ngModel)]="query"
              (input)="onSearch()"
              placeholder="جستجو در تمام بخش‌ها..."
              class="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
              autofocus
            >
            <button (click)="close()" class="text-slate-500 hover:text-slate-300 text-xs px-2 py-1 rounded bg-slate-800/50">ESC</button>
          </div>

          <div class="search-results">
            @if (searching()) {
              <div class="p-4 text-center text-slate-500 text-sm">در حال جستجو...</div>
            } @else if (results().length > 0) {
              <div class="py-2">
                @for (result of results(); track $index) {
                  <button
                    (click)="navigateTo(result.route)"
                    class="search-result-item"
                  >
                    <span class="text-lg">{{ result.icon }}</span>
                    <div class="flex-1 min-w-0 text-right">
                      <p class="text-sm text-white truncate">{{ result.label }}</p>
                      @if (result.detail) {
                        <p class="text-xs text-slate-500 truncate">{{ result.detail }}</p>
                      }
                    </div>
                    <span class="text-[10px] text-slate-500 bg-slate-800/50 px-2 py-1 rounded">{{ getTypeLabel(result.type) }}</span>
                  </button>
                }
              </div>
            } @else if (query.length >= 2) {
              <div class="p-4 text-center text-slate-500 text-sm">نتیجه‌ای یافت نشد</div>
            } @else {
              <div class="p-4 text-center text-slate-600 text-xs">حداقل ۲ حرف تایپ کنید</div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .search-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 9999;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 10vh;
    }

    .search-modal {
      width: 100%;
      max-width: 32rem;
      margin: 0 1rem;
      background: rgba(15, 23, 42, 0.98);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 16px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }

    .search-input-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(51, 65, 85, 0.5);
    }

    .search-results {
      max-height: 320px;
      overflow-y: auto;
    }

    .search-result-item {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 10px 16px;
      text-align: right;
      transition: background 0.15s;
      cursor: pointer;
      border: none;
      background: none;
      color: inherit;
    }

    .search-result-item:hover {
      background: rgba(139, 92, 246, 0.08);
    }
  `]
})
export class SearchComponent {
  private api = inject(ApiService);
  private router = inject(Router);

  isOpen = signal(false);
  query = '';
  results = signal<any[]>([]);
  searching = signal(false);
  private searchTimeout: any;

  constructor() {
    window.addEventListener('open-search', () => this.openSearch());
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      this.openSearch();
    }
    if (e.key === 'Escape' && this.isOpen()) {
      this.close();
    }
  }

  openSearch() {
    this.isOpen.set(true);
    this.query = '';
    this.results.set([]);
  }

  close() {
    this.isOpen.set(false);
  }

  onSearch() {
    clearTimeout(this.searchTimeout);
    if (this.query.trim().length < 2) {
      this.results.set([]);
      return;
    }
    this.searching.set(true);
    this.searchTimeout = setTimeout(() => {
      this.api.search(this.query).subscribe({
        next: (data) => {
          this.results.set(data.results || []);
          this.searching.set(false);
        },
        error: () => this.searching.set(false)
      });
    }, 300);
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
    this.close();
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'phase': 'نقشه راه',
      'task': 'تسک',
      'habit': 'عادت',
      'supplement-slot': 'زمان‌بندی',
      'supplement': 'مکمل',
      'finance': 'مالی',
      'debt': 'بدهی',
      'resource': 'منبع',
      'checklist': 'چک‌لیست',
      'schedule': 'برنامه',
      'workout': 'ورزش',
    };
    return labels[type] || type;
  }
}
