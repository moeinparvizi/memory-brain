import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  template: `
    <div class="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-500 ease-out"
        [style.width.%]="value"
        [style.background-color]="getColor()"
      ></div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ProgressBarComponent {
  @Input() value = 0;
  @Input() color = 'bg-primary-500';

  getColor(): string {
    const colorMap: Record<string, string> = {
      'bg-primary-500': '#f59e0b',
      'bg-green-500': '#22c55e',
      'bg-blue-500': '#3b82f6',
      'bg-red-500': '#ef4444',
      'bg-purple-500': '#a855f7',
      'bg-amber-500': '#f59e0b',
    };
    return colorMap[this.color] || '#f59e0b';
  }
}
