import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { Resource } from '../../shared/models/resource.model';

@Component({
  selector: 'app-resources',
  standalone: true,
  imports: [FormsModule, EmptyStateComponent, ConfirmDialogComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">منابع</h2>
        <button (click)="showModal.set(true)" class="btn-primary">
          + منبع جدید
        </button>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          (click)="filterType.set(null)"
          [class]="filterType() === null ? 'btn-primary' : 'btn-ghost'"
        >
          همه
        </button>
        <button
          (click)="filterType.set('book')"
          [class]="filterType() === 'book' ? 'btn-primary' : 'btn-ghost'"
        >
          📖 کتاب
        </button>
        <button
          (click)="filterType.set('course')"
          [class]="filterType() === 'course' ? 'btn-primary' : 'btn-ghost'"
        >
          🎓 دوره
        </button>
        <button
          (click)="filterType.set('website')"
          [class]="filterType() === 'website' ? 'btn-primary' : 'btn-ghost'"
        >
          🌐 وبسایت
        </button>
        <button
          (click)="filterType.set('youtube')"
          [class]="filterType() === 'youtube' ? 'btn-primary' : 'btn-ghost'"
        >
          🎬 یوتیوب
        </button>
      </div>

      @if (filteredResources().length === 0) {
        <app-empty-state message="منبعی ثبت نشده" icon="📚"></app-empty-state>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (resource of filteredResources(); track resource.id) {
            <div class="card card-hover animate-slide-up">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-lg">{{ getTypeIcon(resource.type) }}</span>
                    <span [class]="getTypeBadgeClass(resource.type)">{{ getTypeText(resource.type) }}</span>
                  </div>
                  <h3 class="font-semibold">{{ resource.name }}</h3>
                  <p class="text-sm text-slate-400 mt-1">{{ resource.topic }}</p>
                  @if (resource.url) {
                    <a
                      [href]="resource.url"
                      target="_blank"
                      class="text-sm text-primary-400 hover:text-primary-300 mt-2 inline-block"
                    >
                      🔗 مشاهده لینک
                    </a>
                  }
                </div>
                <div class="flex gap-1">
                  <button (click)="editResource(resource)" class="p-2 hover:bg-dark-hover rounded-lg">✏️</button>
                  <button (click)="deleteResource(resource.id)" class="p-2 hover:bg-dark-hover rounded-lg">🗑️</button>
                </div>
              </div>
            </div>
          }
        </div>
      }

      @if (showModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div class="bg-dark-card border border-dark-border rounded-xl p-6 max-w-md w-full mx-4 animate-slide-up">
            <h3 class="text-lg font-semibold mb-4">{{ editingResource() ? 'ویرایش منبع' : 'منبع جدید' }}</h3>
            <div class="space-y-4">
              <div>
                <label class="label">نام</label>
                <input [(ngModel)]="form.name" class="input-field" placeholder="نام منبع">
              </div>
              <div>
                <label class="label">موضوع</label>
                <input [(ngModel)]="form.topic" class="input-field" placeholder="موضوع">
              </div>
              <div>
                <label class="label">نوع</label>
                <select [(ngModel)]="form.type" class="select-field">
                  <option value="book">کتاب</option>
                  <option value="course">دوره</option>
                  <option value="website">وبسایت</option>
                  <option value="youtube">یوتیوب</option>
                </select>
              </div>
              <div>
                <label class="label">لینک</label>
                <input [(ngModel)]="form.url" class="input-field" placeholder="https://...">
              </div>
              <div class="flex gap-3 justify-end">
                <button (click)="closeModal()" class="btn-secondary">لغو</button>
                <button (click)="save()" class="btn-primary">ذخیره</button>
              </div>
            </div>
          </div>
        </div>
      }

      @if (confirmDelete()) {
        <app-confirm-dialog
          message="آیا از حذف این منبع مطمئن هستید؟"
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
export class ResourcesComponent implements OnInit {
  private api = inject(ApiService);

  resources = signal<Resource[]>([]);
  filterType = signal<string | null>(null);
  showModal = signal(false);
  editingResource = signal<Resource | null>(null);
  confirmDelete = signal(false);
  private pendingDeleteId = 0;

  form: Partial<Resource> = { name: '', topic: '', type: 'book', url: '' };

  ngOnInit() {
    this.loadResources();
  }

  private loadResources() {
    this.api.getResources().subscribe({
      next: (resources) => this.resources.set(resources)
    });
  }

  filteredResources(): Resource[] {
    const type = this.filterType();
    if (!type) return this.resources();
    return this.resources().filter(r => r.type === type);
  }

  editResource(resource: Resource) {
    this.editingResource.set(resource);
    this.form = {
      name: resource.name,
      topic: resource.topic,
      type: resource.type,
      url: resource.url
    };
    this.showModal.set(true);
  }

  deleteResource(id: number) {
    this.pendingDeleteId = id;
    this.confirmDelete.set(true);
  }

  confirmDeleteAction() {
    this.api.deleteResource(this.pendingDeleteId).subscribe({
      next: () => this.loadResources()
    });
    this.confirmDelete.set(false);
  }

  save() {
    if (this.editingResource()) {
      this.api.updateResource(this.editingResource()!.id, this.form).subscribe({
        next: () => {
          this.loadResources();
          this.closeModal();
        }
      });
    } else {
      this.api.createResource(this.form).subscribe({
        next: () => {
          this.loadResources();
          this.closeModal();
        }
      });
    }
  }

  closeModal() {
    this.showModal.set(false);
    this.editingResource.set(null);
    this.form = { name: '', topic: '', type: 'book', url: '' };
  }

  getTypeIcon(type: string | null): string {
    switch (type) {
      case 'book': return '📖';
      case 'course': return '🎓';
      case 'website': return '🌐';
      case 'youtube': return '🎬';
      default: return '📄';
    }
  }

  getTypeBadgeClass(type: string | null): string {
    switch (type) {
      case 'book': return 'badge bg-amber-500/20 text-amber-400';
      case 'course': return 'badge bg-blue-500/20 text-blue-400';
      case 'website': return 'badge bg-green-500/20 text-green-400';
      case 'youtube': return 'badge bg-red-500/20 text-red-400';
      default: return 'badge bg-slate-500/20 text-slate-400';
    }
  }

  getTypeText(type: string | null): string {
    switch (type) {
      case 'book': return 'کتاب';
      case 'course': return 'دوره';
      case 'website': return 'وبسایت';
      case 'youtube': return 'یوتیوب';
      default: return 'نامشخص';
    }
  }
}
