// API utilities for form submission and error handling

import { CredentialFormData, ApiResponse } from '../types';
import { apiConfig } from '../config/api';

/**
 * API error class for better error handling
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API configuration for timeouts and retries
 */
const API_CONFIG = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second base delay
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * Create a fetch request with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = API_CONFIG.timeout
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timeout', 408, 'TIMEOUT_ERROR');
    }
    throw error;
  }
}

/**
 * Handle API response and throw errors if needed
 */
async function handleApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new ApiError(
      'Invalid response format',
      response.status,
      'INVALID_RESPONSE_FORMAT'
    );
  }
  
  if (!response.ok) {
    // Handle rate limiting more gracefully
    if (response.status === 429) {
      throw new ApiError(
        data.error?.message || 'Rate limit exceeded. Please wait before making another request.',
        response.status,
        'RATE_LIMIT_EXCEEDED',
        data.error?.details
      );
    }
    
    throw new ApiError(
      data.error?.message || `HTTP ${response.status}`,
      response.status,
      data.error?.code,
      data.error?.details
    );
  }
  
  return data;
}



/**
 * Make API call with proper error handling, timeout, and retry logic
 */
async function makeApiCall<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  return retryWithBackoff(async () => {
    const response = await fetchWithTimeout(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    return handleApiResponse<T>(response);
  });
}

/**
 * Submit form data to the backend
 */
export async function submitFormData(
  sessionId: string,
  formData: CredentialFormData
): Promise<{
  success: boolean;
  message: string;
  nextStep: string;
  formSummary?: {
    firstName: string;
    lastName: string;
    nic: string;
    country: string;
    investorType: string;
    kycLevel: string;
  };
}> {
  const result = await makeApiCall<{
    message: string;
    nextStep: string;
    sessionId: string;
    formSummary?: {
      firstName: string;
      lastName: string;
      nic: string;
      country: string;
      investorType: string;
      kycLevel: string;
    };
  }>(apiConfig.endpoints.credentials.form, {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      formData,
    }),
  });

  return {
    success: true,
    message: result.data?.message || 'Form submitted successfully',
    nextStep: result.data?.nextStep || 'qr_generation',
    formSummary: result.data?.formSummary,
  };
}

/**
 * Validate form data with backend
 */
export async function validateFormDataWithBackend(
  formData: CredentialFormData,
  fieldName?: string
): Promise<{
  isValid: boolean;
  errors: Record<string, string>;
  errorCount?: number;
  validFields?: string[];
  invalidFields?: string[];
  field?: string;
  error?: string | null;
}> {
  try {
    const result = await makeApiCall<{
      isValid: boolean;
      errors: Record<string, string>;
      errorCount?: number;
      validFields?: string[];
      invalidFields?: string[];
      field?: string;
      error?: string | null;
    }>(apiConfig.endpoints.credentials.validate, {
      method: 'POST',
      body: JSON.stringify({
        formData,
        fieldName,
      }),
    });

    return {
      isValid: result.data?.isValid || false,
      errors: result.data?.errors || {},
      errorCount: result.data?.errorCount,
      validFields: result.data?.validFields,
      invalidFields: result.data?.invalidFields,
      field: result.data?.field,
      error: result.data?.error,
    };
  } catch (error) {
    console.warn('Backend validation failed, using fallback:', error);
    
    // Fallback to client-side validation if backend is unavailable
    return {
      isValid: false,
      errors: { general: 'Unable to validate form data' },
    };
  }
}

/**
 * Issue credential directly after form submission
 */
export async function issueCredential(
  sessionId: string,
  formData: CredentialFormData
): Promise<{
  success: boolean;
  credentialId?: string;
  status: 'issued' | 'pending' | 'failed';
  message: string;
}> {
  const result = await makeApiCall<{
    credentialId: string;
    status: 'issued' | 'pending' | 'failed';
    message: string;
  }>(apiConfig.endpoints.credentials.issue, {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      formData,
    }),
  });

  return {
    success: true,
    credentialId: result.data?.credentialId,
    status: result.data?.status || 'pending',
    message: result.data?.message || 'Credential issuance initiated',
  };
}

/**
 * Generate QR code for credential offer
 */
