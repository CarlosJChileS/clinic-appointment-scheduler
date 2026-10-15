import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsEc from '@angular/common/locales/es-EC';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';

registerLocaleData(localeEsEc);

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), { provide: LOCALE_ID, useValue: 'es-EC' }, provideRouter(routes, withPreloading(PreloadAllModules)), provideHttpClient(withInterceptors([(req, next) => {
    const token = localStorage.getItem('clinic_token');
    return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
  }]))],
};
