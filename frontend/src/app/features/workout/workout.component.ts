import { LocaleService } from '../../core/services/locale.service';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ApiService } from '../../core/services/api.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { WorkoutSession, Exercise, WorkoutLog } from '../../shared/models/workout.model';

@Component({
  selector: 'app-workout',
  standalone: true,
  imports: [FormsModule, DragDropModule, EmptyStateComponent, ConfirmDialogComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">{{ i18n.t('برنامه ورزشی') }}</h2>
        <button (click)="showSessionModal.set(true)" class="btn-primary">
          {{ i18n.t('+ جلسه جدید') }}
        </button>
      </div>

      <div class="card flex flex-wrap items-center gap-3">
        <label for="weekly-goal" class="font-medium">{{ i18n.t('هدف ورزش در هفته') }}</label>
        <select id="weekly-goal" class="select-field w-32" [ngModel]="weeklyGoal()" (ngModelChange)="saveGoal(+$event)">
          @for (day of goalOptions; track day) { <option [ngValue]="day">{{ i18n.t('{p0} روز', { p0: day }) }}</option> }
        </select>
        <p class="text-sm text-slate-300">{{ i18n.t('{p0} از {p1} روز انجام شده', { p0: completedWeekDays(), p1: weeklyGoal() }) }}</p>
        @if (goalError()) { <span role="alert" class="text-red-400 text-sm">{{ i18n.t(goalError()) }}</span> }
      </div>

      <!-- Weekly Overview Chart -->
      <div class="card">
        <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📊</span> {{ i18n.t('نمودار هفتگی') }}
        </h3>
        <div class="grid grid-cols-7 gap-2">
          @for (day of weekDays; track day.date) {
            <div class="text-center">
              <div class="text-xs text-slate-400 mb-2">{{ i18n.date(day.date + 'T12:00:00', 'weekdayShort') }}</div>
              <div class="relative h-32 bg-slate-800 rounded-lg overflow-hidden flex items-end justify-center">
                <div
                  class="w-full rounded-t transition-all duration-500"
                  [style.height.%]="getDayCompletionPercent(day.date)"
                  [style.background-color]="getDayBarColor(day.date)"
                ></div>
              </div>
              <div class="text-xs mt-2 text-slate-400">
                {{ getDayLogCount(day.date) > 0 ? i18n.t('انجام شده') : i18n.t('ثبت نشده') }}
              </div>
            </div>
          }
        </div>
        <div class="flex items-center justify-center gap-6 mt-4 text-xs text-slate-400">
          <div class="flex items-center gap-1">
            <div class="w-3 h-3 rounded bg-green-500"></div>
            <span>{{ i18n.t('تمام شده') }}</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="w-3 h-3 rounded bg-slate-600"></div>
            <span>{{ i18n.t('انجام نشده') }}</span>
          </div>
        </div>
      </div>

      <!-- Recent Logs -->
      @if (recentLogs().length > 0) {
        <div class="card">
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📝</span> {{ i18n.t('آخرین ثبت‌ها') }}
          </h3>
          <div class="space-y-2">
            @for (log of recentLogs(); track log.id) {
              <div class="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div class="flex items-center gap-3">
                  <span class="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-sm">✓</span>
                  <div>
                    <p class="font-medium">{{ getSessionName(log.sessionId) }}</p>
                    <p class="text-xs text-slate-400">{{ formatDateShort(log.date) }}</p>
                  </div>
                </div>
                <span class="badge badge-success">{{ i18n.t('انجام شده') }}</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Sessions with daily log grid -->
      @if (sessions().length === 0) {
        <app-empty-state [message]="i18n.t('جلسه ورزشی ثبت نشده')" icon="🏋️"></app-empty-state>
      } @else {
        <!-- Daily Log Table -->
        <div class="card overflow-x-auto">
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🗓️</span> {{ i18n.t('ثبت روزانه') }}
          </h3>
          <div class="flex items-center gap-2 mb-4 text-sm text-slate-400">
            <span>🔄</span>
            <span>{{ i18n.t('ردیف‌ها را بکشید و رها کنید تا ترتیب تغییر کند') }}</span>
          </div>
          <table class="w-full">
            <thead>
              <tr class="border-b border-dark-border">
                <th class="w-10"></th>
                <th class="text-start py-3 px-4 font-medium text-slate-400">{{ i18n.t('جلسه') }}</th>
                @for (day of weekDays; track day.date) {
                  <th class="text-center py-3 px-2 font-medium text-slate-400 text-sm">{{ i18n.date(day.date + 'T12:00:00', 'weekdayShort') }}<br><span class="text-[10px] text-slate-500">{{ day.shortDate }}</span></th>
                }
                <th class="text-center py-3 px-4 font-medium text-slate-400">{{ i18n.t('مجموع') }}</th>
              </tr>
            </thead>
            <tbody cdkDropList (cdkDropListDropped)="onDropSession($event)">
              @for (session of sessions(); track session.id) {
                <tr cdkDrag class="border-b border-dark-border hover:bg-dark-hover transition-colors">
                  <td class="w-10 text-center text-slate-500">
                    <span class="drag-handle">⠿</span>
                  </td>
                  <td class="py-3 px-4">
                    <div>
                      <span class="font-medium">{{ session.day }}</span>
                      <span class="text-xs text-slate-400 ms-2">{{ session.type }}</span>
                    </div>
                  </td>
                  @for (day of weekDays; track day.date) {
                    <td class="text-center py-3 px-2">
                      <button
                        (click)="toggleLog(session.id, day.date)"
                        class="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                        [class]="isLogged(session.id, day.date)
                          ? 'bg-green-500 text-white scale-110'
                          : 'bg-slate-700 hover:bg-slate-600 hover:scale-105'"
                      >
                        {{ isLogged(session.id, day.date) ? '✓' : '' }}
                      </button>
                    </td>
                  }
                  <td class="text-center py-3 px-4">
                    <span class="badge badge-info">{{ i18n.number(getSessionLogCount(session.id)) }}/{{ i18n.number(7) }}</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Session Cards with Exercises -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (session of sessions(); track session.id) {
            <div class="card animate-slide-up">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <h3 class="font-semibold text-lg">{{ session.day }}</h3>
                  <p class="text-sm text-slate-400">{{ session.startTime }} - {{ session.endTime }}</p>
                  <span class="badge badge-info mt-2">{{ session.type }}</span>
                </div>
                <div class="flex gap-1">
                  <button (click)="editSession(session)" class="p-2 hover:bg-dark-hover rounded-lg">✏️</button>
                  <button (click)="deleteSession(session.id)" class="p-2 hover:bg-dark-hover rounded-lg">🗑️</button>
                </div>
              </div>

              <div class="space-y-2 mb-4">
                @for (exercise of session.exercises; track exercise.id) {
                  <div class="flex items-center justify-between p-2 bg-slate-800 rounded-lg text-sm group">
                    <div class="flex items-center gap-2">
                      <span>{{ exercise.name }}</span>
                      <div class="flex gap-2 text-slate-400 text-xs">
                        @if (exercise.sets) {
                          <span>{{ i18n.number(exercise.sets) }}×</span>
                        }
                        @if (exercise.reps) {
                          <span>{{ exercise.reps }}</span>
                        }
                        @if (exercise.weight) {
                          <span>{{ exercise.weight }}</span>
                        }
                      </div>
                    </div>
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button (click)="editExercise(session.id, exercise)" class="p-1 hover:bg-slate-600 rounded text-xs">✏️</button>
                      <button (click)="deleteExercise(session.id, exercise.id)" class="p-1 hover:bg-red-500/20 text-red-400 rounded text-xs">🗑️</button>
                    </div>
                  </div>
                }
              </div>

              <button
                (click)="showExerciseModal.set(true); selectedSessionId.set(session.id)"
                class="w-full btn-secondary text-sm"
              >
                {{ i18n.t('+ تمرین') }}
              </button>
            </div>
          }
        </div>
      }

      <!-- Session Modal -->
      @if (showSessionModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in" (click)="closeSessionModal()">
          <div class="bg-dark-card border border-dark-border rounded-xl p-6 max-w-md w-full mx-4 animate-slide-up" (click)="$event.stopPropagation()">
            <h3 class="text-lg font-semibold mb-4">{{ editingSession() ? i18n.t('ویرایش جلسه') : i18n.t('جلسه جدید') }}</h3>
            <div class="space-y-4">
              <div>
                <label class="label">{{ i18n.t('روز') }}</label>
                <input [(ngModel)]="sessionForm.day" class="input-field" [placeholder]="i18n.t('مثال: شنبه')">
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="label">{{ i18n.t('زمان شروع') }}</label>
                  <input [(ngModel)]="sessionForm.startTime" type="time" class="input-field">
                </div>
                <div>
                  <label class="label">{{ i18n.t('زمان پایان') }}</label>
                  <input [(ngModel)]="sessionForm.endTime" type="time" class="input-field">
                </div>
              </div>
              <div>
                <label class="label">{{ i18n.t('نوع') }}</label>
                <input [(ngModel)]="sessionForm.type" class="input-field" [placeholder]="i18n.t('مثال: قدرتی')">
              </div>
              <div>
                <label class="label">{{ i18n.t('مدت') }}</label>
                <input [(ngModel)]="sessionForm.duration" class="input-field" [placeholder]="i18n.t('مثال: 60 دقیقه')">
              </div>
              <div class="flex gap-3 justify-end">
                <button (click)="closeSessionModal()" class="btn-secondary">{{ i18n.t('لغو') }}</button>
                <button (click)="saveSession()" class="btn-primary">{{ i18n.t('ذخیره') }}</button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Exercise Modal -->
      @if (showExerciseModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in" (click)="closeExerciseModal()">
          <div class="bg-dark-card border border-dark-border rounded-xl p-6 max-w-md w-full mx-4 animate-slide-up" (click)="$event.stopPropagation()">
            <h3 class="text-lg font-semibold mb-4">{{ editingExercise() ? i18n.t('ویرایش تمرین') : i18n.t('تمرین جدید') }}</h3>
            <div class="space-y-4">
              <div>
                <label class="label">{{ i18n.t('نام تمرین') }}</label>
                <input [(ngModel)]="exerciseForm.name" class="input-field" [placeholder]="i18n.t('نام تمرین')">
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="label">{{ i18n.t('ست') }}</label>
                  <input [(ngModel)]="exerciseForm.sets" type="number" class="input-field">
                </div>
                <div>
                  <label class="label">{{ i18n.t('تکرار') }}</label>
                  <input [(ngModel)]="exerciseForm.reps" class="input-field" placeholder="12">
                </div>
                <div>
                  <label class="label">{{ i18n.t('وزنه') }}</label>
                  <input [(ngModel)]="exerciseForm.weight" class="input-field" placeholder="20kg">
                </div>
              </div>
              <div class="flex gap-3 justify-end">
                <button (click)="closeExerciseModal()" class="btn-secondary">{{ i18n.t('لغو') }}</button>
                <button (click)="saveExercise()" class="btn-primary">{{ i18n.t('ذخیره') }}</button>
              </div>
            </div>
          </div>
        </div>
      }

      @if (confirmDelete()) {
        <app-confirm-dialog
          [message]="i18n.t('آیا از حذف مطمئن هستید؟')"
          (confirmed)="confirmDeleteAction()"
          (cancelled)="confirmDelete.set(false)"
        ></app-confirm-dialog>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

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
export class WorkoutComponent implements OnInit {
  i18n = inject(LocaleService);
  private api = inject(ApiService);

  weeklyGoal = signal(3);
  goalError = signal('');
  goalOptions = [1, 2, 3, 4, 5, 6, 7];
  sessions = signal<WorkoutSession[]>([]);
  workoutLogs = signal<WorkoutLog[]>([]);
  showSessionModal = signal(false);
  showExerciseModal = signal(false);
  editingSession = signal<WorkoutSession | null>(null);
  editingExercise = signal<Exercise | null>(null);
  selectedSessionId = signal<number>(0);
  confirmDelete = signal(false);
  private pendingDeleteAction: (() => void) | null = null;

  sessionForm: Partial<WorkoutSession> = { day: '', startTime: '', endTime: '', type: '', duration: '' };
  exerciseForm: Partial<Exercise> = { name: '', sets: null, reps: '', weight: '' };

  weekDays: { date: string; label: string; shortDate: string }[] = [];

  constructor() {
    this.generateWeekDays();
  }

  ngOnInit() {
    this.loadSessions();
    this.loadLogs();
    this.api.getSettings().subscribe({ next: settings => {
      const goal = Number(settings['weeklyWorkoutGoal']);
      if (Number.isInteger(goal) && goal >= 1 && goal <= 7) this.weeklyGoal.set(goal);
    }});
  }

  saveGoal(goal: number) {
    this.goalError.set('');
    this.api.updateSettings({ weeklyWorkoutGoal: goal }).subscribe({
      next: () => this.weeklyGoal.set(goal),
      error: () => this.goalError.set('ذخیره هدف انجام نشد؛ دوباره تلاش کنید.')
    });
  }

  private generateWeekDays() {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - ((today.getDay() + 1) % 7));
    const persianDays = ['یک', 'دو', 'سه', 'چهار', 'پنج', 'جمعه', 'شنبه'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      this.weekDays.push({
        date: this.formatDate(d),
        label: persianDays[d.getDay()],
        shortDate: `${d.getMonth() + 1}/${d.getDate()}`
      });
    }
  }

  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }

  private loadSessions() {
    this.api.getWorkoutSessions().subscribe({
      next: (sessions) => this.sessions.set(sessions)
    });
  }

  private loadLogs() {
    this.api.getWorkoutLogs().subscribe({
      next: (logs) => this.workoutLogs.set(logs)
    });
  }

  onDropSession(event: CdkDragDrop<WorkoutSession[]>) {
    const reordered = [...this.sessions()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.sessions.set(reordered);
  }

  isLogged(sessionId: number, date: string): boolean {
    return this.workoutLogs().some(l => {
      const logDate = this.formatDate(new Date(l.date));
      return l.sessionId === sessionId && logDate === date && l.completed;
    });
  }

  toggleLog(sessionId: number, date: string) {
    if (this.isLogged(sessionId, date)) {
      const log = this.workoutLogs().find(l => {
        const logDate = this.formatDate(new Date(l.date));
        return l.sessionId === sessionId && logDate === date && l.completed;
      });
      if (log) {
        this.api.deleteWorkoutLog(log.id).subscribe({
          next: () => this.loadLogs()
        });
      }
    } else {
      this.api.logWorkout(sessionId, { date, completed: true }).subscribe({
        next: () => this.loadLogs()
      });
    }
  }

  getDayLogCount(date: string): number {
    return this.workoutLogs().filter(l => {
      const logDate = this.formatDate(new Date(l.date));
      return logDate === date && l.completed;
    }).length;
  }

  getDayCompletionPercent(date: string): number {
    return this.getDayLogCount(date) > 0 ? 100 : 0;
  }

  completedWeekDays(): number {
    return this.weekDays.filter(day => this.getDayLogCount(day.date) > 0).length;
  }

  getDayBarColor(date: string): string {
    const percent = this.getDayCompletionPercent(date);
    if (percent >= 100) return '#22c55e';
    if (percent > 0) return '#f59e0b';
    return '#475569';
  }

  getSessionLogCount(sessionId: number): number {
    return this.workoutLogs().filter(l => l.sessionId === sessionId && l.completed && this.weekDays.some(day => day.date === this.formatDate(new Date(l.date)))).length;
  }

  getSessionName(sessionId: number): string {
    const session = this.sessions().find(s => s.id === sessionId);
    return session ? `${session.day} - ${session.type}` : this.i18n.t('جلسه {id}', { id: sessionId });
  }

  recentLogs = () => {
    const logs = this.workoutLogs();
    return [...logs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7);
  };

  formatDateShort(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
  }

  editSession(session: WorkoutSession) {
    this.editingSession.set(session);
    this.sessionForm = { day: session.day, startTime: session.startTime, endTime: session.endTime, type: session.type, duration: session.duration };
    this.showSessionModal.set(true);
  }

  deleteSession(id: number) {
    this.pendingDeleteAction = () => {
      this.api.deleteWorkoutSession(id).subscribe({ next: () => this.loadSessions() });
    };
    this.confirmDelete.set(true);
  }

  saveSession() {
    if (this.editingSession()) {
      this.api.updateWorkoutSession(this.editingSession()!.id, this.sessionForm).subscribe({
        next: () => { this.loadSessions(); this.closeSessionModal(); }
      });
    } else {
      this.api.createWorkoutSession(this.sessionForm).subscribe({
        next: () => { this.loadSessions(); this.closeSessionModal(); }
      });
    }
  }

  closeSessionModal() {
    this.showSessionModal.set(false);
    this.editingSession.set(null);
    this.sessionForm = { day: '', startTime: '', endTime: '', type: '', duration: '' };
  }

  editExercise(sessionId: number, exercise: Exercise) {
    this.selectedSessionId.set(sessionId);
    this.editingExercise.set(exercise);
    this.exerciseForm = { name: exercise.name, sets: exercise.sets, reps: exercise.reps, weight: exercise.weight };
    this.showExerciseModal.set(true);
  }

  deleteExercise(sessionId: number, exerciseId: number) {
    const session = this.sessions().find(s => s.id === sessionId);
    if (!session) return;
    const updatedExercises = session.exercises.filter(e => e.id !== exerciseId);
    this.api.updateWorkoutSession(sessionId, { exercises: updatedExercises as Exercise[] }).subscribe({
      next: () => this.loadSessions()
    });
  }

  saveExercise() {
    const session = this.sessions().find(s => s.id === this.selectedSessionId());
    if (!session) return;

    if (this.editingExercise()) {
      const exercise = this.editingExercise()!;
      const updatedExercises = session.exercises.map(e =>
        e.id === exercise.id ? { ...e, ...this.exerciseForm } : e
      );
      this.api.updateWorkoutSession(session.id, { exercises: updatedExercises as Exercise[] }).subscribe({
        next: () => { this.loadSessions(); this.closeExerciseModal(); }
      });
    } else {
      const newExercise: Partial<Exercise> = {
        ...this.exerciseForm,
        sessionId: session.id,
        order: session.exercises.length
      };
      const updatedExercises = [...session.exercises, newExercise] as Exercise[];
      this.api.updateWorkoutSession(session.id, { exercises: updatedExercises }).subscribe({
        next: () => { this.loadSessions(); this.closeExerciseModal(); }
      });
    }
  }

  closeExerciseModal() {
    this.showExerciseModal.set(false);
    this.editingExercise.set(null);
    this.exerciseForm = { name: '', sets: null, reps: '', weight: '' };
  }

  confirmDeleteAction() {
    this.pendingDeleteAction?.();
    this.confirmDelete.set(false);
    this.pendingDeleteAction = null;
  }
}
