import { HttpErrorResponse } from '@angular/common/http';
import { toApiError } from './api-error';

describe('toApiError', () => {
  it('should map the backend ErrorResponse body including field errors', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        fieldErrors: { email: 'email is required' },
      },
    });

    expect(toApiError(error)).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      fieldErrors: { email: 'email is required' },
    });
  });

  it('should map security-style bodies that only carry a message', () => {
    const error = new HttpErrorResponse({
      status: 401,
      error: { message: 'Authentication required' },
    });

    const apiError = toApiError(error);

    expect(apiError.code).toBe('UNAUTHORIZED');
    expect(apiError.message).toBe('Authentication required');
    expect(apiError.fieldErrors).toEqual({});
  });

  it('should map network failures without response (status 0)', () => {
    expect(toApiError(new HttpErrorResponse({ status: 0 })).code).toBe('NETWORK_ERROR');
  });

  it('should fall back for unknown errors', () => {
    const apiError = toApiError(new Error('boom'));
    expect(apiError.code).toBe('UNKNOWN');
    expect(apiError.status).toBe(0);
  });
});
