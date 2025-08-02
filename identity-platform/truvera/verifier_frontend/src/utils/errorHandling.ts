import { ErrorState } from '../types';

/**
 * Convert error objects to user-friendly messages
 */
export function getErrorMessage(error: ErrorState): string {
  switch (error.type) {
    case 'network':
      if (error.code === 'NETWORK_ERROR') {
        return 'Unable to connect to the verification service. Please check your internet connection and try again.';
      }
      return 'A network error occurred. Please try again.';

    case 'validation':
      if (error.code.startsWith('HTTP_4')) {
        return error.message || 'Invalid request. Please check your input and try again.';
      }
      return 'Validation error. Please check your input.';

    case 'verification':
      return error.message || 'Credential verification failed. Please check the credentials and try again.';

    case 'integration':
      return 'Custom integration failed. The verification was successful, but the custom action could not be completed.';

    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Get appropriate retry action text based on error type
 */
export function getRetryActionText(error: ErrorState): string | null {
  if (!error.recoverable) {
    return null;
  }

  switch (error.type) {
    case 'network':
      return 'Retry Connection';
    case 'verification':
      return 'Retry Verification';
    default:
      return 'Try Again';
  }
}

/**
 * Determine if an error should show technical details to the user
 */
export function shouldShowTechnicalDetails(error: ErrorState): boolean {
  // Only show technical details for validation errors or when explicitly requested
  return error.type === 'validation' && error.details;
}

/**
 * Create a user-friendly error state from an unknown error
 */
export function createErrorState(
  error: unknown,
  type: ErrorState['type'] = 'network'
): ErrorState {
  if (error instanceof Error) {
    return {
      type,
      code: 'UNKNOWN_ERROR',
      message: error.message,
      details: error.stack,
      recoverable: type === 'network',
    };
  }

  return {
    type,
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    details: error,
    recoverable: type === 'network',
  };
}

/**
 * Log errors for debugging while respecting user privacy
 */
export function logError(error: ErrorState, context?: string): void {
  const logData = {
    type: error.type,
    code: error.code,
    message: error.message,
    context,
    timestamp: new Date().toISOString(),
    // Only include details in development
    ...(import.meta.env.DEV && { details: error.details }),
  };

  console.error('Verification Error:', logData);
}

/**
 * Create retry function for recoverable errors
 */
export function createRetryFunction(
  originalFunction: () => Promise<any>,
  onRetry?: () => void
): (() => void) | undefined {
  return () => {
    if (onRetry) {
      onRetry();
    }
    originalFunction().catch((error) => {
      console.error('Retry failed:', error);
    });
  };
}