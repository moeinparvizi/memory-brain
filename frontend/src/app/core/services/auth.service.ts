import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'auth_token';
  private userKey = 'auth_user';
  private tokenSignal = signal<string | null>(this.getStoredToken());
  private userSignal = signal<any>(this.getStoredUser());

  isLoggedIn = computed(() => !!this.tokenSignal());
  token = computed(() => this.tokenSignal());
  user = computed(() => this.userSignal());

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(username: string, password: string) {
    return this.http.post<any>(`${environment.apiUrl}/auth/login`, { username, password }).pipe(
      tap(response => {
        this.setToken(response.token);
        this.setUser(response.user);
      })
    );
  }

  googleLogin(credential: string) {
    return this.http.post<any>(`${environment.apiUrl}/auth/google`, { credential }).pipe(
      tap(response => {
        this.setToken(response.token);
        this.setUser(response.user);
      })
    );
  }

  logout() {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  refreshToken() {
    return this.http.post<any>(`${environment.apiUrl}/auth/refresh`, {}).pipe(
      tap(response => {
        this.setToken(response.token);
        if (response.user) this.setUser(response.user);
      })
    );
  }

  private setToken(token: string) {
    this.tokenSignal.set(token);
    localStorage.setItem(this.tokenKey, token);
  }

  private setUser(user: any) {
    this.userSignal.set(user);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  private getStoredToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }

  private getStoredUser(): any {
    if (typeof localStorage !== 'undefined') {
      const user = localStorage.getItem(this.userKey);
      return user ? JSON.parse(user) : null;
    }
    return null;
  }
}
