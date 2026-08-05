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
        <h2 class="text-2xl font-bold">چک‌لیست</h2>
      </div>

      <div class="flex gap-2 flex-wrap">
        <button
          (click)="filterCategory.set(null)"
          [class]="filterCategory() === null ? 'btn-primary' : 'btn-ghost'"
        >
          همه
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
        <div class="flex gap-3 mb-4">
          <input
            [(ngModel)]="newItemText"
            class="input-field flex-1"
            placeholder="آیتم جدید اضافه کنید..."
            (keyup.enter)="addItem()"
          >
          <select [(ngModel)]="newItemCategory" class="select-field w-40">
            <option value="">بدون دسته</option>
            @for (cat of categories(); track cat) {
              <option [value]="cat">{{ cat }}</option>
            }
          </select>
          <button (click)="addItem()" class="btn-primary">افزودن</button>
        </div>

        @if (filteredItems().length === 0) {
          <app-empty-state message="آیتمی ثبت نشده" icon="📋"></app-empty-state>
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
          message="آیا از حذف این آیتم مطمئن هستید؟"
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
  private api = inject(ApiService);

  items = signal<ChecklistItem[]>([]);
  filterCategory = signal<string | null>(null);
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
    if (!this.newItemText.trim()) return;

    const item: Partial<ChecklistItem> = {
      text: this.newItemText.trim(),
      done: false,
      category: this.newItemCategory || null,
      order: this.items().length
    };

    this.api.createChecklistItem(item).subscribe({
      next: () => {
        this.loadItems();
        this.newItemText = '';
        this.newItemCategory = '';
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
