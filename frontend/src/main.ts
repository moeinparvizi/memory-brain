import { runtimeConfig } from './environments/runtime-config';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withComponentInputBinding(), ...(runtimeConfig.useHashRouting ? [withHashLocation()] : [])),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations()
  ]
}).catch(err => console.error(err));
