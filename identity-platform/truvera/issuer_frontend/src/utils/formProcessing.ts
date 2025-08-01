// Form processing utilities for credential issuance

import { CredentialFormData } from '../types';
import { 
  processFormData, 
  isFormReadyForSubmission,
  submitFormData,
  generateCredentialOfferQR,
  getErrorMessage,
  retryWithBackoff,
} from './index';

export interface FormSubmissionResult {
  success: boolean;
  step: 'validation' | 'submission' | 'qr_generation' | 'complete';
  message: string;
  error?: string;
  data?: {
    sanitizedFormData?: CredentialFormData;
    connectionId?: string;
    qrCodeData?: string;
  };
}

/**
 * Process complete form submission workflow
 */
export async function processFormSubmission(
  formData: CredentialFormData,
  sessionId: string,
  onProgress?: (result: FormSubmissionResult) => void
): Promise<FormSubmissionResult> {
  try {
    // Step 1: Validate form readiness
    const readinessCheck = isFormReadyForSubmission(formData, sessionId);
    if (!readinessCheck.ready) {
      const result: FormSubmissionResult = {
        success: false,
        step: 'validation',
        message: 'Form validation failed',
        error: readinessCheck.reason,
      };
      onProgress?.(result);
      return result;
    }

    // Step 2: Process and validate form data
    const validationResult = processFormData(formData);
    if (!validationResult.validation.isValid) {
      const result: FormSubmissionResult = {
        success: false,
        step: 'validation',
        message: 'Form data validation failed',
        error: 'Please check your form inputs',
      };
      onProgress?.(result);
      return result;
    }

    const sanitizedData = validationResult.sanitizedData;
    
    onProgress?.({
      success: true,
      step: 'validation',
      message: 'Form data validated successfully',
      data: { sanitizedFormData: sanitizedData },
    });

    // Step 3: Submit form data
    await retryWithBackoff(
      () => submitFormData(sessionId, sanitizedData),
      3,
      1000
    );

    onProgress?.({
      success: true,
      step: 'submission',
      message: 'Form data submitted successfully',
      data: { sanitizedFormData: sanitizedData },
    });

    // Step 4: Generate credential offer QR code
    const qrResult = await retryWithBackoff(
      () => generateCredentialOfferQR(sessionId),
      2,
      1500
    );

    onProgress?.({
      success: true,
      step: 'qr_generation',
      message: 'Credential offer QR code generated',
      data: { 
        sanitizedFormData: sanitizedData,
        connectionId: qrResult.connectionId,
        qrCodeData: qrResult.qrCodeData,
      },
    });

    // Step 5: Complete
    const finalResult: FormSubmissionResult = {
      success: true,
      step: 'complete',
      message: 'Form processing completed successfully',
      data: {
        sanitizedFormData: sanitizedData,
        connectionId: qrResult.connectionId,
        qrCodeData: qrResult.qrCodeData,
      },
    };

    onProgress?.(finalResult);
    return finalResult;

  } catch (error) {
    console.error('Form submission failed:', error);
    
    const errorMessage = getErrorMessage(error);
    const result: FormSubmissionResult = {
      success: false,
      step: 'submission',
      message: 'Form submission failed',
      error: errorMessage,
    };

    onProgress?.(result);
    return result;
  }
}

/**
 * Get user-friendly status message for form submission step
 */
export function getFormSubmissionStatusMessage(step: FormSubmissionResult['step']): string {
  switch (step) {
    case 'validation':
      return 'Validating your information...';
    case 'submission':
      return 'Submitting your form data...';
    case 'qr_generation':
      return 'Preparing your credential offer...';
    case 'complete':
      return 'Processing complete!';
    default:
      return 'Processing your request...';
  }
}

/**
 * Get progress percentage for form submission
 */
export function getFormSubmissionProgress(step: FormSubmissionResult['step']): number {
  switch (step) {
    case 'validation':
      return 25;
    case 'submission':
      return 50;
    case 'qr_generation':
      return 75;
    case 'complete':
      return 100;
    default:
      return 0;
  }
}