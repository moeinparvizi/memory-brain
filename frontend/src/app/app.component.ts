import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { HeaderComponent } from './shared/components/header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    @if (!isLoginPage) {
      <div class="flex min-h-screen">
        <app-sidebar (toggle)="sidebarOpen = !sidebarOpen" [isOpen]="sidebarOpen"></app-sidebar>
        <div class="flex-1 flex flex-col min-h-screen mr-0 lg:mr-64">
          <app-header (toggleSidebar)="sidebarOpen = !sidebarOpen"></app-header>
          <main class="flex-1 p-4 lg:p-6 animate-fade-in relative z-10">
            <router-outlet></router-outlet>
          </main>
        </div>
      </div>
    } @else {
      <router-outlet></router-outlet>
    }
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class AppComponent implements OnInit {
  private router = inject(Router);

  sidebarOpen = false;
  isLoginPage = false;

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isLoginPage = event.urlAfterRedirects === '/login' || event.url === '/login';
    });

    this.isLoginPage = this.router.url === '/login';
  }
}
