import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { TimeSlot, Supplement, SupplementLog } from '../../shared/models/supplement.model';

@Component({
  selector: 'app-supplements',
  standalone: true,
  imports: [FormsModule, EmptyStateComponent, ConfirmDialogComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">مکمل‌ها</h2>
        <div class="flex gap-2">
          <button (click)="showSlotModal.set(true)" class="btn-secondary">
            + زمان‌بندی
          </button>
          <button (click)="showSupplementModal.set(true)" class="btn-primary">
            + مکمل جدید
          </button>
        </div>
      </div>

      <div class="card bg-blue-500/10 border-blue-500/30">
        <h3 class="font-medium mb-2">آمار هفتگی</h3>
        <div class="flex gap-4 text-sm">
          <span>مصرف شده: <strong class="text-green-400">{{ weeklyTaken }}</strong></span>
          <span>کل: <strong class="text-blue-400">{{ weeklyTotal }}</strong></span>
          <span>درصد: <strong class="text-primary-400">{{ weeklyPercentage }}%</strong></span>
        </div>
      </div>

      @if (timeSlots().length === 0) {
        <app-empty-state message="زمان‌بندی مکملی ثبت نشده" icon="💊"></app-empty-state>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (slot of timeSlots(); track slot.id) {
            <div class="card animate-slide-up">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <span class="text-2xl">{{ slot.emoji || '💊' }}</span>
                  <div>
                    <h3 class="font-semibold">{{ slot.label }}</h3>
                    <p class="text-sm text-slate-400">{{ slot.time }}</p>
                  </div>
                </div>
                <div class="flex gap-1">
                  <button (click)="editSlot(slot)" class="p-2 hover:bg-dark-hover rounded-lg">✏️</button>
                  <button (click)="deleteSlot(slot.id)" class="p-2 hover:bg-dark-hover rounded-lg">🗑️</button>
                </div>
              </div>

              <div class="space-y-2">
                @for (supplement of slot.supplements; track supplement.id) {
                  <div class="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <div class="flex items-center gap-3">
                      <input
                        type="checkbox"
                        [checked]="isTaken(supplement.id)"
                        (change)="toggleSupplement(supplement.id, $any($event.target).checked)"
                        class="w-4 h-4 rounded border-dark-border text-green-500 focus:ring-green-500"
                      >
                      <div>
                        <p class="font-medium">{{ supplement.name }}</p>
                        @if (supplement.dose) {
                          <p class="text-xs text-slate-400">{{ supplement.dose }}</p>
                        }
                      </div>
                    </div>
                    <div class="flex gap-1">
                      <button (click)="editSupplement(supplement)" class="p-1 hover:bg-dark-hover rounded">✏️</button>
                      <button (click)="deleteSupplement(supplement.id)" class="p-1 hover:bg-dark-hover rounded">🗑️</button>
                    </div>
                  </div>
                }
                @if (slot.supplements.length === 0) {
                  <p class="text-sm text-slate-500 text-center py-2">مکملی اضافه نشده</p>
                }
              </div>
            </div>
          }
        </div>
      }

      @if (showSlotModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div class="bg-dark-card border border-dark-border rounded-xl p-6 max-w-md w-full mx-4 animate-slide-up">
            <h3 class="text-lg font-semibold mb-4">{{ editingSlot() ? 'ویرایش زمان‌بندی' : 'زمان‌بندی جدید' }}</h3>
            <div class="space-y-4">
              <div>
                <label class="label">عنوان</label>
                <input [(ngModel)]="slotForm.label" class="input-field" placeholder="مثال: صبح">
              </div>
              <div>
                <label class="label">زمان</label>
                <input [(ngModel)]="slotForm.time" class="input-field" placeholder="مثال: 8:00">
              </div>
              <div>
                <label class="label">ایموجی</label>
                <input [(ngModel)]="slotForm.emoji" class="input-field" placeholder="☀️">
              </div>
              <div class="flex gap-3 justify-end">
                <button (click)="closeSlotModal()" class="btn-secondary">لغو</button>
                <button (click)="saveSlot()" class="btn-primary">ذخیره</button>
              </div>
            </div>
          </div>
        </div>
      }

      @if (showSupplementModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div class="bg-dark-card border border-dark-border rounded-xl p-6 max-w-md w-full mx-4 animate-slide-up">
            <h3 class="text-lg font-semibold mb-4">{{ editingSupplement() ? 'ویرایش مکمل' : 'مکمل جدید' }}</h3>
            <div class="space-y-4">
              <div>
                <label class="label">زمان‌بندی</label>
                <select [(ngModel)]="supplementForm.timeSlotId" class="select-field">
                  @for (slot of timeSlots(); track slot.id) {
                    <option [value]="slot.id">{{ slot.label }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="label">نام</label>
                <input [(ngModel)]="supplementForm.name" class="input-field" placeholder="نام مکمل">
              </div>
              <div>
                <label class="label">دوز</label>
                <input [(ngModel)]="supplementForm.dose" class="input-field" placeholder="مثال: 500mg">
              </div>
              <div>
                <label class="label">دسته‌بندی</label>
                <select [(ngModel)]="supplementForm.category" class="select-field">
                  <option value="daily">روزانه</option>
                  <option value="workout">ورزشی</option>
                  <option value="optional">اختیاری</option>
                </select>
              </div>
              <div class="flex gap-3 justify-end">
                <button (click)="closeSupplementModal()" class="btn-secondary">لغو</button>
                <button (click)="saveSupplement()" class="btn-primary">ذخیره</button>
              </div>
            </div>
          </div>
        </div>
      }

      @if (confirmDelete()) {
        <app-confirm-dialog
          message="آیا از حذف مطمئن هستید؟"
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
export class SupplementsComponent implements OnInit {
  private api = inject(ApiService);

  timeSlots = signal<TimeSlot[]>([]);
  supplementLogs = signal<SupplementLog[]>([]);
  showSlotModal = signal(false);
  showSupplementModal = signal(false);
  editingSlot = signal<TimeSlot | null>(null);
  editingSupplement = signal<Supplement | null>(null);
  confirmDelete = signal(false);
  private pendingDeleteAction: (() => void) | null = null;

  slotForm: Partial<TimeSlot> = { label: '', time: '', emoji: '' };
  supplementForm: Partial<Supplement> = { timeSlotId: 0, name: '', dose: '', category: 'daily' };

  weeklyTaken = 0;
  weeklyTotal = 0;
  weeklyPercentage = 0;

  ngOnInit() {
    this.loadTimeSlots();
    this.loadLogs();
    this.calculateWeeklyStats();
  }

  private loadTimeSlots() {
    this.api.getTimeSlots().subscribe({
      next: (slots) => this.timeSlots.set(slots)
    });
  }

  private loadLogs() {
    this.api.getSupplementLogs().subscribe({
      next: (logs) => {
        this.supplementLogs.set(logs);
        this.calculateWeeklyStats();
      }
    });
  }

  private calculateWeeklyStats() {
    const logs = this.supplementLogs();
    const taken = logs.filter(l => l.taken).length;
    let total = 0;
    this.timeSlots().forEach(s => total += s.supplements.length);
    this.weeklyTaken = taken;
    this.weeklyTotal = total * 7;
    this.weeklyPercentage = this.weeklyTotal > 0 ? Math.round((taken / this.weeklyTotal) * 100) : 0;
  }

  isTaken(supplementId: number): boolean {
    const today = this.getToday();
    return this.supplementLogs().some(l => l.supplementId === supplementId && l.date === today && l.taken);
  }

  toggleSupplement(supplementId: number, taken: boolean) {
    this.api.logSupplement(supplementId, taken).subscribe({
      next: () => this.loadLogs()
    });
  }

  editSlot(slot: TimeSlot) {
    this.editingSlot.set(slot);
    this.slotForm = { label: slot.label, time: slot.time, emoji: slot.emoji };
    this.showSlotModal.set(true);
  }

  deleteSlot(id: number) {
    this.pendingDeleteAction = () => {
      this.api.deleteTimeSlot(id).subscribe({
        next: () => this.loadTimeSlots()
      });
    };
    this.confirmDelete.set(true);
  }

  saveSlot() {
    if (this.editingSlot()) {
      this.api.updateTimeSlot(this.editingSlot()!.id, this.slotForm).subscribe({
        next: () => {
          this.loadTimeSlots();
          this.closeSlotModal();
        }
      });
    } else {
      this.api.createTimeSlot(this.slotForm).subscribe({
        next: () => {
          this.loadTimeSlots();
          this.closeSlotModal();
        }
      });
    }
  }

  closeSlotModal() {
    this.showSlotModal.set(false);
    this.editingSlot.set(null);
    this.slotForm = { label: '', time: '', emoji: '' };
  }

  editSupplement(supplement: Supplement) {
    this.editingSupplement.set(supplement);
    this.supplementForm = {
      timeSlotId: supplement.timeSlotId,
      name: supplement.name,
      dose: supplement.dose,
      category: supplement.category
    };
    this.showSupplementModal.set(true);
  }

  deleteSupplement(id: number) {
    this.pendingDeleteAction = () => {
      this.api.deleteSupplement(id).subscribe({
        next: () => this.loadTimeSlots()
      });
    };
    this.confirmDelete.set(true);
  }

  saveSupplement() {
    const slot = this.timeSlots().find(s => s.id === Number(this.supplementForm.timeSlotId));
    if (!slot) return;

    if (this.editingSupplement()) {
      const supplement = this.editingSupplement()!;
      const updatedSupplement = { ...supplement, ...this.supplementForm };
      const updatedSupplements = slot.supplements.map(s =>
        s.id === supplement.id ? updatedSupplement : s
      ) as Supplement[];
      this.api.updateTimeSlot(slot.id, { supplements: updatedSupplements }).subscribe({
        next: () => {
          this.loadTimeSlots();
          this.closeSupplementModal();
        }
      });
    } else {
      const newSupplement: Partial<Supplement> = {
        ...this.supplementForm,
        order: slot.supplements.length
      };
      const updatedSupplements = [...slot.supplements, newSupplement] as Supplement[];
      this.api.updateTimeSlot(slot.id, { supplements: updatedSupplements }).subscribe({
        next: () => {
          this.loadTimeSlots();
          this.closeSupplementModal();
        }
      });
    }
  }

  closeSupplementModal() {
    this.showSupplementModal.set(false);
    this.editingSupplement.set(null);
    this.supplementForm = { timeSlotId: 0, name: '', dose: '', category: 'daily' };
  }

  confirmDeleteAction() {
    this.pendingDeleteAction?.();
    this.confirmDelete.set(false);
    this.pendingDeleteAction = null;
  }

  private getToday(): string {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  }
}
