import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const GlobalHttpInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // ABP-style error shape: { error: { code, message, details, validationErrors, ... } }
      const abp = err?.error?.error;

      if (abp) {
        // Build a concise message
        let concise = abp.message || err.statusText || 'An error occurred.';

        // If there are validation errors, show only the first (short) line
        if (Array.isArray(abp.validationErrors) && abp.validationErrors.length) {
          concise = abp.validationErrors[0]?.message || 'Validation error.';
        }

        // Sanitize payload: remove long details/stack/validation list
        const sanitizedBody = {
          ...(err.error ?? {}),
          error: {
            ...(abp ?? {}),
            message: concise,
            details: undefined,
            validationErrors: undefined,
            data: undefined,
          },
        };

        // Rethrow a cloned HttpErrorResponse with sanitized body
        const sanitized = new HttpErrorResponse({
          ...err,
          error: sanitizedBody,
          status: err.status,
          statusText: err.statusText,
          url: err.url ?? undefined,
        });

        // Do NOT mark handled, let ABP show its popup with our trimmed message
        return throwError(() => sanitized);
      }

      // Non-ABP error: wrap to ABP-like so the popup still shows something short
      const wrapped = new HttpErrorResponse({
        ...err,
        error: {
          error: {
            code: 'Unknown',
            message: err.message || 'Unexpected error',
          },
        },
      });
      return throwError(() => wrapped);
    })
  );
};
