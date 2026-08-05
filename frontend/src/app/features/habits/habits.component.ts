import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ApiService } from '../../core/services/api.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { Habit, HabitLog } from '../../shared/models/habit.model';

@Component({
  selector: 'app-habits',
  standalone: true,
  imports: [FormsModule, DragDropModule, EmptyStateComponent, ConfirmDialogComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">عادت‌ها</h2>
        <button (click)="showModal.set(true)" class="btn-primary">
          + عادت جدید
        </button>
      </div>

      @if (habits().length === 0) {
        <app-empty-state message="عادتی ثبت نشده" icon="✅"></app-empty-state>
      } @else {
        <!-- Weekly Overview -->
        <div class="card">
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📊</span> نمودار هفتگی
          </h3>
          <div class="grid grid-cols-7 gap-2">
            @for (day of weekDays; track day.date) {
              <div class="text-center">
                <div class="text-xs text-slate-400 mb-2">{{ day.label }}</div>
                <div class="relative h-32 bg-slate-800 rounded-lg overflow-hidden flex items-end justify-center">
                  <div
                    class="w-full rounded-t transition-all duration-500"
                    [style.height.%]="getDayCompletionPercent(day.date)"
                    [style.background-color]="getDayBarColor(day.date)"
                  ></div>
                </div>
                <div class="text-xs mt-2 text-slate-400">
                  {{ getDayLogCount(day.date) }}/{{ habits().length }}
                </div>
              </div>
            }
          </div>
          <div class="flex items-center justify-center gap-6 mt-4 text-xs text-slate-400">
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 rounded bg-green-500"></div>
              <span>انجام شده</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 rounded bg-amber-500"></div>
              <span>پاره‌ای</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 rounded bg-slate-600"></div>
              <span>انجام نشده</span>
            </div>
          </div>
        </div>

        <!-- Habits Table with Drag & Drop -->
        <div class="card overflow-x-auto">
          <div class="flex items-center gap-2 mb-4 text-sm text-slate-400">
            <span>🔄</span>
            <span>ردیف‌ها را بکشید و رها کنید تا ترتیب تغییر کند</span>
          </div>
          <table class="w-full">
            <thead>
              <tr class="border-b border-dark-border">
                <th class="w-10"></th>
                <th class="text-right py-3 px-4 font-medium text-slate-400">عادت</th>
                @for (day of weekDays; track day.date) {
                  <th class="text-center py-3 px-2 font-medium text-slate-400 text-sm">{{ day.label }}</th>
                }
                <th class="text-center py-3 px-4 font-medium text-slate-400">رگبار</th>
                <th class="text-center py-3 px-4 font-medium text-slate-400">عملیات</th>
              </tr>
            </thead>
            <tbody cdkDropList (cdkDropListDropped)="onDrop($event)">
              @for (habit of habits(); track habit.id) {
                <tr
                  cdkDrag
                  class="border-b border-dark-border hover:bg-dark-hover transition-colors"
                  [style.cursor]="'grab'"
                >
                  <td class="w-10 text-center text-slate-500">
                    <span class="drag-handle">⠿</span>
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      <span>{{ habit.emoji || '✅' }}</span>
                      <span class="font-medium">{{ habit.name }}</span>
                      @if (!habit.active) {
                        <span class="badge badge-secondary text-xs">غیرفعال</span>
                      }
                    </div>
                  </td>
                  @for (day of weekDays; track day.date) {
                    <td class="text-center py-3 px-2">
                      <button
                        (click)="toggleHabit(habit.id, day.date, isHabitDone(habit.id, day.date))"
                        class="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                        [class]="isHabitDone(habit.id, day.date)
                          ? 'bg-green-500 text-white scale-110'
                          : 'bg-slate-700 hover:bg-slate-600 hover:scale-105'"
                      >
                        {{ isHabitDone(habit.id, day.date) ? '✓' : '' }}
                      </button>
                    </td>
                  }
                  <td class="text-center py-3 px-4">
                    <span class="badge badge-warning">{{ getStreak(habit.id) }} روز</span>
                  </td>
                  <td class="text-center py-3 px-4">
                    <div class="flex gap-1 justify-center">
                      <button (click)="editHabit(habit)" class="p-1 hover:bg-dark-hover rounded">✏️</button>
                      <button (click)="deleteHabit(habit.id)" class="p-1 hover:bg-dark-hover rounded">🗑️</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (showModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div class="bg-dark-card border border-dark-border rounded-xl p-6 max-w-md w-full mx-4 animate-slide-up">
            <h3 class="text-lg font-semibold mb-4">{{ editingHabit() ? 'ویرایش عادت' : 'عادت جدید' }}</h3>
            <div class="space-y-4">
              <div>
                <label class="label">نام</label>
                <input [(ngModel)]="form.name" class="input-field" placeholder="نام عادت">
              </div>
              <div>
                <label class="label">ایموجی</label>
                <input [(ngModel)]="form.emoji" class="input-field" placeholder="✅">
              </div>
              <div>
                <label class="label">رنگ</label>
                <input [(ngModel)]="form.color" class="input-field" placeholder="green">
              </div>
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  [(ngModel)]="form.active"
                  class="w-4 h-4 rounded border-dark-border text-primary-500 focus:ring-primary-500"
                >
                <label class="label mb-0">فعال</label>
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
          message="آیا از حذف این عادت مطمئن هستید؟"
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

    .drag-handle {
      font-size: 1.2rem;
      user-select: none;
    }

    .cdk-drag-preview {
      background: rgb(30 41 59 / 0.95);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }

    .cdk-drag-placeholder {
      opacity: 0.4;
      background: rgba(148, 163, 184, 0.1);
      border: 1px dashed rgba(148, 163, 184, 0.3);
      border-radius: 8px;
    }

    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .cdk-drop-list-dragging .cdk-drag {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `]
})
export class HabitsComponent implements OnInit {
  private api = inject(ApiService);

  habits = signal<Habit[]>([]);
  habitLogs = signal<HabitLog[]>([]);
  showModal = signal(false);
  editingHabit = signal<Habit | null>(null);
  confirmDelete = signal(false);
  private pendingDeleteId = 0;

  weekDays: { date: string; label: string }[] = [];
  form: Partial<Habit> = { name: '', emoji: '', color: '', active: true };

  constructor() {
    this.generateWeekDays();
  }

  ngOnInit() {
    this.loadHabits();
    this.loadLogs();
  }

  private generateWeekDays() {
    const today = new Date();
    const persianDays = ['یک', 'دو', 'سه', 'چهار', 'پنج', 'جمعه', 'شنبه'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      this.weekDays.push({
        date: this.formatDate(date),
        label: persianDays[date.getDay()]
      });
    }
  }

  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }

  private loadHabits() {
    this.api.getHabits().subscribe({
      next: (habits) => this.habits.set(habits)
    });
  }

  private loadLogs() {
    const start = this.weekDays[0].date;
    this.api.getHabitLogs(start).subscribe({
      next: (logs) => this.habitLogs.set(logs)
    });
  }

  onDrop(event: CdkDragDrop<Habit[]>) {
    const reordered = [...this.habits()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.habits.set(reordered);

    const orderedIds = reordered.map(h => h.id);
    this.api.reorderHabits(orderedIds).subscribe();
  }

  isHabitDone(habitId: number, date: string): boolean {
    return this.habitLogs().some(l => l.habitId === habitId && l.date === date && l.done);
  }

  toggleHabit(habitId: number, date: string, currentDone: boolean) {
    const newDone = !currentDone;
    this.api.logHabit(habitId, date, newDone).subscribe({
      next: () => {
        if (newDone) {
          this.habitLogs.update(logs => [...logs, { id: Date.now(), habitId, date, done: true }]);
        } else {
          this.habitLogs.update(logs => logs.filter(l => !(l.habitId === habitId && l.date === date)));
        }
      }
    });
  }

  getStreak(habitId: number): number {
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = this.formatDate(date);

      if (this.isHabitDone(habitId, dateStr)) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  getDayLogCount(date: string): number {
    return this.habitLogs().filter(l => {
      return l.date === date && l.done;
    }).length;
  }

  getDayCompletionPercent(date: string): number {
    const count = this.getDayLogCount(date);
    const total = this.habits().length || 1;
    return Math.min((count / total) * 100, 100);
  }

  getDayBarColor(date: string): string {
    const percent = this.getDayCompletionPercent(date);
    if (percent >= 100) return '#22c55e';
    if (percent > 0) return '#f59e0b';
    return '#475569';
  }

  editHabit(habit: Habit) {
    this.editingHabit.set(habit);
    this.form = {
      name: habit.name,
      emoji: habit.emoji,
      color: habit.color,
      active: habit.active
    };
    this.showModal.set(true);
  }

  deleteHabit(id: number) {
    this.pendingDeleteId = id;
    this.confirmDelete.set(true);
  }

  confirmDeleteAction() {
    this.api.deleteHabit(this.pendingDeleteId).subscribe({
      next: () => {
        this.loadHabits();
        this.loadLogs();
      }
    });
    this.confirmDelete.set(false);
  }

  save() {
    if (this.editingHabit()) {
      this.api.updateHabit(this.editingHabit()!.id, this.form).subscribe({
        next: () => {
          this.loadHabits();
          this.closeModal();
        }
      });
    } else {
      this.api.createHabit(this.form).subscribe({
        next: () => {
          this.loadHabits();
          this.closeModal();
        }
      });
    }
  }

  closeModal() {
    this.showModal.set(false);
    this.editingHabit.set(null);
    this.form = { name: '', emoji: '', color: '', active: true };
  }
}
