import { Component, inject, signal, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="relative">
      <button
        (click)="openSearch()"
        class="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:border-primary-500/30 hover:text-slate-300 transition-all text-sm"
      >
        <span>🔍</span>
        <span class="hidden md:inline">جستجو...</span>
        <kbd class="hidden md:inline text-[10px] bg-slate-700/50 px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>

      @if (isOpen()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[10vh]" (click)="close()">
          <div class="w-full max-w-lg mx-4" (click)="$event.stopPropagation()">
            <div class="card p-0 overflow-hidden">
              <!-- Search Input -->
              <div class="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
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
                <button (click)="close()" class="text-slate-500 hover:text-slate-300 text-xs">ESC</button>
              </div>

              <!-- Results -->
              <div class="max-h-80 overflow-y-auto">
                @if (searching()) {
                  <div class="p-4 text-center text-slate-500 text-sm">در حال جستجو...</div>
                } @else if (results().length > 0) {
                  <div class="py-2">
                    @for (result of results(); track $index) {
                      <button
                        (click)="navigateTo(result.route)"
                        class="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-800/50 transition-colors text-right"
                      >
                        <span class="text-lg">{{ result.icon }}</span>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm text-white truncate">{{ result.label }}</p>
                          @if (result.detail) {
                            <p class="text-xs text-slate-500 truncate">{{ result.detail }}</p>
                          }
                        </div>
                        <span class="text-[10px] text-slate-600">{{ getTypeLabel(result.type) }}</span>
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
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
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