export async function generateCredentialOfferQR(
  sessionId: string
): Promise<{
  success: boolean;
  connectionId?: string;
  credentialOfferUrl?: string;
  qrCodeData?: string;
  qrCodeImage?: string;
  message: string;
  nextStep?: string;
  generatedAt?: string;
}> {
  const result = await makeApiCall<{
    sessionId: string;
    connectionId: string;
    credentialOfferUrl: string;
    qrCodeData: string;
    qrCodeImage: string;
    message: string;
    nextStep: string;
    generatedAt: string;
  }>(apiConfig.endpoints.credentials.qrGenerate, {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
    }),
  });

  return {
    success: true,
    connectionId: result.data?.connectionId,
    credentialOfferUrl: result.data?.credentialOfferUrl,
    qrCodeData: result.data?.qrCodeData,
    qrCodeImage: result.data?.qrCodeImage,
    message: result.data?.message || 'QR code generated successfully',
    nextStep: result.data?.nextStep,
    generatedAt: result.data?.generatedAt,
  };
}

/**
 * Create credential offer with complete workflow (form submission + QR generation)
 */
export async function createCredentialOffer(
  sessionId: string,
  formData: CredentialFormData
): Promise<{
  success: boolean;
  connectionId?: string;
  credentialOfferUrl?: string;
  qrCodeData?: string;
  qrCodeImage?: string;
  message: string;
  nextStep?: string;
}> {
  const result = await makeApiCall<{
    connectionId: string;
    credentialOfferUrl: string;
    qrCodeData: string;
    qrCodeImage: string;
    message: string;
    nextStep: string;
  }>(apiConfig.endpoints.credentials.createOffer, {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      formData,
    }),
  });

  return {
    success: true,
    connectionId: result.data?.connectionId,
    credentialOfferUrl: result.data?.credentialOfferUrl,
    qrCodeData: result.data?.qrCodeData,
    qrCodeImage: result.data?.qrCodeImage,
    message: result.data?.message || 'Credential offer created successfully',
    nextStep: result.data?.nextStep,
  };
}

/**
 * Get credential status with request deduplication and rate limiting
 */
export async function getCredentialStatus(
  sessionId: string
): Promise<{
  success: boolean;
  sessionId?: string;
  status?: 'issued' | 'pending' | 'failed';
  deliveryStatus?: 'sent' | 'delivered' | 'failed';
  message: string;
  currentStep?: string;
  credentialId?: string;
  issuerId?: string;
  lastUpdated?: string;
  holderDID?: string;
}> {
  // Import request tracker dynamically to avoid circular dependencies
  const { requestTracker } = await import('./requestTracker');
  
  const requestKey = `credential-status-${sessionId}`;
  
  // Use request tracker for deduplication but not rate limiting (handled by component)
  const result = await requestTracker.getOrCreateRequest(requestKey, async () => {
    return await makeApiCall<{
      sessionId: string;
      status: 'issued' | 'pending' | 'failed';
      deliveryStatus: 'sent' | 'delivered' | 'failed';
      message: string;
      currentStep: string;
      credentialId: string;
      issuerId: string;
      lastUpdated: string;
      holderDID: string;
    }>(apiConfig.endpoints.credentials.status(sessionId), {
      method: 'GET',
    });
  });

  return {
    success: true,
    sessionId: result.data?.sessionId,
    status: result.data?.status,
    deliveryStatus: result.data?.deliveryStatus,
    message: result.data?.message || 'Status retrieved successfully',
    currentStep: result.data?.currentStep,
    credentialId: result.data?.credentialId,
    issuerId: result.data?.issuerId,
    lastUpdated: result.data?.lastUpdated,
    holderDID: result.data?.holderDID,
  };
}

/**
 * Get operation summary
 */
export async function getOperationSummary(
  sessionId: string
): Promise<{
  success: boolean;
  summary?: {
    sessionId: string;
    currentStep: string;
    createdAt: string;
    expiresAt: string;
    walletAddress?: string;
    connectionId?: string;
    holderDID?: string;
    issuerId?: string;
    credentialId?: string;
    formData?: {
      firstName: string;
      lastName: string;
      nic: string;
      country: string;
      investorType: string;
      kycLevel: string;
      hasEmail: boolean;
      hasWalletAddress: boolean;
      amlStatus: boolean;
    };
    credentialStatus?: {
      status: 'issued' | 'pending' | 'failed';
      deliveryStatus: 'sent' | 'delivered' | 'failed';
      message: string;
    };
    progress: {
      walletConnected: boolean;
      formSubmitted: boolean;
      qrGenerated: boolean;
      walletPaired: boolean;
      credentialIssued: boolean;
      completed: boolean;
    };
  };
  message: string;
}> {
  const result = await makeApiCall<{
    sessionId: string;
    currentStep: string;
    createdAt: string;
    expiresAt: string;
    walletAddress?: string;
    connectionId?: string;
    holderDID?: string;
    issuerId?: string;
    credentialId?: string;
    formData?: {
      firstName: string;
      lastName: string;
      nic: string;
      country: string;
      investorType: string;
      kycLevel: string;
      hasEmail: boolean;
      hasWalletAddress: boolean;
      amlStatus: boolean;
    };
    credentialStatus?: {
      status: 'issued' | 'pending' | 'failed';
      deliveryStatus: 'sent' | 'delivered' | 'failed';
      message: string;
    };
    progress: {
      walletConnected: boolean;
      formSubmitted: boolean;
      qrGenerated: boolean;
      walletPaired: boolean;
      credentialIssued: boolean;
      completed: boolean;
    };
  }>(apiConfig.endpoints.credentials.summary(sessionId), {
    method: 'GET',
  });

  return {
    success: true,
    summary: result.data,
    message: 'Operation summary retrieved successfully',
  };
}

