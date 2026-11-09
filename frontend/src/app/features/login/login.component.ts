import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LocaleService } from '../../core/services/locale.service';
import { AuthService } from '../../core/services/auth.service';
import { FirebaseAuthService } from '../../core/services/firebase-auth.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login', standalone: true, imports: [FormsModule, LanguageSwitcherComponent],
  template: `
    <main class="min-h-screen flex items-center justify-center py-10">
      <section class="card max-w-md w-full mx-4 p-6 sm:p-8" aria-labelledby="login-title">
        <app-language-switcher></app-language-switcher>
        <div class="text-center my-6">
          <img src="assets/icons/logo.svg" alt="" class="w-14 h-14 mx-auto mb-3 rounded-xl">
          <h1 id="login-title" class="text-2xl font-bold text-primary-300">{{ i18n.t('مموری مغز') }}</h1>
          <p class="text-slate-300 mt-2 text-sm">{{ i18n.t('داشبورد زندگی شخصی') }}</p>
        </div>
        <div aria-live="polite" aria-atomic="true">
          @if(error()) { <p role="alert" class="text-red-300 text-sm mb-4">{{ i18n.t(error()!) }}</p> }
          @if(message()) { <p class="text-primary-200 text-sm mb-4">{{ i18n.t(message()!) }}</p> }
          @if(loading()) { <p class="text-slate-200 text-sm mb-4">{{ i18n.t('لطفاً صبر کنید…') }}</p> }
        </div>
        @if(pendingEmail()) {
          <h2 class="font-semibold text-lg">{{ i18n.t('ایمیل خود را تأیید کنید') }}</h2>
          <p class="text-sm text-slate-300 mt-2">{{ i18n.t('پیوند تأیید را در صندوق ورودی یا پوشه هرزنامه باز کنید، سپس برگردید.') }}</p>
          <p dir="ltr" class="text-primary-200 my-4 break-all">{{ pendingEmail() }}</p>
          <div class="space-y-3">
            <button type="button" class="btn-primary w-full" [disabled]="loading()" (click)="checkVerification()">{{ i18n.t('ایمیل را تأیید کردم') }}</button>
            <button type="button" class="btn-secondary w-full" [disabled]="loading() || resendSeconds() > 0" (click)="resendVerification()">{{ i18n.t('ارسال دوباره ایمیل') }} @if(resendSeconds() > 0) { ({{ resendSeconds() }}) }</button>
            <button type="button" class="text-link w-full" [disabled]="loading()" (click)="changeAccount()">{{ i18n.t('بازگشت و تغییر حساب') }}</button>
          </div>
        } @else {
          <div class="flex gap-2 mb-5" role="group" [attr.aria-label]="i18n.t('روش ورود')">
            <button type="button" class="auth-tab" [class.active]="mode() === 'signin'" [attr.aria-pressed]="mode() === 'signin'" [disabled]="loading()" (click)="setMode('signin')">{{ i18n.t('ورود با ایمیل') }}</button>
            <button type="button" class="auth-tab" [class.active]="mode() === 'signup'" [attr.aria-pressed]="mode() === 'signup'" [disabled]="loading()" (click)="setMode('signup')">{{ i18n.t('ثبت‌نام') }}</button>
            <button type="button" class="auth-tab" [class.active]="mode() === 'private'" [attr.aria-pressed]="mode() === 'private'" [disabled]="loading()" (click)="setMode('private')">{{ i18n.t('ورود خصوصی') }}</button>
          </div>
          @if(mode() === 'private') {
            <form (ngSubmit)="login()" class="space-y-4">
              <div><label for="username">{{ i18n.t('نام کاربری') }}</label><input id="username" name="username" [(ngModel)]="username" class="input-field" required autocomplete="username"></div>
              <div><label for="private-password">{{ i18n.t('رمز عبور') }}</label><input id="private-password" name="password" [(ngModel)]="password" type="password" class="input-field" required autocomplete="current-password"></div>
              <button class="btn-primary w-full" [disabled]="loading()">{{ i18n.t('ورود') }}</button>
            </form>
          } @else {
            @if(!firebase.available) { <p role="status" class="text-sm text-slate-300 mb-4">{{ i18n.t('ورود با ایمیل و گوگل هنوز پیکربندی نشده است. از نسخه نمایشی یا ورود خصوصی استفاده کنید.') }}</p> }
            <form (ngSubmit)="submitEmail()" class="space-y-4">
              <div><label for="email">{{ i18n.t('ایمیل') }}</label><input id="email" name="email" [(ngModel)]="email" type="email" dir="ltr" autocomplete="email" class="input-field" required [disabled]="!firebase.available || loading()"></div>
              <div><label for="email-password">{{ i18n.t('رمز عبور') }}</label><input id="email-password" name="emailPassword" [(ngModel)]="emailPassword" type="password" [attr.autocomplete]="mode() === 'signup' ? 'new-password' : 'current-password'" minlength="6" class="input-field" required [disabled]="!firebase.available || loading()"></div>
              @if(mode() === 'signup') { <p class="text-xs text-slate-300">{{ i18n.t('رمز عبور حداقل ۶ نویسه باشد. ورود پس از تأیید ایمیل فعال می‌شود.') }}</p> }
              <button class="btn-primary w-full" [disabled]="loading() || !firebase.available">{{ i18n.t(mode() === 'signup' ? 'ساخت حساب و ارسال ایمیل تأیید' : 'ورود با ایمیل') }}</button>
            </form>
            @if(mode() === 'signin') { <button type="button" class="text-link w-full mt-2" [disabled]="loading() || !firebase.available" (click)="resetPassword()">{{ i18n.t('بازیابی رمز عبور') }}</button> }
            <button type="button" class="btn-secondary w-full mt-4" [disabled]="loading() || !firebase.available" (click)="googleLogin()">{{ i18n.t('ادامه با گوگل') }}</button>
          }
          <div class="mt-7 pt-5 border-t border-galaxy-border">
            <h2 class="font-semibold">{{ i18n.t('نسخه نمایشی عمومی') }}</h2>
            <p class="text-sm text-slate-300 mt-2">{{ i18n.t('داده‌های نمونه مشترک‌اند؛ تغییرات شما برای همه قابل مشاهده است.') }}</p>
            <p class="text-sm text-slate-200 my-3">{{ i18n.t('نام کاربری') }}: <code dir="ltr">demo</code> · {{ i18n.t('رمز عبور') }}: <code dir="ltr">demo1234</code></p>
            <button type="button" class="btn-secondary w-full" [disabled]="loading()" (click)="demoLogin()">{{ i18n.t('ورود به نسخه نمایشی') }}</button>
          </div>
          @if(phoneLoginEnabled) {
            <details class="mt-5"><summary class="text-link">{{ i18n.t('ورود با شماره تلفن') }}</summary>
              <form (ngSubmit)="otpSent() ? verifyOtp() : sendOtp()" class="space-y-4 mt-3">
                <div><label for="phone">{{ i18n.t('شماره تلفن') }}</label><input id="phone" name="phone" type="tel" dir="ltr" class="input-field" [(ngModel)]="phone" required [disabled]="otpSent()"></div>
                @if(otpSent()) { <div><label for="otp">{{ i18n.t('کد') }}</label><input id="otp" name="otp" class="input-field" [(ngModel)]="otpCode" autocomplete="one-time-code" inputmode="numeric" maxlength="6" required></div> }
                <button class="btn-secondary w-full" [disabled]="loading()">{{ i18n.t(otpSent() ? 'تأیید و ورود' : 'ارسال کد تأیید') }}</button>
                @if(otpSent()) { <button type="button" class="text-link" (click)="resetOtp()">{{ i18n.t('تغییر شماره تلفن') }}</button> }
              </form>
            </details>
          }
        }
      </section>
    </main>
  `,
  styles: [`
    :host { display:block; }
    label { display:block; font-size:.875rem; margin-bottom:.375rem; color:#cbd5e1; }
    .auth-tab { flex:1; min-height:44px; font-size:.8rem; border-bottom:2px solid transparent; color:#cbd5e1; }
    .auth-tab.active { border-color:#a78bfa; color:#ddd6fe; }
    .text-link { color:#c4b5fd; min-height:44px; text-decoration:underline; text-underline-offset:4px; }
    button:focus-visible, summary:focus-visible { outline:2px solid #c4b5fd; outline-offset:3px; }
    button:disabled { opacity:.5; cursor:not-allowed; }
    summary { cursor:pointer; }
  `]
})
export class LoginComponent implements OnInit, OnDestroy {
  i18n = inject(LocaleService);
  firebase = inject(FirebaseAuthService);
  private authService = inject(AuthService);
  private router = inject(Router);
  mode = signal<'signin' | 'signup' | 'private'>('signin');
  email = ''; emailPassword = ''; username = ''; password = ''; phone = ''; otpCode = '';
  loading = signal(false); error = signal<string | null>(null); message = signal<string | null>(null);
  pendingEmail = signal<string | null>(null); resendSeconds = signal(0); otpSent = signal(false);
  phoneLoginEnabled = environment.phoneLoginEnabled;
  private countdown?: ReturnType<typeof setInterval>;
  ngOnInit() { if(this.authService.isLoggedIn()) this.router.navigate(['/dashboard']); }
  ngOnDestroy() { clearInterval(this.countdown); }
  setMode(mode: 'signin' | 'signup' | 'private') { this.mode.set(mode); this.error.set(null); this.message.set(null); }
  private cooldown() { clearInterval(this.countdown); this.resendSeconds.set(60); this.countdown = setInterval(() => { this.resendSeconds.update(n => Math.max(0, n - 1)); if (!this.resendSeconds()) clearInterval(this.countdown); }, 1000); }
  private async run(action: () => Promise<void>) {
    if(this.loading()) return;
    this.loading.set(true); this.error.set(null); this.message.set(null);
    try { await action(); } catch(error: any) {
      if(!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(error?.code)) this.showFirebaseError(error);
    } finally { this.loading.set(false); }
  }
  async submitEmail() {
    if(!this.firebase.available) return;
    await this.run(async () => {
      this.email = this.email.trim();
      if(!this.email || this.emailPassword.length < 6) { this.error.set('ایمیل معتبر و رمز عبور حداقل ۶ نویسه‌ای را وارد کنید'); return; }
      if(this.mode() === 'signup') {
        await this.firebase.register(this.email, this.emailPassword);
        this.pendingEmail.set(this.email); this.emailPassword = '';
        await this.firebase.resend(); this.cooldown();
      } else {
        const token = await this.firebase.signIn(this.email, this.emailPassword);
        this.emailPassword = '';
        if(token) await this.exchange(token); else this.pendingEmail.set(this.email);
      }
    });
  }
  async checkVerification() { await this.run(async () => { const token = await this.firebase.verifiedToken(); if(token) await this.exchange(token); else this.message.set('ایمیل هنوز تأیید نشده است. پیوند ایمیل را باز کنید و دوباره بررسی کنید.'); }); }
  async resendVerification() { if(this.resendSeconds()) return; await this.run(async () => { await this.firebase.resend(); this.cooldown(); this.message.set('ایمیل تأیید ارسال شد.'); }); }
  async changeAccount() { await this.run(async () => { await this.firebase.clear(); this.pendingEmail.set(null); this.emailPassword = ''; this.resendSeconds.set(0); clearInterval(this.countdown); }); }
  async googleLogin() { if(!this.firebase.available) return; await this.run(async () => { const token = await this.firebase.google(); if(token) await this.exchange(token); else this.error.set('برای ورود، ایمیل حساب گوگل باید تأیید شده باشد.'); }); }
  async resetPassword() { if(!this.firebase.available) return; await this.run(async () => { if(!this.email.trim()) { this.error.set('ابتدا ایمیل خود را وارد کنید'); return; } await this.firebase.resetPassword(this.email.trim()); this.message.set('اگر حسابی با این ایمیل وجود داشته باشد، پیوند بازیابی ارسال می‌شود.'); }); }
  private async exchange(token: string) { await firstValueFrom(this.authService.firebaseLogin(token)); await this.firebase.clear(); this.router.navigate(['/dashboard']); }
  demoLogin() { this.loginWith('demo', 'demo1234'); }
  login() { if(!this.username || !this.password) { this.error.set('نام کاربری و رمز عبور را وارد کنید'); return; } this.loginWith(this.username, this.password); }
  private loginWith(username: string, password: string) {
    if(this.loading()) return;
    this.loading.set(true); this.error.set(null);
    this.authService.login(username, password).subscribe({next: () => {this.loading.set(false); this.router.navigate(['/dashboard']);}, error: error => {this.loading.set(false); this.showAuthError(error, 'نام کاربری یا رمز عبور نادرست است');}});
  }
  private showFirebaseError(error: any) {
    const messages: Record<string, string> = {
      'auth/email-already-in-use': 'این ایمیل قبلاً ثبت شده است. وارد شوید یا رمز عبور را بازیابی کنید.',
      'auth/invalid-email': 'ایمیل معتبر وارد کنید',
      'auth/weak-password': 'رمز عبور قوی‌تری انتخاب کنید؛ حداقل ۶ نویسه.',
      'auth/invalid-credential': 'ایمیل یا رمز عبور نادرست است',
      'auth/too-many-requests': 'درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.',
      'auth/network-request-failed': 'اتصال برقرار نشد. اینترنت را بررسی و دوباره تلاش کنید.',
      'auth/popup-blocked': 'مرورگر پنجره گوگل را مسدود کرد. پنجره‌های بازشو را مجاز کنید و دوباره تلاش کنید.',
    };
    this.error.set(messages[error?.code] || 'ورود انجام نشد. دوباره تلاش کنید یا از روش دیگری استفاده کنید.');
  }
  private showAuthError(error: any, fallback: string) { const messages: Record<string, string> = { 'کد تایید نامعتبر یا منقضی شده است': 'کد تأیید نامعتبر یا منقضی شده است', 'Invalid credentials': 'نام کاربری یا رمز عبور نادرست است' }; this.error.set(error?.status === 429 ? 'درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.' : messages[error?.error?.error] || fallback); }
  resetOtp() { this.otpSent.set(false); this.otpCode = ''; this.error.set(null); }
  sendOtp() {
    if (!this.phone) {
      this.error.set('شماره تلفن خود را وارد کنید');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.authService.sendOtp(this.phone).subscribe({
      next: () => {
        this.loading.set(false);
        this.otpSent.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.showAuthError(err, 'ارسال کد تأیید انجام نشد');
      }
    });
  }

  verifyOtp() {
    if (!this.otpCode || this.otpCode.length !== 6) {
      this.error.set('کد تأیید ۶ رقمی را وارد کنید');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.authService.verifyOtp(this.phone, this.otpCode).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.showAuthError(err, 'کد تأیید نادرست است');
      }
    });
  }

}
