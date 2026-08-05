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
        <div class="text-center mb-8">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center glow-strong">
            <span class="text-3xl">🌌</span>
          </div>
          <h1 class="text-2xl font-bold bg-gradient-to-l from-primary-300 to-primary-500 bg-clip-text text-transparent">
            مموری مغر
          </h1>
          <p class="text-slate-400 mt-2 text-sm">مدیریت زندگی شخصی</p>
        </div>

        <div class="space-y-4">
          <!-- Google Sign-In Button -->
          <div #googleBtn class="flex justify-center min-h-[44px]"></div>

          @if (error()) {
            <p class="text-red-400 text-sm text-center">{{ error() }}</p>
          }

          @if (loading()) {
            <p class="text-primary-400 text-sm text-center flex items-center justify-center gap-2">
              <span class="animate-spin">⏳</span> در حال ورود...
            </p>
          }

          <div class="relative my-6">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-galaxy-border"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-4 bg-galaxy-card text-slate-400">یا</span>
            </div>
          </div>

          <!-- Legacy Login -->
          <form (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <input
                [(ngModel)]="username"
                name="username"
                class="input-field"
                placeholder="نام کاربری"
                required
              >
            </div>

            <div>
              <input
                [(ngModel)]="password"
                name="password"
                type="password"
                class="input-field"
                placeholder="رمز عبور"
                required
              >
            </div>

            <button
              type="submit"
              class="btn-secondary w-full"
              [disabled]="loading()"
            >
              ورود با رمز عبور
            </button>
          </form>
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
  loading = signal(false);
  error = signal<string | null>(null);
  googleClientId = environment.googleClientId;

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadGoogleScript();
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
        this.error.set('خطا در ورود با گوگل');
      }
    });
  }

  onSubmit() {
    if (!this.username || !this.password) {
      this.error.set('نام کاربری و رمز عبور را وارد کنید');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('نام کاربری یا رمز عبور اشتباه است');
      }
    });
  }
}
