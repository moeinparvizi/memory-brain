import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, CdkDrag, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { ApiService } from '../../core/services/api.service';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { Phase, Task } from '../../shared/models/roadmap.model';

@Component({
  selector: 'app-roadmap',
  standalone: true,
  imports: [FormsModule, CdkDropList, CdkDrag, ProgressBarComponent, ConfirmDialogComponent, EmptyStateComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">نقشه راه</h2>
        <button (click)="showPhaseModal.set(true)" class="btn-primary">
          + فاز جدید
        </button>
      </div>

      @if (phases().length === 0) {
        <app-empty-state message="هنوز فازی اضافه نشده" icon="🗺️"></app-empty-state>
      } @else {
        <div class="relative">
          <!-- Timeline vertical line -->
          <div class="absolute right-[22px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500 via-blue-500 to-slate-600"></div>

          <div cdkDropList (cdkDropListDropped)="onPhaseDrop($event)" class="space-y-0">
            @for (phase of phases(); track phase.id; let i = $index; let last = $last) {
              <div cdkDrag class="relative flex items-start gap-4 pb-2">
                <!-- Drag handle -->
                <div cdkDragHandle class="absolute -right-2 top-6 cursor-grab active:cursor-grabbing text-slate-500 hover:text-primary-400 z-10 select-none" title="بکشید">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="5" cy="3" r="1.5"/><circle cx="11" cy="3" r="1.5"/>
                    <circle cx="5" cy="8" r="1.5"/><circle cx="11" cy="8" r="1.5"/>
                    <circle cx="5" cy="13" r="1.5"/><circle cx="11" cy="13" r="1.5"/>
                  </svg>
                </div>

                <!-- Timeline node -->
                <div class="relative z-10 flex-shrink-0 mt-5">
                  <div [class]="getNodeClass(phase.status)" class="w-11 h-11 rounded-full flex items-center justify-center text-lg border-4 border-dark-bg shadow-lg transition-all duration-300">
                    @if (phase.status === 'completed') {
                      ✓
                    } @else if (phase.status === 'in-progress') {
                      <span class="animate-pulse">●</span>
                    } @else {
                      {{ i + 1 }}
                    }
                  </div>
                  @if (!last) {
                    <div [class]="getConnectorClass(phase.status)" class="absolute left-1/2 -translate-x-1/2 top-full w-0.5 h-2"></div>
                  }
                </div>

                <!-- Phase card -->
                <div class="flex-1 card group hover:border-primary-500/30 transition-all duration-300 mt-1" (click)="togglePhase(phase.id)">
                  <div class="flex items-start justify-between">
                    <div class="flex-1 cursor-pointer">
                      <div class="flex items-center gap-3 mb-1">
                        <h3 class="text-lg font-bold">{{ phase.title }}</h3>
                        <span [class]="getStatusBadge(phase.status)">{{ getStatusText(phase.status) }}</span>
                      </div>
                      <p class="text-slate-400 text-sm mb-3">{{ phase.goal }}</p>

                      <!-- Progress bar -->
                      <div class="mb-3">
                        <div class="flex justify-between text-xs text-slate-400 mb-1">
                          <span>پیشرفت</span>
                          <span>{{ phase.progress }}%</span>
                        </div>
                        <app-progress-bar [value]="phase.progress" [color]="getProgressColor(phase.status)"></app-progress-bar>
                      </div>

                      <!-- Stats pills -->
                      <div class="flex flex-wrap gap-2">
                        <span class="inline-flex items-center gap-1 text-xs bg-slate-700/50 px-2.5 py-1 rounded-full">
                          <span class="text-slate-400">📅</span> {{ phase.duration }}
                        </span>
                        <span class="inline-flex items-center gap-1 text-xs bg-slate-700/50 px-2.5 py-1 rounded-full">
                          <span class="text-slate-400">📋</span> {{ phase.tasks.length }} تسک
                        </span>
                        <span class="inline-flex items-center gap-1 text-xs bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full">
                          <span>✓</span> {{ getCompletedTasks(phase.tasks) }} انجام شده
                        </span>
                        @if (getCompletedTasks(phase.tasks) < phase.tasks.length && phase.tasks.length > 0) {
                          <span class="inline-flex items-center gap-1 text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full">
                            <span>⏳</span> {{ phase.tasks.length - getCompletedTasks(phase.tasks) }} باقی‌مانده
                          </span>
                        }
                      </div>
                    </div>

                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button (click)="editPhase(phase, $event)" class="p-2 hover:bg-dark-hover rounded-lg">✏️</button>
                      <button (click)="deletePhase(phase.id, $event)" class="p-2 hover:bg-dark-hover rounded-lg">🗑️</button>
                    </div>
                  </div>

                  <!-- Expandable tasks -->
                  @if (expandedPhases().has(phase.id)) {
                    <div class="mt-4 pt-4 border-t border-dark-border">
                      <div class="flex items-center justify-between mb-3">
                        <h4 class="font-medium flex items-center gap-2">
                          <span>📋</span> تسک‌ها
                          <span class="text-xs text-slate-400">({{ getCompletedTasks(phase.tasks) }}/{{ phase.tasks.length }})</span>
                        </h4>
                        <button (click)="showTaskModal.set(true); selectedPhaseId.set(phase.id); $event.stopPropagation()" class="text-sm text-primary-400 hover:text-primary-300">
                          + تسک جدید
                        </button>
                      </div>

                      @if (phase.tasks.length === 0) {
                        <p class="text-slate-500 text-sm text-center py-4">تسکی اضافه نشده</p>
                      } @else {
                        <div cdkDropList (cdkDropListDropped)="onTaskDrop(phase.id, $event)" class="space-y-2">
                          @for (task of phase.tasks; track task.id) {
                            <div cdkDrag class="flex items-center gap-3 p-3 bg-slate-800/80 rounded-lg hover:bg-slate-800 transition-colors group/task">
                              <div cdkDragHandle class="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 select-none">
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                                  <circle cx="4" cy="2" r="1"/><circle cx="8" cy="2" r="1"/>
                                  <circle cx="4" cy="6" r="1"/><circle cx="8" cy="6" r="1"/>
                                  <circle cx="4" cy="10" r="1"/><circle cx="8" cy="10" r="1"/>
                                </svg>
                              </div>
                              <div class="relative">
                                <input
                                  type="checkbox"
                                  [checked]="task.done"
                                  (change)="toggleTask(phase.id, task.id, $any($event.target).checked); $event.stopPropagation()"
                                  class="task-checkbox"
                                >
                              </div>
                              <div class="flex-1 min-w-0">
                                <p [class]="task.done ? 'line-through text-slate-500' : ''" class="truncate">{{ task.topic }}</p>
                                @if (task.output) {
                                  <p class="text-xs text-slate-400 mt-0.5 truncate">📎 {{ task.output }}</p>
                                }
                              </div>
                              <span class="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded flex-shrink-0">ماه {{ task.month }}</span>
                              <div class="flex gap-0.5 opacity-0 group-hover/task:opacity-100 transition-opacity flex-shrink-0">
                                <button (click)="editTask(phase.id, task); $event.stopPropagation()" class="p-1 hover:bg-dark-hover rounded">✏️</button>
                                <button (click)="deleteTask(phase.id, task.id); $event.stopPropagation()" class="p-1 hover:bg-dark-hover rounded">🗑️</button>
                              </div>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Phase Modal -->
      @if (showPhaseModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in" (click)="closePhaseModal()">
          <div class="bg-dark-card border border-dark-border rounded-xl p-6 max-w-md w-full mx-4 animate-slide-up" (click)="$event.stopPropagation()">
            <h3 class="text-lg font-semibold mb-4">{{ editingPhase() ? 'ویرایش فاز' : 'فاز جدید' }}</h3>
            <div class="space-y-4">
              <div>
                <label class="label">عنوان</label>
                <input [(ngModel)]="phaseForm.title" class="input-field" placeholder="عنوان فاز">
              </div>
              <div>
                <label class="label">مدت</label>
                <input [(ngModel)]="phaseForm.duration" class="input-field" placeholder="مثال: 3 ماه">
              </div>
              <div>
                <label class="label">هدف</label>
                <textarea [(ngModel)]="phaseForm.goal" class="input-field" rows="3" placeholder="هدف فاز"></textarea>
              </div>
              <div>
                <label class="label">وضعیت</label>
                <select [(ngModel)]="phaseForm.status" class="select-field">
                  <option value="not-started">شروع نشده</option>
                  <option value="in-progress">در حال انجام</option>
                  <option value="completed">تکمیل شده</option>
                </select>
              </div>
              <div class="flex gap-3 justify-end">
                <button (click)="closePhaseModal()" class="btn-secondary">لغو</button>
                <button (click)="savePhase()" class="btn-primary">ذخیره</button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Task Modal -->
      @if (showTaskModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in" (click)="closeTaskModal()">
          <div class="bg-dark-card border border-dark-border rounded-xl p-6 max-w-md w-full mx-4 animate-slide-up" (click)="$event.stopPropagation()">
            <h3 class="text-lg font-semibold mb-4">{{ editingTask() ? 'ویرایش تسک' : 'تسک جدید' }}</h3>
            <div class="space-y-4">
              <div>
                <label class="label">موضوع</label>
                <input [(ngModel)]="taskForm.topic" class="input-field" placeholder="موضوع تسک">
              </div>
              <div>
                <label class="label">خروجی</label>
                <input [(ngModel)]="taskForm.output" class="input-field" placeholder="خروجی مورد انتظار">
              </div>
              <div>
                <label class="label">ماه</label>
                <input [(ngModel)]="taskForm.month" type="number" class="input-field" placeholder="شماره ماه">
              </div>
              <div class="flex gap-3 justify-end">
                <button (click)="closeTaskModal()" class="btn-secondary">لغو</button>
                <button (click)="saveTask()" class="btn-primary">ذخیره</button>
              </div>
            </div>
          </div>
        </div>
      }

      @if (confirmDelete()) {
        <app-confirm-dialog
          [message]="confirmMessage()"
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

    .cdk-drag-preview {
      @apply bg-dark-card border border-primary-500/50 rounded-xl shadow-2xl opacity-90 scale-[1.02];
    }

    .cdk-drag-placeholder {
      @apply opacity-20;
    }

    .cdk-drag-animating {
      @apply transition-transform duration-200;
    }

    .task-checkbox {
      @apply w-4 h-4 rounded border-dark-border text-primary-500 focus:ring-primary-500 cursor-pointer;
      accent-color: #f59e0b;
    }

    /* Glow effect for in-progress node */
    .node-in-progress {
      animation: nodeGlow 2s ease-in-out infinite;
    }

    @keyframes nodeGlow {
      0%, 100% { box-shadow: 0 0 5px rgba(245, 158, 11, 0.3); }
      50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.6); }
    }

    /* Completed checkmark animation */
    .node-completed {
      animation: checkPop 0.3s ease-out;
    }

    @keyframes checkPop {
      0% { transform: scale(0.8); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
  `]
})
export class RoadmapComponent implements OnInit {
  private api = inject(ApiService);

  phases = signal<Phase[]>([]);
  expandedPhases = signal<Set<number>>(new Set());
  showPhaseModal = signal(false);
  showTaskModal = signal(false);
  editingPhase = signal<Phase | null>(null);
  editingTask = signal<Task | null>(null);
  selectedPhaseId = signal<number>(0);
  confirmDelete = signal(false);
  confirmMessage = signal('');
  private pendingDeleteAction: (() => void) | null = null;

  phaseForm = {
    title: '',
    duration: '',
    goal: '',
    status: 'not-started' as 'not-started' | 'in-progress' | 'completed'
  };

  taskForm = {
    topic: '',
    output: '',
    month: 1
  };

  ngOnInit() {
    this.loadPhases();
  }

  private loadPhases() {
    this.api.getPhases().subscribe({
      next: (phases) => this.phases.set(phases)
    });
  }

  onPhaseDrop(event: CdkDragDrop<Phase[]>) {
    const updated = [...this.phases()];
    moveItemInArray(updated, event.previousIndex, event.currentIndex);
    this.phases.set(updated);
    this.api.reorderPhases(updated.map(p => p.id)).subscribe();
  }

  onTaskDrop(phaseId: number, event: CdkDragDrop<Task[]>) {
    const updatedPhases = [...this.phases()];
    const phaseIndex = updatedPhases.findIndex(p => p.id === phaseId);
    if (phaseIndex === -1) return;

    const phase = { ...updatedPhases[phaseIndex] };
    const tasks = [...phase.tasks];
    moveItemInArray(tasks, event.previousIndex, event.currentIndex);
    phase.tasks = tasks;
    updatedPhases[phaseIndex] = phase;
    this.phases.set(updatedPhases);

    this.api.reorderTasks(phaseId, tasks.map(t => t.id)).subscribe();
  }

  togglePhase(id: number) {
    this.expandedPhases.update(set => {
      const newSet = new Set(set);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }

  editPhase(phase: Phase, event: Event) {
    event.stopPropagation();
    this.editingPhase.set(phase);
    this.phaseForm = {
      title: phase.title,
      duration: phase.duration,
      goal: phase.goal,
      status: phase.status
    };
    this.showPhaseModal.set(true);
  }

  deletePhase(id: number, event: Event) {
    event.stopPropagation();
    this.confirmMessage.set('آیا از حذف این فاز مطمئن هستید؟');
    this.pendingDeleteAction = () => {
      this.api.deletePhase(id).subscribe({ next: () => this.loadPhases() });
    };
    this.confirmDelete.set(true);
  }

  savePhase() {
    if (this.editingPhase()) {
      this.api.updatePhase(this.editingPhase()!.id, this.phaseForm).subscribe({
        next: () => { this.loadPhases(); this.closePhaseModal(); }
      });
    } else {
      this.api.createPhase(this.phaseForm).subscribe({
        next: () => { this.loadPhases(); this.closePhaseModal(); }
      });
    }
  }

  closePhaseModal() {
    this.showPhaseModal.set(false);
    this.editingPhase.set(null);
    this.phaseForm = { title: '', duration: '', goal: '', status: 'not-started' };
  }

  editTask(phaseId: number, task: Task) {
    this.selectedPhaseId.set(phaseId);
    this.editingTask.set(task);
    this.taskForm = { topic: task.topic, output: task.output || '', month: task.month };
    this.showTaskModal.set(true);
  }

  deleteTask(phaseId: number, taskId: number) {
    this.confirmMessage.set('آیا از حذف این تسک مطمئن هستید؟');
    this.pendingDeleteAction = () => {
      this.api.deleteTask(phaseId, taskId).subscribe({ next: () => this.loadPhases() });
    };
    this.confirmDelete.set(true);
  }

  toggleTask(phaseId: number, taskId: number, done: boolean) {
    this.api.toggleTaskDone(phaseId, taskId, done).subscribe({ next: () => this.loadPhases() });
  }

  saveTask() {
    if (this.editingTask()) {
      this.api.updateTask(this.selectedPhaseId(), this.editingTask()!.id, this.taskForm).subscribe({
        next: () => { this.loadPhases(); this.closeTaskModal(); }
      });
    } else {
      this.api.createTask(this.selectedPhaseId(), this.taskForm).subscribe({
        next: () => { this.loadPhases(); this.closeTaskModal(); }
      });
    }
  }

  closeTaskModal() {
    this.showTaskModal.set(false);
    this.editingTask.set(null);
    this.taskForm = { topic: '', output: '', month: 1 };
  }

  confirmDeleteAction() {
    this.pendingDeleteAction?.();
    this.confirmDelete.set(false);
    this.pendingDeleteAction = null;
  }

  getCompletedTasks(tasks: Task[]): number {
    return tasks.filter(t => t.done).length;
  }

  getNodeClass(status: string): string {
    switch (status) {
      case 'completed': return 'bg-green-500/20 border-green-500 text-green-400 node-completed';
      case 'in-progress': return 'bg-primary-500/20 border-primary-500 text-primary-400 node-in-progress';
      default: return 'bg-slate-700/50 border-slate-500 text-slate-400';
    }
  }

  getConnectorClass(status: string): string {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-primary-500';
      default: return 'bg-slate-600';
    }
  }

  getProgressColor(status: string): string {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-primary-500';
      default: return 'bg-slate-500';
    }
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'in-progress': return 'badge-warning';
      default: return 'badge-info';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'completed': return 'تکمیل شده';
      case 'in-progress': return 'در حال انجام';
      default: return 'شروع نشده';
    }
  }
}
