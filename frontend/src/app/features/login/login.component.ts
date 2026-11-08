import { Component, inject, signal, OnInit, NgZone, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

declare var google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center">
      <div class="card max-w-md w-full mx-4 p-8 animate-slide-up">
        <!-- Demo credentials banner -->
        <div class="absolute top-0 left-0 right-0 bg-galaxy-primary/10 border-b border-galaxy-border px-6 py-2 z-10">
          <div class="flex items-center gap-2 text-xs text-galaxy-primary font-medium">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>Demo mode</span>
          </div>
          <div class="mt-1 text-xs text-slate-500 font-mono">
            Username: <span class="text-galaxy-primary">demo</span>&nbsp;|&nbsp;Password: <span class="text-galaxy-primary">demo123</span>
          </div>
        </div>

        <div class="text-center mb-8 pt-4">
          <img src="assets/icons/logo.svg" alt="Memory Brain" class="w-16 h-16 mx-auto mb-4 rounded-2xl">
          <h1 class="text-2xl font-bold bg-gradient-to-l from-primary-300 to-primary-500 bg-clip-text text-transparent">
            Memory Brain
          </h1>
          <p class="text-slate-400 mt-2 text-sm">Personal life dashboard</p>
        </div>

        <div class="space-y-4">
          <!-- Google Sign-In Button -->
          <div #googleBtn class="flex justify-center min-h-[44px]"></div>

          @if (error()) {
            <p class="text-red-400 text-sm text-center">{{ error() }}</p>
          }

          @if (loading()) {
            <p class="text-primary-400 text-sm text-center flex items-center justify-center gap-2">
              <span class="animate-spin">⏳</span> Signing in...
            </p>
          }

          <div class="relative my-6">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-galaxy-border"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-4 bg-galaxy-card text-slate-400">Or</span>
            </div>
          </div>

          <!-- Username / Password Login -->
          <form (ngSubmit)="login()" class="space-y-4" #loginForm="ngForm">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Username</label>
              <input
                [(ngModel)]="username"
                name="username"
                type="text"
                class="input-field"
                placeholder="e.g. demo"
                required
              >
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <input
                [(ngModel)]="password"
                name="password"
                type="password"
                class="input-field"
                placeholder="••••••••"
                required
              >
            </div>

            <button
              type="submit"
              class="btn-primary w-full"
              [disabled]="loading()"
            >
              Sign in
            </button>
          </form>

          <div class="relative my-6">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-galaxy-border"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-4 bg-galaxy-card text-slate-400">Or continue with</span>
            </div>
          </div>

          <!-- Phone Login -->
          @if (!otpSent()) {
            <form (ngSubmit)="sendOtp()" class="space-y-4" #otpForm="ngForm">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Phone number</label>
                <input
                  [(ngModel)]="phone"
                  name="phone"
                  type="tel"
                  class="input-field"
                  placeholder="e.g. +989121234567"
                  required
                  dir="ltr"
                >
              </div>

              <button
                type="submit"
                class="btn-secondary w-full"
                [disabled]="loading()"
              >
                Send verification code
              </button>
            </form>
          } @else {
            <form (ngSubmit)="verifyOtp()" class="space-y-4">
              <div class="text-center">
                <p class="text-sm text-slate-400">Verification code sent to:</p>
                <p class="text-primary-400 font-mono" dir="ltr">{{ phone }}</p>
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Code</label>
                <input
                  [(ngModel)]="otpCode"
                  name="otpCode"
                  type="text"
                  class="input-field text-center text-2xl tracking-[0.5em]"
                  placeholder="------"
                  maxlength="6"
                  required
                  dir="ltr"
                  autocomplete="one-time-code"
                >
              </div>

              <button
                type="submit"
                class="btn-secondary w-full"
                [disabled]="loading()"
              >
                Verify & sign in
              </button>

              <button
                type="button"
                (click)="resetOtp()"
                class="w-full text-sm text-slate-400 hover:text-slate-300 transition-colors"
              >
                Change phone number
              </button>
            </form>
          }

          <p class="text-xs text-center text-slate-500 mt-4">
            Don't have an account? <span class="text-galaxy-primary cursor-pointer hover:underline">Sign up</span>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class LoginComponent implements OnInit {
  @ViewChild('googleBtn') googleBtn!: ElementRef;

  private authService = inject(AuthService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  username = '';
  password = '';
  phone = '';
  otpCode = '';
  loading = signal(false);
  error = signal<string | null>(null);
  otpSent = signal(false);
  googleClientId = environment.googleClientId;

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadGoogleScript();
  }

  login() {
    if (!this.username || !this.password) {
      this.error.set('Please enter username and password');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Invalid username or password');
      },
    });
  }

  private loadGoogleScript() {
    const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existingScript) {
      this.waitForGoogle();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => this.waitForGoogle();
    document.head.appendChild(script);
  }

  private waitForGoogle() {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      this.renderGoogleButton();
    } else {
      setTimeout(() => this.waitForGoogle(), 200);
    }
  }

  private renderGoogleButton() {
    google.accounts.id.initialize({
      client_id: this.googleClientId,
      callback: (response: any) => {
        this.ngZone.run(() => {
          this.handleGoogleResponse(response);
        });
      },
    });

    if (this.googleBtn) {
      google.accounts.id.renderButton(this.googleBtn.nativeElement, {
        type: 'standard',
        size: 'large',
        theme: 'dark',
        text: 'sign_in_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 300,
      });
    }
  }

  handleGoogleResponse(response: any) {
    this.loading.set(true);
    this.error.set(null);

    this.authService.googleLogin(response.credential).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('Error signing in with Google');
      }
    });
  }

  sendOtp() {
    if (!this.phone) {
      this.error.set('Please enter your phone number');
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
        this.error.set(err.error?.error || 'Failed to send verification code');
      }
    });
  }

  verifyOtp() {
    if (!this.otpCode || this.otpCode.length !== 6) {
      this.error.set('Please enter the 6-digit verification code');
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
        this.error.set(err.error?.error || 'Invalid verification code');
      }
    });
  }

  resetOtp() {
    this.otpSent.set(false);
    this.otpCode = '';
    this.error.set(null);
  }
}
