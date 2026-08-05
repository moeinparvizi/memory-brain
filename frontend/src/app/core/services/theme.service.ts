import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme = signal<'dark' | 'light'>(this.getInitialTheme());

  constructor() {
    effect(() => {
      this.applyTheme(this.theme());
    });
  }

  toggleTheme() {
    this.theme.update(current => current === 'dark' ? 'light' : 'dark');
  }

  private applyTheme(theme: 'dark' | 'light') {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.classList.add('bg-slate-900', 'text-white');
      document.body.classList.remove('bg-white', 'text-slate-900');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.body.classList.remove('bg-slate-900', 'text-white');
      document.body.classList.add('bg-white', 'text-slate-900');
    }
    localStorage.setItem('theme', theme);
  }

  private getInitialTheme(): 'dark' | 'light' {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
    }
    return 'dark';
  }
}
