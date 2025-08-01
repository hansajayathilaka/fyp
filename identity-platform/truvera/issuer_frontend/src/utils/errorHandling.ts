import { ApiError } from './api';

// Error types for better categorization
export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  SERVER = 'server',
  CLIENT = 'client',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  UNKNOWN = 'unknown'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Enhanced error interface
export interface EnhancedError {
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  code?: string;
  details?: unknown;
  timestamp: Date;
  userMessage: string;
  troubleshooting: string[];
  recoveryOptions: RecoveryOption[];
  shouldRetry: boolean;
  retryDelay?: number;
}

// Recovery option interface
export interface RecoveryOption {
  label: string;
  action: () => void | Promise<void>;
  description: string;
  primary?: boolean;
}

/**
 * Categorize error based on error type and code
 */
export function categorizeError(error: unknown): ErrorCategory {
  if (error instanceof ApiError) {
    if (error.status >= 500) {
      return ErrorCategory.SERVER;
    }
    
    if (error.status === 401) {
      return ErrorCategory.AUTHENTICATION;
    }
    
    if (error.status === 403) {
      return ErrorCategory.AUTHORIZATION;
    }
    
    if (error.status === 422 || error.code === 'INVALID_FORM_DATA') {
      return ErrorCategory.VALIDATION;
    }
    
    if (error.status === 0 || error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT_ERROR') {
      return ErrorCategory.NETWORK;
    }
    
    if (error.code?.includes('TRUVERA') || error.code?.includes('EXTERNAL')) {
      return ErrorCategory.EXTERNAL_SERVICE;
    }
    
    return ErrorCategory.CLIENT;
  }
  
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return ErrorCategory.NETWORK;
  }
  
  return ErrorCategory.UNKNOWN;
}

/**
 * Determine error severity
 */
export function determineErrorSeverity(error: unknown, category: ErrorCategory): ErrorSeverity {
  if (error instanceof ApiError) {
    // Critical errors that prevent core functionality
    if (error.status >= 500 || error.code === 'SESSION_CREATION_FAILED') {
      return ErrorSeverity.CRITICAL;
    }
    
    // High severity for authentication and external service issues
    if (category === ErrorCategory.AUTHENTICATION || 
        category === ErrorCategory.EXTERNAL_SERVICE ||
        error.code === 'CREDENTIAL_ISSUANCE_FAILED') {
      return ErrorSeverity.HIGH;
    }
    
    // Medium severity for validation and client errors
    if (category === ErrorCategory.VALIDATION || category === ErrorCategory.CLIENT) {
      return ErrorSeverity.MEDIUM;
    }
  }
  
  // Network errors are typically medium severity unless they persist
  if (category === ErrorCategory.NETWORK) {
    return ErrorSeverity.MEDIUM;
  }
  
  return ErrorSeverity.LOW;
}

/**
 * Generate user-friendly error message
 */
