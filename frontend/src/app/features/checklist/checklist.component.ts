import { LocaleService } from '../../core/services/locale.service';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ChecklistItem } from '../../shared/models/checklist.model';

@Component({
  selector: 'app-checklist',
  standalone: true,
  imports: [FormsModule, EmptyStateComponent, ConfirmDialogComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">{{ i18n.t('چک‌لیست') }}</h2>
      </div>

      <div class="flex gap-2 flex-wrap">
        <button
          (click)="filterCategory.set(null)"
          [class]="filterCategory() === null ? 'btn-primary' : 'btn-ghost'"
        >
          {{ i18n.t('همه') }}
        </button>
        @for (cat of categories(); track cat) {
          <button
            (click)="filterCategory.set(cat)"
            [class]="filterCategory() === cat ? 'btn-primary' : 'btn-ghost'"
          >
            {{ cat }}
          </button>
        }
      </div>

      <div class="card">
        <form (ngSubmit)="addItem()" class="flex flex-wrap gap-3 mb-4">
          <input
            [(ngModel)]="newItemText"
            name="itemText"
            [attr.aria-label]="i18n.t('متن آیتم جدید')"
            class="input-field flex-1 min-w-0"
            [placeholder]="i18n.t('آیتم جدید اضافه کنید...')"
          >
          <select [(ngModel)]="newItemCategory" name="itemCategory" [attr.aria-label]="i18n.t('دسته آیتم جدید')" class="select-field w-40">
            <option value="">{{ i18n.t('بدون دسته') }}</option>
            @for (cat of categories(); track cat) {
              <option [value]="cat">{{ cat }}</option>
            }
          </select>
          <button type="submit" [disabled]="saving()" class="btn-primary disabled:opacity-50">{{ saving() ? i18n.t('در حال افزودن…') : i18n.t('افزودن') }}</button>
        </form>

        @if (saveError()) { <p role="alert" class="text-red-400 text-sm mb-4">{{ i18n.t(saveError()) }}</p> }
        @if (filteredItems().length === 0) {
          <app-empty-state [message]="i18n.t('آیتمی ثبت نشده')" icon="📋"></app-empty-state>
        } @else {
          <div class="space-y-2">
            @for (item of filteredItems(); track item.id) {
              <div class="flex items-center gap-3 p-3 bg-slate-800 rounded-lg hover:bg-dark-hover transition-colors">
                <input
                  type="checkbox"
                  [checked]="item.done"
                  (change)="toggleItem(item.id, $any($event.target).checked)"
                  class="w-4 h-4 rounded border-dark-border text-primary-500 focus:ring-primary-500"
                >
                <span [class]="item.done ? 'line-through text-slate-500 flex-1' : 'flex-1'">{{ item.text }}</span>
                @if (item.category) {
                  <span class="badge bg-slate-600 text-slate-300">{{ item.category }}</span>
                }
                <button (click)="deleteItem(item.id)" class="p-1 hover:bg-dark-hover rounded">🗑️</button>
              </div>
            }
          </div>
        }
      </div>

      @if (confirmDelete()) {
        <app-confirm-dialog
          [message]="i18n.t('آیا از حذف این آیتم مطمئن هستید؟')"
          (confirmed)="confirmDeleteAction()"
          (cancelled)="confirmDelete.set(false)"
        ></app-confirm-dialog>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ChecklistComponent implements OnInit {
  i18n = inject(LocaleService);
  private api = inject(ApiService);

  items = signal<ChecklistItem[]>([]);
  filterCategory = signal<string | null>(null);
  saveError = signal('');
  saving = signal(false);
  confirmDelete = signal(false);
  private pendingDeleteId = 0;

  newItemText = '';
  newItemCategory = '';

  ngOnInit() {
    this.loadItems();
  }

  private loadItems() {
    this.api.getChecklist().subscribe({
      next: (items) => this.items.set(items)
    });
  }

  categories(): string[] {
    const cats = new Set<string>();
    this.items().forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
  }

  filteredItems(): ChecklistItem[] {
    const cat = this.filterCategory();
    if (!cat) return this.items();
    return this.items().filter(i => i.category === cat);
  }

  addItem() {
    if (this.saving()) return;
    if (!this.newItemText.trim()) { this.saveError.set('متن آیتم را وارد کنید.'); return; }
    this.saveError.set('');

    const item: Partial<ChecklistItem> = {
      text: this.newItemText.trim(),
      done: false,
      category: this.newItemCategory || null,
      order: this.items().length
    };

    this.saving.set(true);
    this.api.createChecklistItem(item).subscribe({
      next: (saved) => {
        this.filterCategory.set(null);
        this.items.update(items => [...items, saved]);
        this.newItemText = '';
        this.newItemCategory = '';
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('ذخیره آیتم انجام نشد؛ اتصال خود را بررسی و دوباره تلاش کنید.');
      }
    });
  }

  toggleItem(id: number, done: boolean) {
    this.api.toggleChecklistItem(id, done).subscribe({
      next: () => this.loadItems()
    });
  }

  deleteItem(id: number) {
    this.pendingDeleteId = id;
    this.confirmDelete.set(true);
  }

  confirmDeleteAction() {
    this.api.deleteChecklistItem(this.pendingDeleteId).subscribe({
      next: () => this.loadItems()
    });
    this.confirmDelete.set(false);
  }
}
