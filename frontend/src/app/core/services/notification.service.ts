import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  permission = signal<NotificationPermission>('default');
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    if (typeof Notification !== 'undefined') {
      this.permission.set(Notification.permission);
    }
  }

  async requestPermission(): Promise<boolean> {
    if (typeof Notification === 'undefined') return false;
    const result = await Notification.requestPermission();
    this.permission.set(result);
    return result === 'granted';
  }

  scheduleReminder(title: string, body: string, delayMs: number, tag?: string) {
    if (this.permission() !== 'granted') return;
    const timer = setTimeout(() => this.show(title, body, tag), delayMs);
    this.timers.push(timer);
  }

  scheduleRepeating(title: string, body: string, intervalMs: number, tag?: string) {
    if (this.permission() !== 'granted') return;
    const timer = setInterval(() => this.show(title, body, tag), intervalMs);
    this.timers.push(timer as any);
  }

  show(title: string, body: string, tag?: string) {
    if (this.permission() !== 'granted') return;
    new Notification(title, {
      body,
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-192.png',
      tag: tag || 'memory-gohar',
      requireInteraction: false,
    });
  }

  clearAll() {
    this.timers.forEach(t => {
      clearTimeout(t);
      clearInterval(t);
    });
    this.timers = [];
  }
}
