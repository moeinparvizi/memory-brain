import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ScheduleBlock } from '../../shared/models/schedule.model';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [FormsModule, EmptyStateComponent, ConfirmDialogComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">برنامه روزانه</h2>
        <button (click)="showModal.set(true)" class="btn-primary">
          + بلوک جدید
        </button>
      </div>

      <!-- Day Type Toggle -->
      <div class="flex gap-2">
        <button
          (click)="activeTab.set('workday')"
          [class]="activeTab() === 'workday' ? 'btn-primary' : 'btn-ghost'"
        >
          روز کاری
        </button>
        <button
          (click)="activeTab.set('weekend')"
          [class]="activeTab() === 'weekend' ? 'btn-primary' : 'btn-ghost'"
        >
          روز تعطیل
        </button>
      </div>

      @if (filteredBlocks().length === 0) {
        <app-empty-state message="برنامه‌ای ثبت نشده" icon="📅"></app-empty-state>
      } @else {
        <!-- Timeline -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="timeline-scroll">
            <div class="timeline-wrapper">
              <!-- Time labels on left -->
              <div class="time-labels">
                @for (hour of hours; track hour) {
                  <div class="time-label">{{ formatHour(hour) }}</div>
                }
              </div>

              <!-- Grid lines + Events -->
              <div class="timeline-grid">
                @for (hour of hours; track hour) {
                  <div class="grid-line"></div>
                }

                <!-- Events -->
                @for (block of filteredBlocks(); track block.id) {
                  <div
                    class="event-block"
                    [style.top]="getEventTop(block.startTime)"
                    [style.height]="getEventHeight(block.startTime, block.endTime)"
                    [style.border-color]="getCategoryColor(block.category)"
                    [style.background]="getCategoryGradient(block.category)"
                  >
                    <div class="event-info">
                      <span class="event-name">{{ block.activity }}</span>
                      <span class="event-time">{{ block.startTime }} - {{ block.endTime }}</span>
                    </div>
                    <div class="event-btns">
                      <button (click)="editBlock(block)" class="e-btn">✏️</button>
                      <button (click)="deleteBlock(block.id)" class="e-btn">🗑️</button>
                    </div>
                  </div>
                }

                <!-- Now line -->
                @if (showNowLine()) {
                  <div class="now-line" [style.top]="getNowTop()">
                    <span class="now-dot"></span>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-dark-card border border-dark-border rounded-xl p-6 max-w-md w-full mx-4">
            <h3 class="text-lg font-semibold mb-4">{{ editingBlock() ? 'ویرایش بلوک' : 'بلوک جدید' }}</h3>
            <div class="space-y-4">
              <div>
                <label class="label">نوع روز</label>
                <select [(ngModel)]="form.dayType" class="select-field">
                  <option value="workday">روز کاری</option>
                  <option value="weekend">روز تعطیل</option>
                </select>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="label">زمان شروع</label>
                  <input [(ngModel)]="form.startTime" type="time" class="input-field">
                </div>
                <div>
                  <label class="label">زمان پایان</label>
                  <input [(ngModel)]="form.endTime" type="time" class="input-field">
                </div>
              </div>
              <div>
                <label class="label">فعالیت</label>
                <input [(ngModel)]="form.activity" class="input-field" placeholder="نام فعالیت">
              </div>
              <div>
                <label class="label">دسته‌بندی</label>
                <select [(ngModel)]="form.category" class="select-field">
                  <option value="learning">یادگیری</option>
                  <option value="work">کار</option>
                  <option value="exercise">ورزش</option>
                  <option value="personal">شخصی</option>
                  <option value="commute">رفت‌وآمد</option>
                </select>
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
          message="آیا از حذف این بلوک مطمئن هستید؟"
          (confirmed)="confirmDeleteAction()"
          (cancelled)="confirmDelete.set(false)"
        ></app-confirm-dialog>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .timeline-scroll {
      overflow-y: auto;
      max-height: 70vh;
    }

    .timeline-wrapper {
      display: flex;
      min-height: 900px;
    }

    .time-labels {
      width: 52px;
      flex-shrink: 0;
      position: relative;
    }

    .time-label {
      height: 50px;
      display: flex;
      align-items: flex-start;
      justify-content: flex-end;
      padding-right: 8px;
      font-size: 0.7rem;
      color: #64748b;
      transform: translateY(-6px);
    }

    .timeline-grid {
      flex: 1;
      position: relative;
      border-top: 1px solid rgba(148, 163, 184, 0.15);
    }

    .grid-line {
      height: 50px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.15);
    }

    .event-block {
      position: absolute;
      left: 4px;
      right: 4px;
      border-right: 4px solid;
      border-radius: 6px;
      padding: 6px 10px;
      cursor: pointer;
      z-index: 10;
      overflow: hidden;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      transition: box-shadow 0.2s, transform 0.15s;
    }

    .event-block:hover {
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      transform: scale(1.01);
      z-index: 20;
    }

    .event-block:hover .event-btns {
      opacity: 1;
    }

    .event-info {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }

    .event-name {
      font-weight: 600;
      font-size: 0.8rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .event-time {
      font-size: 0.65rem;
      opacity: 0.75;
    }

    .event-btns {
      display: flex;
      gap: 2px;
      opacity: 0;
      transition: opacity 0.2s;
      flex-shrink: 0;
    }

    .e-btn {
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.35);
      font-size: 0.65rem;
      border: none;
      cursor: pointer;
    }

    .e-btn:hover {
      background: rgba(0, 0, 0, 0.55);
    }

    .now-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: #ef4444;
      z-index: 30;
      pointer-events: none;
    }

    .now-dot {
      position: absolute;
      right: -5px;
      top: -4px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ef4444;
    }
  `]
})
export class ScheduleComponent implements OnInit {
  private api = inject(ApiService);

  blocks = signal<ScheduleBlock[]>([]);
  activeTab = signal<'workday' | 'weekend'>('workday');
  showModal = signal(false);
  editingBlock = signal<ScheduleBlock | null>(null);
  confirmDelete = signal(false);
  private pendingDeleteId = 0;

  hours = Array.from({ length: 18 }, (_, i) => i + 6);

  form: Partial<ScheduleBlock> = {
    dayType: 'workday',
    startTime: '',
    endTime: '',
    activity: '',
    category: 'learning'
  };

  ngOnInit() {
    this.loadBlocks();
  }

  private loadBlocks() {
    this.api.getSchedule().subscribe({
      next: (blocks) => this.blocks.set(blocks)
    });
  }

  filteredBlocks() {
    return this.blocks()
      .filter(b => b.dayType === this.activeTab())
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  formatHour(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  getEventTop(time: string): string {
    const [h, m] = time.split(':').map(Number);
    return `${((h - 6) * 50) + (m / 60) * 50}px`;
  }

  getEventHeight(start: string, end: string): string {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const height = ((endMin - startMin) / 60) * 50;
    return `${Math.max(height, 28)}px`;
  }

  showNowLine(): boolean {
    const hour = new Date().getHours();
    return hour >= 6 && hour <= 23;
  }

  getNowTop(): string {
    const now = new Date();
    return `${((now.getHours() - 6) * 50) + (now.getMinutes() / 60) * 50}px`;
  }

  getCategoryColor(cat: string): string {
    const map: Record<string, string> = {
      learning: '#3b82f6',
      work: '#f59e0b',
      exercise: '#22c55e',
      personal: '#94a3b8',
      commute: '#6b7280'
    };
    return map[cat] || '#3b82f6';
  }

  getCategoryGradient(cat: string): string {
    const map: Record<string, string> = {
      learning: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.08))',
      work: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.08))',
      exercise: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.08))',
      personal: 'linear-gradient(135deg, rgba(148,163,184,0.2), rgba(148,163,184,0.08))',
      commute: 'linear-gradient(135deg, rgba(107,114,128,0.2), rgba(107,114,128,0.08))'
    };
    return map[cat] || map['learning'];
  }

  editBlock(block: ScheduleBlock) {
    this.editingBlock.set(block);
    this.form = { ...block };
    this.showModal.set(true);
  }

  deleteBlock(id: number) {
    this.pendingDeleteId = id;
    this.confirmDelete.set(true);
  }

  confirmDeleteAction() {
    this.api.deleteScheduleBlock(this.pendingDeleteId).subscribe({
      next: () => this.loadBlocks()
    });
    this.confirmDelete.set(false);
  }

  save() {
    if (this.editingBlock()) {
      this.api.updateScheduleBlock(this.editingBlock()!.id, this.form).subscribe({
        next: () => { this.loadBlocks(); this.closeModal(); }
      });
    } else {
      this.api.createScheduleBlock(this.form).subscribe({
        next: () => { this.loadBlocks(); this.closeModal(); }
      });
    }
  }

  closeModal() {
    this.showModal.set(false);
    this.editingBlock.set(null);
    this.form = { dayType: 'workday', startTime: '', endTime: '', activity: '', category: 'learning' };
  }
}
