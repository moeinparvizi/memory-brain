import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <span class="text-4xl mb-4">{{ icon }}</span>
      <p class="text-slate-400 text-lg">{{ message }}</p>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class EmptyStateComponent {
  @Input() message = 'موردی یافت نشد';
  @Input() icon = '📭';
}
