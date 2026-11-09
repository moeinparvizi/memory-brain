import { LocaleService } from '../../../core/services/locale.service';
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div class="bg-dark-card border border-dark-border rounded-xl p-6 max-w-md w-full mx-4 animate-slide-up">
        <h3 class="text-lg font-semibold mb-4">{{ i18n.t(message) }}</h3>
        <div class="flex gap-3 justify-end">
          <button
            (click)="cancelled.emit()"
            class="btn-secondary"
          >
            {{ i18n.t(cancelText) }}
          </button>
          <button
            (click)="confirmed.emit()"
            class="btn-danger"
          >
            {{ i18n.t(confirmText) }}
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
  i18n = inject(LocaleService);
  @Input() message = 'آیا مطمئن هستید؟';
  @Input() confirmText = 'تأیید';
  @Input() cancelText = 'لغو';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
