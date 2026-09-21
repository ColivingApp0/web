import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Formato regional es-CO (fechas, moneda) para toda la aplicación.
registerLocaleData(localeEsCo);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