export function generateUserMessage(error: unknown, category: ErrorCategory): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'MISSING_SESSION_ID':
      case 'SESSION_EXPIRED':
        return 'Your session has expired. Please refresh the page and try again.';
      
      case 'INVALID_FORM_DATA':
        return 'Please check your form data and correct any errors before submitting.';
      
      case 'WALLET_NOT_CONNECTED':
        return 'Your wallet connection was lost. Please reconnect your wallet and try again.';
      
      case 'CREDENTIAL_ISSUANCE_FAILED':
        return 'We encountered an issue while creating your credential. Please try again or contact support.';
      
      case 'CREDENTIAL_OFFER_CREATION_FAILED':
        return 'Failed to create your credential offer. This may be a temporary issue - please try again.';
      
      case 'TRUVERA_API_ERROR':
        return 'Our credential service is temporarily unavailable. Please try again in a few moments.';
      
      case 'NETWORK_ERROR':
      case 'TIMEOUT_ERROR':
        return 'Network connection issue. Please check your internet connection and try again.';
      
      case 'FORM_STORAGE_FAILED':
        return 'Failed to save your information. Please check your data and try submitting again.';
      
      default:
        if (error.status >= 500) {
          return 'We\'re experiencing technical difficulties. Our team has been notified and is working to resolve the issue.';
        }
        
        if (error.status === 401) {
          return 'Authentication failed. Please refresh the page and try again.';
        }
        
        if (error.status === 403) {
          return 'You don\'t have permission to perform this action. Please contact support if you believe this is an error.';
        }
        
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }
  
  // Category-based messages for non-API errors
  switch (category) {
    case ErrorCategory.NETWORK:
      return 'Network connection issue. Please check your internet connection and try again.';
    
    case ErrorCategory.VALIDATION:
      return 'Please check your input data and correct any errors.';
    
    case ErrorCategory.AUTHENTICATION:
      return 'Authentication failed. Please refresh the page and try again.';
    
    case ErrorCategory.AUTHORIZATION:
      return 'You don\'t have permission to perform this action.';
    
    case ErrorCategory.SERVER:
      return 'We\'re experiencing technical difficulties. Please try again in a few moments.';
    
    case ErrorCategory.EXTERNAL_SERVICE:
      return 'An external service is temporarily unavailable. Please try again later.';
    
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Generate troubleshooting steps
 */
export function generateTroubleshootingSteps(error: unknown, category: ErrorCategory): string[] {
  const commonSteps = [
    'Refresh the page and try again',
    'Check your internet connection',
    'Clear your browser cache and cookies',
    'Try using a different browser or incognito mode'
  ];
  
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'WALLET_NOT_CONNECTED':
        return [
          'Make sure MetaMask is installed and unlocked',
          'Check that you\'re connected to the correct network',
          'Try disconnecting and reconnecting your wallet',
          'Refresh the page and reconnect your wallet'
        ];
      
      case 'CREDENTIAL_ISSUANCE_FAILED':
        return [
          'Ensure your Dock wallet app is up to date',
          'Check that you have a stable internet connection',
          'Try generating a new QR code',
          'Make sure your wallet app has permission to access the camera',
          'Contact support if the issue persists'
        ];
      
      case 'INVALID_FORM_DATA':
        return [
          'Check that all required fields are filled out',
          'Verify that your email address is in the correct format',
          'Ensure your wallet address is valid',
          'Make sure your NIC number is entered correctly'
        ];
      
      case 'TRUVERA_API_ERROR':
        return [
          'Wait a few minutes and try again',
          'Check the service status page',
          'Try again during off-peak hours',
          'Contact support if the issue persists'
        ];
    }
  }
  
  // Category-specific troubleshooting
  switch (category) {
    case ErrorCategory.NETWORK:
      return [
        'Check your internet connection',
        'Try switching to a different network (mobile data/WiFi)',
        'Disable VPN if you\'re using one',
        'Check if other websites are working',
        'Contact your internet service provider if issues persist'
      ];
    
    case ErrorCategory.VALIDATION:
      return [
        'Review all form fields for errors',
        'Check that required fields are not empty',
        'Verify data formats (email, phone, etc.)',
        'Remove any special characters that might not be allowed'
      ];
    
    case ErrorCategory.EXTERNAL_SERVICE:
      return [
        'Wait a few minutes and try again',
        'Check the service status page',
        'Try again during off-peak hours',
        'Contact support if the service remains unavailable'
      ];
    
    default:
      return commonSteps;
  }
}

/**
 * Generate recovery options
 */
