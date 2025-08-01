// Tests for form processing utilities

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CredentialFormData } from '../../types';
import { 
  processFormSubmission, 
  getFormSubmissionStatusMessage, 
  getFormSubmissionProgress 
} from '../formProcessing';

// Mock the API functions
vi.mock('../api', () => ({
  submitFormData: vi.fn(),
  generateCredentialOfferQR: vi.fn(),
  getErrorMessage: vi.fn((error) => error.message || 'Unknown error'),
  retryWithBackoff: vi.fn((fn) => fn()),
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number, public code?: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

vi.mock('../validation', () => ({
  processFormData: vi.fn(),
  isFormReadyForSubmission: vi.fn(),
}));

describe('Form Processing Utilities', () => {
  const mockFormData: CredentialFormData = {
    firstName: 'John',
    lastName: 'Doe',
    nic: '123456789V',
    country: 'United States',
    email: 'john.doe@example.com',
    walletAddress: '0x1234567890123456789012345678901234567890',
    investorType: 'Individual',
    kycLevel: 'basic',
    amlStatus: true,
  };

  const mockSessionId = 'test-session-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processFormSubmission', () => {
    it('should process form submission successfully', async () => {
      const { processFormData, isFormReadyForSubmission } = await import('../validation');
      const { submitFormData, generateCredentialOfferQR } = await import('../api');

      // Mock successful validation
      vi.mocked(isFormReadyForSubmission).mockReturnValue({ ready: true });
      vi.mocked(processFormData).mockReturnValue({
        sanitizedData: mockFormData,
        validation: { isValid: true, errors: {} },
      });

      // Mock successful API calls
      vi.mocked(submitFormData).mockResolvedValue({
        success: true,
        message: 'Form submitted',
        nextStep: 'qr_generation',
      });

      vi.mocked(generateCredentialOfferQR).mockResolvedValue({
        success: true,
        connectionId: 'conn-123',
        qrCodeData: 'qr-data',
        message: 'QR generated',
      });

      const progressCallback = vi.fn();
      const result = await processFormSubmission(mockFormData, mockSessionId, progressCallback);

      expect(result.success).toBe(true);
      expect(result.step).toBe('complete');
      expect(result.data?.sanitizedFormData).toEqual(mockFormData);
      expect(result.data?.connectionId).toBe('conn-123');
      expect(progressCallback).toHaveBeenCalledTimes(4); // validation, submission, qr_generation, complete
    });

    it('should handle form validation failure', async () => {
      const { isFormReadyForSubmission } = await import('../validation');

      vi.mocked(isFormReadyForSubmission).mockReturnValue({
        ready: false,
        reason: 'Session not initialized',
      });

      const result = await processFormSubmission(mockFormData, mockSessionId);

      expect(result.success).toBe(false);
      expect(result.step).toBe('validation');
      expect(result.error).toBe('Session not initialized');
    });

    it('should handle API submission failure', async () => {
      const { processFormData, isFormReadyForSubmission } = await import('../validation');
      const { submitFormData } = await import('../api');

      vi.mocked(isFormReadyForSubmission).mockReturnValue({ ready: true });
      vi.mocked(processFormData).mockReturnValue({
        sanitizedData: mockFormData,
        validation: { isValid: true, errors: {} },
      });

      vi.mocked(submitFormData).mockRejectedValue(new Error('Network error'));

      const result = await processFormSubmission(mockFormData, mockSessionId);

      expect(result.success).toBe(false);
      expect(result.step).toBe('submission');
      expect(result.error).toBe('Network error');
    });
  });

  describe('getFormSubmissionStatusMessage', () => {
    it('should return correct status messages', () => {
      expect(getFormSubmissionStatusMessage('validation')).toBe('Validating your information...');
      expect(getFormSubmissionStatusMessage('submission')).toBe('Submitting your form data...');
      expect(getFormSubmissionStatusMessage('qr_generation')).toBe('Preparing your credential offer...');
      expect(getFormSubmissionStatusMessage('complete')).toBe('Processing complete!');
    });
  });

  describe('getFormSubmissionProgress', () => {
    it('should return correct progress percentages', () => {
      expect(getFormSubmissionProgress('validation')).toBe(25);
      expect(getFormSubmissionProgress('submission')).toBe(50);
      expect(getFormSubmissionProgress('qr_generation')).toBe(75);
      expect(getFormSubmissionProgress('complete')).toBe(100);
    });
  });
});