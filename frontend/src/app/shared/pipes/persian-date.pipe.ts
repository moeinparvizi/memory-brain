import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'persianDate',
  standalone: true
})
export class PersianDatePipe implements PipeTransform {
  private persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  private persianMonths = [
    'ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن',
    'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'
  ];

  private persianWeekdays = [
    'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'
  ];

  transform(value: Date | string | number, format: string = 'full'): string {
    const date = value instanceof Date ? value : new Date(value);

    if (isNaN(date.getTime())) {
      return '';
    }

    const year = this.toPersianNumber(date.getFullYear());
    const month = this.toPersianNumber(date.getMonth() + 1);
    const day = this.toPersianNumber(date.getDate());
    const weekday = this.persianWeekdays[date.getDay()];
    const monthName = this.persianMonths[date.getMonth()];

    switch (format) {
      case 'full':
        return `${weekday}، ${day} ${monthName} ${year}`;
      case 'short':
        return `${day}/${month}/${year}`;
      case 'weekday':
        return weekday;
      case 'time':
        const hours = this.toPersianNumber(date.getHours());
        const minutes = this.toPersianNumber(date.getMinutes());
        return `${hours}:${minutes}`;
      default:
        return `${weekday}، ${day} ${monthName} ${year}`;
    }
  }

  private toPersianNumber(num: number): string {
    return num.toString().replace(/\d/g, d => this.persianDigits[parseInt(d)]);
  }
}
