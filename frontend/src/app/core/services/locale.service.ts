import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { EN, EN_SINGULAR } from '../i18n/en';

export type Language = 'fa' | 'en';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private document = inject(DOCUMENT);
  private readonly storageKey = 'memory-brain-language';
  private selected = signal<Language>(this.readLanguage());
  readonly language = this.selected.asReadonly();
  private changes = new Subject<Language>();
  readonly languageChanges = this.changes.asObservable();

  constructor() {
    this.updateDocument();
  }

  setLanguage(language: Language) {
    if ((language !== 'fa' && language !== 'en') || language === this.language()) return;
    this.selected.set(language);
    try { this.document.defaultView?.localStorage.setItem(this.storageKey, language); } catch { /* Storage can be disabled. */ }
    this.updateDocument();
    this.changes.next(language);
  }

  t(message: string, params: Record<string, string | number> = {}): string {
    const singular = EN_SINGULAR[message];
    const english = singular && Number(params[singular.count]) === 1 ? singular.text : EN[message];
    const translated = this.language() === 'en' ? english ?? message : message;
    return translated.replace(/\{(\w+)\}/g, (match, key) => params[key] === undefined ? match : typeof params[key] === 'number' ? this.number(params[key]) : String(params[key]));
  }

  number(value: number | string | null | undefined): string {
    return new Intl.NumberFormat(this.language() === 'en' ? 'en-US' : 'fa-IR', { maximumFractionDigits: 1 }).format(Number(value) || 0);
  }

  date(value: Date | string | number, format = 'full'): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const options: Intl.DateTimeFormatOptions = format === 'time' ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
      : format === 'weekday' ? { weekday: 'long' }
      : format === 'weekdayShort' ? { weekday: 'short' }
      : format === 'short' ? { year: 'numeric', month: '2-digit', day: '2-digit' }
      : { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    // Preserve the existing Gregorian calendar; language does not change stored dates.
    return new Intl.DateTimeFormat(this.language() === 'en' ? 'en-US' : 'fa-IR-u-ca-gregory', options).format(date);
  }

  private readLanguage(): Language {
    try { return this.document.defaultView?.localStorage.getItem(this.storageKey) === 'en' ? 'en' : 'fa'; } catch { return 'fa'; }
  }

  private updateDocument() {
    this.document.documentElement.setAttribute('lang', this.language());
    this.document.documentElement.setAttribute('dir', this.language() === 'en' ? 'ltr' : 'rtl');
    this.document.title = this.t('مموری مغز');
    this.document.querySelector('meta[name="description"]')?.setAttribute('content', this.t('مدیریت زندگی شخصی'));
  }
}
