import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideToastr } from 'ngx-toastr';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { errorsInterceptor } from './core/interceptors/errors/errors-interceptor';
import { NgxSpinnerModule } from 'ngx-spinner';
import { spinnerInterceptor } from './core/interceptors/spinner/spinner-interceptor';
import { tokenInterceptor } from './core/interceptors/token/token-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
      withViewTransitions({
        skipInitialTransition: true,
      }),
    ),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(),
      withInterceptors([errorsInterceptor, tokenInterceptor, spinnerInterceptor]),
    ),
    provideToastr(), // Toastr providers
    importProvidersFrom(NgxSpinnerModule),
  ],
};
