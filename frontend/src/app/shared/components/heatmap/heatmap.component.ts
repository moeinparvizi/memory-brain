import { Component, Input, signal, OnInit } from '@angular/core';

@Component({
  selector: 'app-heatmap',
  standalone: true,
  template: `
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h4 class="text-xs text-slate-400">{{ title }}</h4>
        <div class="flex items-center gap-1 text-[10px] text-slate-500">
          <span>کم</span>
          <div class="w-2.5 h-2.5 rounded-sm bg-slate-800"></div>
          <div class="w-2.5 h-2.5 rounded-sm bg-green-900"></div>
          <div class="w-2.5 h-2.5 rounded-sm bg-green-700"></div>
          <div class="w-2.5 h-2.5 rounded-sm bg-green-500"></div>
          <div class="w-2.5 h-2.5 rounded-sm bg-green-400"></div>
          <span>زیاد</span>
        </div>
      </div>
      <div class="overflow-x-auto">
        <div class="flex gap-0.5 min-w-max">
          @for (week of weeks(); track $index) {
            <div class="flex flex-col gap-0.5">
              @for (day of week; track day.date) {
                <div
                  class="w-2.5 h-2.5 rounded-sm cursor-pointer transition-transform hover:scale-150"
                  [style.background-color]="getColor(day.value)"
                  [title]="day.date + ': ' + day.value + '%'"
                ></div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class HeatmapComponent implements OnInit {
  @Input() title = 'نقشه حرارتی';
  @Input() data: Record<string, number> = {};

  weeks = signal<{ date: string; value: number }[][]>([]);

  ngOnInit() {
    this.generateCalendar();
  }

  private generateCalendar() {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364);

    // Align to Saturday (Persian week starts on Saturday)
    while (startDate.getDay() !== 6) {
      startDate.setDate(startDate.getDate() - 1);
    }

    const weeks: { date: string; value: number }[][] = [];
    let currentWeek: { date: string; value: number }[] = [];
    const current = new Date(startDate);

    while (current <= today) {
      const dateStr = this.formatDate(current);
      const value = this.data[dateStr] || 0;
      currentWeek.push({ date: dateStr, value });

      if (current.getDay() === 5) { // Friday = end of Persian week
        weeks.push(currentWeek);
        currentWeek = [];
      }

      current.setDate(current.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    this.weeks.set(weeks);
  }

  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }

  getColor(value: number): string {
    if (value === 0) return '#1e293b';
    if (value < 25) return '#14532d';
    if (value < 50) return '#166534';
    if (value < 75) return '#22c55e';
    return '#4ade80';
  }
}
