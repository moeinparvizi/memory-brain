import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div class="bg-dark-card border border-dark-border rounded-xl p-6 max-w-md w-full mx-4 animate-slide-up">
        <h3 class="text-lg font-semibold mb-4">{{ message }}</h3>
        <div class="flex gap-3 justify-end">
          <button
            (click)="cancelled.emit()"
            class="btn-secondary"
          >
            {{ cancelText }}
          </button>
          <button
            (click)="confirmed.emit()"
            class="btn-danger"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ConfirmDialogComponent {
  @Input() message = 'آیا مطمئن هستید؟';
  @Input() confirmText = 'تأیید';
  @Input() cancelText = 'لغو';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