export function generateRecoveryOptions(
  error: unknown, 
  _category: ErrorCategory,
  context: {
    onRetry?: () => void | Promise<void>;
    onGoHome?: () => void;
    onRefresh?: () => void;
    onReconnectWallet?: () => void | Promise<void>;
    onContactSupport?: () => void;
  }
): RecoveryOption[] {
  const options: RecoveryOption[] = [];
  
  // Always provide retry option if available
  if (context.onRetry) {
    options.push({
      label: 'Try Again',
      action: context.onRetry,
      description: 'Retry the failed operation',
      primary: true
    });
  }
  
  // Specific recovery options based on error type
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'WALLET_NOT_CONNECTED':
        if (context.onReconnectWallet) {
          options.push({
            label: 'Reconnect Wallet',
            action: context.onReconnectWallet,
            description: 'Reconnect your MetaMask wallet',
            primary: true
          });
        }
        break;
      
      case 'SESSION_EXPIRED':
        if (context.onRefresh) {
          options.push({
            label: 'Refresh Page',
            action: context.onRefresh,
            description: 'Refresh the page to start a new session',
            primary: true
          });
        }
        break;
    }
  }
  
  // Common recovery options
  if (context.onRefresh && !options.some(opt => opt.label === 'Refresh Page')) {
    options.push({
      label: 'Refresh Page',
      action: context.onRefresh,
      description: 'Refresh the page to reset the application state'
    });
  }
  
  if (context.onGoHome) {
    options.push({
      label: 'Go to Home',
      action: context.onGoHome,
      description: 'Return to the home page and start over'
    });
  }
  
  if (context.onContactSupport) {
    options.push({
      label: 'Contact Support',
      action: context.onContactSupport,
      description: 'Get help from our support team'
    });
  }
  
  return options;
}

/**
 * Determine if error should trigger automatic retry
 */
export function shouldRetryAutomatically(error: unknown, category: ErrorCategory): boolean {
  if (error instanceof ApiError) {
    // Retry on server errors and network issues
    if (error.status >= 500 || error.status === 0) {
      return true;
    }
    
    // Retry on specific error codes
    if (['NETWORK_ERROR', 'TIMEOUT_ERROR', 'TRUVERA_API_ERROR'].includes(error.code || '')) {
      return true;
    }
    
    return false;
  }
  
  // Retry on network category errors
  return category === ErrorCategory.NETWORK;
}

/**
 * Get retry delay based on error type
 */
export function getRetryDelay(_error: unknown, _category: ErrorCategory, attempt: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  
  // Exponential backoff with jitter
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitter = Math.random() * 0.1 * delay; // 10% jitter
  
  return delay + jitter;
}

/**
 * Main function to enhance any error with comprehensive information
 */
export function enhanceError(
  error: unknown,
  context: {
    onRetry?: () => void | Promise<void>;
    onGoHome?: () => void;
    onRefresh?: () => void;
    onReconnectWallet?: () => void | Promise<void>;
    onContactSupport?: () => void;
  } = {}
): EnhancedError {
  const category = categorizeError(error);
  const severity = determineErrorSeverity(error, category);
  const userMessage = generateUserMessage(error, category);
  const troubleshooting = generateTroubleshootingSteps(error, category);
  const recoveryOptions = generateRecoveryOptions(error, category, context);
  const shouldRetry = shouldRetryAutomatically(error, category);
  
  let message = 'An unknown error occurred';
  let code: string | undefined;
  let details: unknown;
  
  if (error instanceof ApiError) {
    message = error.message;
    code = error.code;
    details = error.details;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }
  
  return {
    message,
    category,
    severity,
    code,
    details,
    timestamp: new Date(),
    userMessage,
    troubleshooting,
    recoveryOptions,
    shouldRetry,
    retryDelay: shouldRetry ? getRetryDelay(error, category, 0) : undefined
  };
}

/**
 * Log error with structured data
 */
export function logError(enhancedError: EnhancedError, context?: Record<string, unknown>) {
  const logData = {
    ...enhancedError,
    context,
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: enhancedError.timestamp.toISOString()
  };
  
  // Log to console with appropriate level
  switch (enhancedError.severity) {
    case ErrorSeverity.CRITICAL:
      console.error('CRITICAL ERROR:', logData);
      break;
    case ErrorSeverity.HIGH:
      console.error('HIGH SEVERITY ERROR:', logData);
      break;
    case ErrorSeverity.MEDIUM:
      console.warn('MEDIUM SEVERITY ERROR:', logData);
      break;
    default:
      console.log('LOW SEVERITY ERROR:', logData);
  }
  
  // In a real application, you would send this to your error tracking service
  // Example: Sentry.captureException(error, { extra: logData });
}