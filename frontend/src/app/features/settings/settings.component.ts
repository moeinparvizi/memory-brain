import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  template: `
    <div class="space-y-6">
      <div class="flex items-center gap-3">
        <span class="text-3xl">⚙️</span>
        <h2 class="text-2xl font-bold text-primary-400">تنظیمات</h2>
      </div>

      <!-- Export -->
      <div class="card">
        <h3 class="text-sm font-semibold mb-4 text-slate-300 flex items-center gap-2">
          <span>📤</span> خروجی JSON
        </h3>
        <p class="text-xs text-slate-500 mb-4">تمام اطلاعات شما در یک فایل JSON ذخیره می‌شود</p>
        <button (click)="exportData()" [disabled]="exporting()" class="btn-primary">
          @if (exporting()) {
            <span class="animate-spin">⏳</span> در حال خروجی...
          } @else {
            📥 دانلود فایل پشتیبان
          }
        </button>
      </div>

      <!-- Import -->
      <div class="card">
        <h3 class="text-sm font-semibold mb-4 text-slate-300 flex items-center gap-2">
          <span>📥</span> ورودی JSON
        </h3>
        <p class="text-xs text-slate-500 mb-4">اطلاعات از فایل JSON قبلی بازیابی می‌شود</p>
        <div class="flex items-center gap-4">
          <label class="btn-secondary cursor-pointer">
            @if (importing()) {
              <span class="animate-spin">⏳</span> در حال ورودی...
            } @else {
              📂 انتخاب فایل
            }
            <input type="file" accept=".json" (change)="onFileSelect($event)" class="hidden" [disabled]="importing()">
          </label>
          @if (importMessage()) {
            <span [class]="importSuccess() ? 'text-green-400' : 'text-red-400'" class="text-sm">{{ importMessage() }}</span>
          }
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="card border-red-500/20">
        <h3 class="text-sm font-semibold mb-4 text-red-400 flex items-center gap-2">
          <span>⚠️</span> منطقه خطر
        </h3>
        <p class="text-xs text-slate-500 mb-4">حذف تمام اطلاعات (غیرقابل بازیابی)</p>
        <button (click)="confirmDelete()" class="px-4 py-2 bg-red-500/15 text-red-400 rounded-xl text-sm hover:bg-red-500/25 transition-colors">
          🗑️ حذف همه اطلاعات
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class SettingsComponent {
  private api = inject(ApiService);
  private router = inject(Router);

  exporting = signal(false);
  importing = signal(false);
  importMessage = signal('');
  importSuccess = signal(false);

  exportData() {
    this.exporting.set(true);
    this.api.exportData().subscribe({
      next: (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `memory-gohar-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => {
        this.exporting.set(false);
      }
    });
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        this.importing.set(true);
        this.importMessage.set('');
        this.api.importData(json.data || json).subscribe({
          next: () => {
            this.importing.set(false);
            this.importMessage.set('ورودی با موفقیت انجام شد');
            this.importSuccess.set(true);
          },
          error: (err) => {
            this.importing.set(false);
            this.importMessage.set('خطا در ورودی: ' + (err.error?.error || 'خطای ناشناخته'));
            this.importSuccess.set(false);
          }
        });
      } catch {
        this.importMessage.set('فایل JSON نامعتبر است');
        this.importSuccess.set(false);
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  confirmDelete() {
    if (confirm('آیا مطمئن هستید؟ تمام اطلاعات شما حذف خواهد شد.')) {
      // For now just redirect to logout
      this.router.navigate(['/login']);
    }
  }
}
