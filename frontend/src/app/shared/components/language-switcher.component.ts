import { Component, inject } from '@angular/core';
import { LocaleService, Language } from '../../core/services/locale.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  template: `
    <label class="flex flex-wrap items-center gap-3 text-sm">
      <span>{{ i18n.t('زبان برنامه') }}</span>
      <select class="select-field !w-auto" [value]="i18n.language()" (change)="selectLanguage($event)">
        <option value="fa" lang="fa">فارسی</option>
        <option value="en" lang="en">English</option>
      </select>
    </label>
  `,
})
export class LanguageSwitcherComponent {
  i18n = inject(LocaleService);
  selectLanguage(event: Event) {
    this.i18n.setLanguage((event.target as HTMLSelectElement).value as Language);
  }
}
