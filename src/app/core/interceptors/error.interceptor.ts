import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

/** Set on requests whose errors are shown by the caller (e.g. the chat window). */
export const SKIP_ERROR_SNACKBAR = new HttpContextToken<boolean>(() => false);

export function errorDetail(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const detail = error.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((d) => d?.msg ?? String(d)).join('; ');
    if (error.status === 0) return 'Cannot reach the back end. Is the API running on port 8000?';
    return error.message;
  }
  if (error && typeof error === 'object' && (error as { name?: string }).name === 'TimeoutError') {
    return 'The request timed out.';
  }
  return error instanceof Error ? error.message : String(error);
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (!req.context.get(SKIP_ERROR_SNACKBAR)) {
        snackBar.open(errorDetail(error), 'Dismiss', { duration: 6000, panelClass: 'snack-error' });
      }
      return throwError(() => error);
    }),
  );
};