/**
 * Get process statistics (for admin/monitoring)
 */
export async function getProcessStatistics(): Promise<{
  success: boolean;
  stats?: {
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    failedSessions: number;
    averageCompletionTime: number;
    successRate: number;
  };
  message: string;
}> {
  const result = await makeApiCall<{
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    failedSessions: number;
    averageCompletionTime: number;
    successRate: number;
  }>(`${apiConfig.baseUrl}/api/credentials/admin/stats`, {
    method: 'GET',
  });

  return {
    success: true,
    stats: result.data,
    message: 'Process statistics retrieved successfully',
  };
}

/**
 * Create session
 */
export async function createSession(): Promise<{
  success: boolean;
  sessionId?: string;
  currentStep?: string;
  message: string;
}> {
  const result = await makeApiCall<{
    sessionId: string;
    currentStep: string;
  }>(apiConfig.endpoints.session.create, {
    method: 'POST',
  });

  return {
    success: true,
    sessionId: result.data?.sessionId,
    currentStep: result.data?.currentStep,
    message: 'Session created successfully',
  };
}

/**
 * Connect wallet
 */
export async function connectWallet(
  sessionId: string,
  walletAddress: string
): Promise<{
  success: boolean;
  currentStep?: string;
  message: string;
}> {
  const result = await makeApiCall<{
    currentStep: string;
  }>(apiConfig.endpoints.wallet.connect, {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      walletAddress,
    }),
  });

  return {
    success: true,
    currentStep: result.data?.currentStep,
    message: 'Wallet connected successfully',
  };
}

/**
 * Retry function with exponential backoff (exported for backward compatibility)
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = API_CONFIG.retryAttempts,
  baseDelay: number = API_CONFIG.retryDelay
): Promise<T> {
  let lastError: Error = new Error('No attempts made');
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Don't retry on client errors (4xx), only server errors (5xx) and network errors
      // Special handling for rate limiting - use longer delay
      if (error instanceof ApiError) {
        if (error.status === 429) {
          // For rate limiting, wait longer before retrying
          const rateLimitDelay = Math.max(5000, baseDelay * Math.pow(2, attempt));
          await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
          continue;
        }
        
        if (!API_CONFIG.retryableStatusCodes.includes(error.status)) {
          break;
        }
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Get user-friendly error message from API error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'MISSING_SESSION_ID':
        return 'Session expired. Please refresh the page and try again.';
      case 'INVALID_FORM_DATA':
        return 'Please check your form data and try again.';
      case 'FORM_STORAGE_FAILED':
        return 'Failed to save your information. Please try again.';
      case 'CREDENTIAL_ISSUANCE_FAILED':
        return 'Failed to issue credential. Please try again or contact support.';
      case 'CREDENTIAL_OFFER_GENERATION_FAILED':
        return 'Failed to generate credential offer. Please try again.';
      case 'VALIDATION_ERROR':
        return 'Form validation failed. Please check your inputs.';
      case 'NETWORK_ERROR':
        return 'Network connection error. Please check your internet connection and try again.';
      case 'RATE_LIMIT_EXCEEDED':
        return 'Too many requests. Please wait a moment before trying again.';
      case 'TRUVERA_API_ERROR':
        return 'Service temporarily unavailable. Please try again in a few moments.';
      case 'SESSION_EXPIRED':
        return 'Your session has expired. Please refresh the page and start over.';
      case 'WALLET_NOT_CONNECTED':
        return 'Wallet connection lost. Please reconnect your wallet and try again.';
      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

