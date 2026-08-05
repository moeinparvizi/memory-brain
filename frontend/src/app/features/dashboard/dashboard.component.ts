import { Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { HeatmapComponent } from '../../shared/components/heatmap/heatmap.component';
import { Phase } from '../../shared/models/roadmap.model';
import { ScheduleBlock } from '../../shared/models/schedule.model';
import { Habit, HabitLog } from '../../shared/models/habit.model';
import { TimeSlot, SupplementLog } from '../../shared/models/supplement.model';
import { WorkoutLog } from '../../shared/models/workout.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [EmptyStateComponent, HeatmapComponent, DecimalPipe],
  template: `
    <div class="space-y-6">
      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="card animate-slide-up">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-primary-500/15 flex items-center justify-center text-2xl">🗺️</div>
            <div>
              <p class="text-slate-400 text-xs">نقشه راه</p>
              <p class="text-xl font-bold text-primary-400">{{ currentPhase()?.title || 'ندارد' }}</p>
            </div>
          </div>
        </div>

        <div class="card animate-slide-up" style="animation-delay:0.1s">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-green-500/15 flex items-center justify-center text-2xl">✅</div>
            <div>
              <p class="text-slate-400 text-xs">عادت‌ها</p>
              <p class="text-xl font-bold text-green-400">{{ completedHabits() }}/{{ totalHabits() }}</p>
            </div>
          </div>
        </div>

        <div class="card animate-slide-up" style="animation-delay:0.2s">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center text-2xl">💊</div>
            <div>
              <p class="text-slate-400 text-xs">مکمل‌ها</p>
              <p class="text-xl font-bold text-blue-400">{{ takenSupplements() }}/{{ totalSupplements() }}</p>
            </div>
          </div>
        </div>

        <div class="card animate-slide-up" style="animation-delay:0.3s">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center text-2xl">🏋️</div>
            <div>
              <p class="text-slate-400 text-xs">تمرین این هفته</p>
              <p class="text-xl font-bold text-amber-400">{{ weekWorkouts() }}/۳</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Roadmap Donut -->
        <div class="card animate-slide-up">
          <h3 class="text-sm font-semibold mb-4 text-slate-300">پیشرفت نقشه راه</h3>
          <div class="flex items-center justify-center">
            <div class="relative">
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(139,92,246,0.1)" stroke-width="10"/>
                <circle cx="70" cy="70" r="58" fill="none" stroke="#8b5cf6" stroke-width="10"
                  [attr.stroke-dasharray]="(roadmapProgress() / 100) * 364.4 + ' 364.4'"
                  stroke-linecap="round"
                  transform="rotate(-90 70 70)"
                  style="transition: stroke-dasharray 1s ease"/>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-2xl font-bold text-primary-400">{{ roadmapProgress() }}%</span>
                <span class="text-xs text-slate-400">{{ currentPhase()?.title }}</span>
              </div>
            </div>
          </div>
          <div class="mt-4 space-y-2">
            @for (phase of phases(); track phase.id) {
              <div class="flex items-center gap-2 text-xs">
                <div class="w-2 h-2 rounded-full" [class]="phase.status === 'in-progress' ? 'bg-primary-400' : phase.status === 'completed' ? 'bg-green-400' : 'bg-slate-600'"></div>
                <span class="flex-1 text-slate-400 truncate">{{ phase.title }}</span>
                <span class="text-slate-500">{{ phase.progress }}%</span>
              </div>
            }
          </div>
        </div>

        <!-- Habit Bar Chart -->
        <div class="card animate-slide-up" style="animation-delay:0.1s">
          <h3 class="text-sm font-semibold mb-4 text-slate-300">عادت‌های ۷ روز اخیر</h3>
          <div class="flex items-end justify-between gap-1 h-32">
            @for (day of weekDaysHabits(); track day.date) {
              <div class="flex-1 flex flex-col items-center gap-1">
                <div class="w-full rounded-t transition-all duration-500"
                  [style.height.%]="day.percent"
                  [style.background-color]="day.percent >= 80 ? '#22c55e' : day.percent >= 40 ? '#f59e0b' : day.percent > 0 ? '#ef4444' : '#334155'">
                </div>
                <span class="text-[10px] text-slate-500">{{ day.label }}</span>
              </div>
            }
          </div>
          <div class="flex justify-between mt-2 text-[10px] text-slate-500">
            <span>۰٪</span>
            <span>۱۰۰٪</span>
          </div>
        </div>

        <!-- Workout Weekly -->
        <div class="card animate-slide-up" style="animation-delay:0.2s">
          <h3 class="text-sm font-semibold mb-4 text-slate-300">ورزش این هفته</h3>
          <div class="space-y-3">
            @for (day of weekWorkoutDays(); track day.label) {
              <div class="flex items-center gap-3">
                <span class="text-xs text-slate-400 w-16">{{ day.label }}</span>
                <div class="flex-1 h-6 bg-slate-800 rounded-lg overflow-hidden">
                  @if (day.logged) {
                    <div class="h-full bg-gradient-to-l from-green-500 to-green-400 rounded-lg flex items-center justify-center">
                      <span class="text-[10px] text-white font-medium">✓ انجام شده</span>
                    </div>
                  } @else {
                    <div class="h-full flex items-center justify-center">
                      <span class="text-[10px] text-slate-600">انجام نشده</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Activity & Quick Actions -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card animate-slide-up">
          <h3 class="text-sm font-semibold mb-4 text-slate-300 flex items-center gap-2">
            <span>⏰</span> الان چه کار کنم؟
          </h3>
          @if (currentActivity()) {
            <div class="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4">
              <p class="text-primary-300 font-medium">{{ currentActivity() }}</p>
              @if (currentBlock()) {
                <p class="text-xs text-slate-400 mt-1">{{ currentBlock()!.startTime }} - {{ currentBlock()!.endTime }}</p>
              }
            </div>
          } @else {
            <p class="text-slate-500 text-sm">برنامه‌ای ثبت نشده</p>
          }
        </div>

        <div class="card animate-slide-up" style="animation-delay:0.1s">
          <h3 class="text-sm font-semibold mb-4 text-slate-300 flex items-center gap-2">
            <span>⚠️</span> هشدار امروز
          </h3>
          <div class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <p class="text-amber-300 text-sm">{{ todayWarning }}</p>
          </div>
        </div>
      </div>

      <!-- Habits & Supplements -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card animate-slide-up">
          <h3 class="text-sm font-semibold mb-4 text-slate-300 flex items-center gap-2">
            <span>✅</span> عادت‌های امروز
          </h3>
          @if (habits().length > 0) {
            <div class="space-y-2">
              @for (habit of habits(); track habit.id) {
                <label class="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                  [class]="isHabitDone(habit.id) ? 'bg-green-500/10' : 'bg-slate-800/50 hover:bg-slate-800'">
                  <input
                    type="checkbox"
                    [checked]="isHabitDone(habit.id)"
                    (change)="toggleHabit(habit.id, $any($event.target).checked)"
                    class="w-4 h-4 rounded border-dark-border text-green-500 focus:ring-green-500"
                  >
                  <span class="text-lg">{{ habit.emoji || '✅' }}</span>
                  <span class="font-medium text-sm" [class]="isHabitDone(habit.id) ? 'text-green-400' : ''">{{ habit.name }}</span>
                </label>
              }
            </div>
          } @else {
            <app-empty-state message="عادتی ثبت نشده" icon="✅"></app-empty-state>
          }
        </div>

        <div class="card animate-slide-up" style="animation-delay:0.1s">
          <h3 class="text-sm font-semibold mb-4 text-slate-300 flex items-center gap-2">
            <span>💊</span> مکمل‌های امروز
          </h3>
          @if (supplementSlots().length > 0) {
            <div class="space-y-3">
              @for (slot of supplementSlots(); track slot.id) {
                <div class="bg-slate-800/50 rounded-xl p-3">
                  <div class="flex items-center gap-2 mb-2">
                    <span>{{ slot.emoji || '💊' }}</span>
                    <span class="font-medium text-sm">{{ slot.label }}</span>
                    <span class="text-[10px] text-slate-500">{{ slot.time }}</span>
                  </div>
                  @for (supplement of slot.supplements; track supplement.id) {
                    <label class="flex items-center gap-3 py-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        [checked]="isSupplementTaken(supplement.id)"
                        (change)="toggleSupplement(supplement.id, $any($event.target).checked)"
                        class="w-4 h-4 rounded border-dark-border text-blue-500 focus:ring-blue-500"
                      >
                      <span class="text-sm" [class]="isSupplementTaken(supplement.id) ? 'text-blue-400 line-through' : ''">{{ supplement.name }}</span>
                      @if (supplement.dose) {
                        <span class="text-[10px] text-slate-500">{{ supplement.dose }}</span>
                      }
                    </label>
                  }
                </div>
              }
            </div>
          } @else {
            <app-empty-state message="مکملی ثبت نشده" icon="💊"></app-empty-state>
          }
        </div>
      </div>

      <!-- Notifications -->
      <div class="card animate-slide-up">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-indigo-500/15 flex items-center justify-center text-2xl">🔔</div>
            <div>
              <p class="text-sm font-semibold text-slate-300">یادآوری‌ها</p>
              <p class="text-xs text-slate-500">اعلان‌های مرورگر برای یادآوری برنامه‌ها</p>
            </div>
          </div>
          @if (notif.permission() === 'default') {
            <button (click)="enableNotifications()" class="btn-primary text-sm">فعال‌سازی</button>
          } @else if (notif.permission() === 'granted') {
            <span class="badge-green">فعال</span>
          } @else {
            <span class="badge-red">مسدود شده</span>
          }
        </div>
      </div>

      <!-- Heatmap -->
      <div class="card animate-slide-up">
        <h3 class="text-sm font-semibold mb-4 text-slate-300 flex items-center gap-2">
          <span>🗓️</span> نقشه حرارتی عادت‌ها (۳۶۵ روز اخیر)
        </h3>
        <app-heatmap title="" [data]="heatmapData()"></app-heatmap>
      </div>

      <!-- AI Summary -->
      @if (summary()) {
        <div class="card animate-slide-up">
          <h3 class="text-sm font-semibold mb-4 text-slate-300 flex items-center gap-2">
            <span>🤖</span> خلاصه هوشمند امروز
          </h3>
          <div class="mb-3 p-3 rounded-xl" [class]="summary().overall.score >= 50 ? 'bg-green-500/10 border border-green-500/20' : 'bg-amber-500/10 border border-amber-500/20'">
            <p class="text-sm font-medium" [class]="summary().overall.score >= 50 ? 'text-green-400' : 'text-amber-400'">{{ summary().overall.mood }}</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            @for (section of summary().sections; track $index) {
              <div class="flex items-start gap-3 p-3 rounded-xl bg-slate-800/30">
                <span class="text-lg">{{ section.icon }}</span>
                <div>
                  <p class="text-xs font-medium text-slate-300">{{ section.title }}</p>
                  <p class="text-xs text-slate-500">{{ section.text }}</p>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Weekly Report -->
      @if (weeklyReport()) {
        <div class="card animate-slide-up">
          <h3 class="text-sm font-semibold mb-4 text-slate-300 flex items-center gap-2">
            <span>📊</span> گزارش هفتگی ({{ weeklyReport().weekStart }} تا {{ weeklyReport().weekEnd }})
          </h3>
          <p class="text-xs text-slate-400 mb-4">{{ weeklyReport().summary }}</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div class="text-center p-3 rounded-xl bg-slate-800/30">
              <p class="text-2xl font-bold text-green-400">{{ weeklyReport().stats.habitCompletion }}%</p>
              <p class="text-[10px] text-slate-500">عادت‌ها</p>
            </div>
            <div class="text-center p-3 rounded-xl bg-slate-800/30">
              <p class="text-2xl font-bold text-blue-400">{{ weeklyReport().stats.workoutDays }}</p>
              <p class="text-[10px] text-slate-500">روز ورزش</p>
            </div>
            <div class="text-center p-3 rounded-xl bg-slate-800/30">
              <p class="text-2xl font-bold text-purple-400">{{ weeklyReport().stats.supplementRate }}%</p>
              <p class="text-[10px] text-slate-500">مکمل‌ها</p>
            </div>
            <div class="text-center p-3 rounded-xl bg-slate-800/30">
              <p class="text-2xl font-bold text-amber-400">{{ weeklyReport().stats.totalSpent | number }}</p>
              <p class="text-[10px] text-slate-500">هزینه هفتگی</p>
            </div>
          </div>
          <div class="flex items-end justify-between gap-1 h-24">
            @for (day of weeklyReport().dailyHabits; track day.day) {
              <div class="flex-1 flex flex-col items-center gap-1">
                <div class="w-full rounded-t transition-all duration-500"
                  [style.height.%]="day.percent"
                  [style.background-color]="day.percent >= 80 ? '#22c55e' : day.percent >= 40 ? '#f59e0b' : day.percent > 0 ? '#ef4444' : '#334155'">
                </div>
                <span class="text-[10px] text-slate-500">{{ day.day }}</span>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  notif = inject(NotificationService);

  phases = signal<Phase[]>([]);
  currentPhase = signal<Phase | null>(null);
  habits = signal<Habit[]>([]);
  habitLogs = signal<HabitLog[]>([]);
  supplementSlots = signal<TimeSlot[]>([]);
  supplementLogs = signal<SupplementLog[]>([]);
  scheduleBlocks = signal<ScheduleBlock[]>([]);
  currentBlock = signal<ScheduleBlock | null>(null);
  currentActivity = signal<string | null>(null);
  workoutLogs = signal<WorkoutLog[]>([]);

  completedHabits = signal(0);
  totalHabits = signal(0);
  takenSupplements = signal(0);
  totalSupplements = signal(0);
  weekWorkouts = signal(0);
  roadmapProgress = signal(0);
  heatmapData = signal<Record<string, number>>({});
  summary = signal<any>(null);
  weeklyReport = signal<any>(null);

  warnings = [
    'فراموش نکنید آب بنوشید!',
    'وقت استراحته، چند دقیقه نفس بکش',
    'حالتون چطوره؟ یه لبخند بزنید!',
    'امروز یه کار مهم انجام بدید',
    'ورزش فراموش نشه!'
  ];
  todayWarning = this.warnings[Math.floor(Math.random() * this.warnings.length)];

  ngOnInit() {
    this.loadData();
    this.updateCurrentTime();
    setInterval(() => this.updateCurrentTime(), 60000);
    this.scheduleNotifications();
  }

  async enableNotifications() {
    const granted = await this.notif.requestPermission();
    if (granted) {
      this.notif.show('یادآوری فعال شد!', 'از این پس یادآوری‌های برنامه ارسال می‌شود');
      this.scheduleNotifications();
    }
  }

  private scheduleNotifications() {
    this.notif.clearAll();
    if (this.notif.permission() !== 'granted') return;

    const now = new Date();
    const isWeekend = now.getDay() === 5 || now.getDay() === 6;
    const dayType = isWeekend ? 'weekend' : 'workday';

    this.api.getSchedule().subscribe({
      next: (blocks) => {
        const dayBlocks = blocks.filter(b => b.dayType === dayType);
        dayBlocks.forEach(block => {
          const [h, m] = block.startTime.split(':').map(Number);
          const blockTime = new Date();
          blockTime.setHours(h, m, 0, 0);
          const delay = blockTime.getTime() - now.getTime();
          if (delay > 0 && delay < 12 * 60 * 60 * 1000) {
            this.notif.scheduleReminder(
              '⏰ یادآوری برنامه',
              `${block.activity} - ${block.startTime} تا ${block.endTime}`,
              delay,
              `schedule-${block.id}`
            );
          }
        });
      }
    });

    this.api.getHabits().subscribe({
      next: (habits) => {
        const active = habits.filter(h => h.active);
        if (active.length > 0) {
          const reminderTime = new Date();
          reminderTime.setHours(20, 0, 0, 0);
          const delay = reminderTime.getTime() - now.getTime();
          if (delay > 0 && delay < 12 * 60 * 60 * 1000) {
            this.notif.scheduleReminder(
              '✅ یادآوری عادت‌ها',
              `${active.length} عادت فعال دارید. وضعیت امروز را بررسی کنید.`,
              delay,
              'habits-daily'
            );
          }
        }
      }
    });
  }

  private loadData() {
    this.api.getPhases().subscribe({
      next: (phases) => {
        this.phases.set(phases);
        const inProgress = phases.find(p => p.status === 'in-progress');
        this.currentPhase.set(inProgress || phases[0] || null);
        if (phases.length > 0) {
          const total = phases.reduce((sum, p) => sum + p.progress, 0);
          this.roadmapProgress.set(Math.round(total / phases.length));
        }
      }
    });

    this.api.getDailySummary().subscribe({
      next: (summary) => this.summary.set(summary)
    });

    this.api.getWeeklyReport().subscribe({
      next: (report) => this.weeklyReport.set(report)
    });

    this.api.getHabits().subscribe({
      next: (habits) => {
        this.habits.set(habits.filter(h => h.active));
        this.totalHabits.set(habits.filter(h => h.active).length);
      }
    });

    this.api.getHabitLogs(this.getToday()).subscribe({
      next: (logs) => {
        this.habitLogs.set(logs);
        this.completedHabits.set(logs.filter(l => l.done).length);
      }
    });

    this.api.getTimeSlots().subscribe({
      next: (slots) => {
        this.supplementSlots.set(slots);
        let total = 0;
        slots.forEach(s => total += s.supplements.length);
        this.totalSupplements.set(total);
      }
    });

    this.api.getSupplementLogs(this.getToday()).subscribe({
      next: (logs) => {
        this.supplementLogs.set(logs);
        this.takenSupplements.set(logs.filter(l => l.taken).length);
      }
    });

    this.api.getSchedule().subscribe({
      next: (blocks) => this.scheduleBlocks.set(blocks)
    });

    this.api.getWorkoutLogs().subscribe({
      next: (logs) => {
        this.workoutLogs.set(logs);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekLogs = logs.filter(l => new Date(l.date) >= weekAgo && l.completed);
        const uniqueDays = new Set(weekLogs.map(l => new Date(l.date).toDateString()));
        this.weekWorkouts.set(uniqueDays.size);
      }
    });

    // Load habit logs for last 7 days for chart
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = this.formatDate(d);
      this.api.getHabitLogs(dateStr).subscribe({
        next: (logs) => {
          const done = logs.filter(l => l.done).length;
          const total = this.totalHabits() || 1;
          this._weekHabitData.push({ date: dateStr, done, total, percent: Math.round((done / total) * 100) });
        }
      });
    }

    // Load heatmap data for last 365 days
    const heatmap: Record<string, number> = {};
    const today = new Date();
    let loaded = 0;
    const totalDays = 365;
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = this.formatDate(d);
      this.api.getHabitLogs(dateStr).subscribe({
        next: (logs) => {
          const done = logs.filter(l => l.done).length;
          const total = this.totalHabits() || 1;
          heatmap[dateStr] = Math.round((done / total) * 100);
          loaded++;
          if (loaded === totalDays) {
            this.heatmapData.set(heatmap);
          }
        },
        error: () => {
          loaded++;
          if (loaded === totalDays) {
            this.heatmapData.set(heatmap);
          }
        }
      });
    }
  }

  private _weekHabitData: any[] = [];

  weekDaysHabits() {
    const persianDays = ['جمعه', 'پنج', 'چهار', 'سه', 'دو', 'یک', 'امروز'];
    return this._weekHabitData.map((d, i) => ({
      date: d.date,
      label: persianDays[i] || '',
      percent: d.percent || 0
    }));
  }

  weekWorkoutDays() {
    const persianDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    return persianDays.map((label, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = this.formatDate(d);
      const logged = this.workoutLogs().some(l => {
        const logDate = this.formatDate(new Date(l.date));
        return logDate === dateStr && l.completed;
      });
      return { label, logged };
    });
  }

  private updateCurrentTime() {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const isWeekend = now.getDay() === 5 || now.getDay() === 6;
    const dayType = isWeekend ? 'weekend' : 'workday';
    const blocks = this.scheduleBlocks().filter(b => b.dayType === dayType);
    const current = blocks.find(b => currentTime >= b.startTime && currentTime < b.endTime);
    this.currentBlock.set(current || null);
    this.currentActivity.set(current?.activity || null);
  }

  isHabitDone(habitId: number): boolean {
    return this.habitLogs().some(l => l.habitId === habitId && l.done);
  }

  toggleHabit(habitId: number, done: boolean) {
    const today = this.getToday();
    this.api.logHabit(habitId, today, done).subscribe({
      next: () => {
        if (done) {
          this.habitLogs.update(logs => [...logs, { id: Date.now(), habitId, date: today, done }]);
          this.completedHabits.update(c => c + 1);
        } else {
          this.habitLogs.update(logs => logs.filter(l => !(l.habitId === habitId)));
          this.completedHabits.update(c => c - 1);
        }
      }
    });
  }

  isSupplementTaken(supplementId: number): boolean {
    return this.supplementLogs().some(l => l.supplementId === supplementId && l.taken);
  }

  toggleSupplement(supplementId: number, taken: boolean) {
    this.api.logSupplement(supplementId, taken).subscribe({
      next: () => {
        if (taken) {
          this.supplementLogs.update(logs => [...logs, { id: Date.now(), supplementId, date: this.getToday(), taken, takenAt: new Date().toISOString() }]);
          this.takenSupplements.update(c => c + 1);
        } else {
          this.supplementLogs.update(logs => logs.filter(l => l.supplementId !== supplementId));
          this.takenSupplements.update(c => c - 1);
        }
      }
    });
  }

  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }

  private getToday(): string {
    return this.formatDate(new Date());
  }
}
