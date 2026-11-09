import { Pipe, PipeTransform, inject } from '@angular/core';
import { LocaleService } from '../../core/services/locale.service';

@Pipe({ name: 'persianDate', standalone: true, pure: false })
export class PersianDatePipe implements PipeTransform {
  private i18n = inject(LocaleService);
  transform(value: Date | string | number, format = 'full'): string {
    return this.i18n.date(value, format);
  }
}
