import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { finalize } from 'rxjs';

let isFirstFeedRequest = true;

export const spinnerInterceptor: HttpInterceptorFn = (req, next) => {
  const ngxSpinnerService = inject(NgxSpinnerService);

  // Skip spinner logic for authentication endpoints
  if (req.url.includes('/signup') || req.url.includes('/signin')) {
    return next(req);
  }

  // Only trigger full-screen spinner on the first feed fetch (browser load/reload)
  if (req.url.includes('/posts')) {
    if (!isFirstFeedRequest) {
      return next(req);
    }
    isFirstFeedRequest = false;
  } else {
    return next(req);
  }

  ngxSpinnerService.show();

  return next(req).pipe(
    finalize(() => {
      ngxSpinnerService.hide();
    }),
  );
};
