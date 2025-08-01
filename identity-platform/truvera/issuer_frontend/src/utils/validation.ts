// Form validation and sanitization utilities

import { CredentialFormData, ValidationErrors } from '../types';

/**
 * Sanitize string input by trimming whitespace and removing potentially harmful characters
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes that could cause issues
    .replace(/[&]/g, '') // Remove ampersands
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 255); // Limit length
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';
  
  return email
    .trim()
    .toLowerCase()
    .substring(0, 254); // RFC 5321 limit
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate Ethereum wallet address format
 */
export function isValidWalletAddress(address: string): boolean {
  if (!address) return false;
  
  const walletRegex = /^0x[a-fA-F0-9]{40}$/;
  return walletRegex.test(address);
}

/**
 * Sanitize form data
 */
export function sanitizeFormData(formData: CredentialFormData): CredentialFormData {
  return {
    firstName: sanitizeString(formData.firstName),
    lastName: sanitizeString(formData.lastName),
    nic: sanitizeString(formData.nic),
    country: sanitizeString(formData.country),
    email: sanitizeEmail(formData.email),
    walletAddress: formData.walletAddress.trim(),
    investorType: formData.investorType,
    kycLevel: formData.kycLevel,
    amlStatus: Boolean(formData.amlStatus),
  };
}

/**
 * Comprehensive form validation
 */
export function validateFormData(formData: CredentialFormData): {
  isValid: boolean;
  errors: ValidationErrors;
} {
  const errors: ValidationErrors = {};

  // Required fields validation
  if (!formData.firstName?.trim()) {
    errors.firstName = 'First name is required';
  } else if (formData.firstName.trim().length < 2) {
    errors.firstName = 'First name must be at least 2 characters';
  } else if (formData.firstName.trim().length > 50) {
    errors.firstName = 'First name must be less than 50 characters';
  }

  if (!formData.lastName?.trim()) {
    errors.lastName = 'Last name is required';
  } else if (formData.lastName.trim().length < 2) {
    errors.lastName = 'Last name must be at least 2 characters';
  } else if (formData.lastName.trim().length > 50) {
    errors.lastName = 'Last name must be less than 50 characters';
  }

  if (!formData.nic?.trim()) {
    errors.nic = 'NIC (National Identity Card) is required';
  } else if (formData.nic.trim().length < 5) {
    errors.nic = 'NIC must be at least 5 characters';
  } else if (formData.nic.trim().length > 20) {
    errors.nic = 'NIC must be less than 20 characters';
  }

  if (!formData.country?.trim()) {
    errors.country = 'Country is required';
  } else if (formData.country.trim().length < 2) {
    errors.country = 'Country must be at least 2 characters';
  } else if (formData.country.trim().length > 100) {
    errors.country = 'Country must be less than 100 characters';
  }

  // Email validation (optional but if provided, must be valid)
  if (formData.email && !isValidEmail(formData.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Wallet address validation
  if (!formData.walletAddress?.trim()) {
    errors.walletAddress = 'Wallet address is required';
  } else if (!isValidWalletAddress(formData.walletAddress)) {
    errors.walletAddress = 'Please enter a valid Ethereum wallet address';
  }

  // Investor type validation
  if (!formData.investorType) {
    errors.investorType = 'Investor type is required';
  } else if (!['Individual', 'Company'].includes(formData.investorType)) {
    errors.investorType = 'Please select a valid investor type';
  }

  // KYC level validation
  if (!formData.kycLevel) {
    errors.kycLevel = 'KYC level is required';
  } else if (!['basic', 'advanced'].includes(formData.kycLevel)) {
    errors.kycLevel = 'Please select a valid KYC level';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Check if form data has changed
 */
export function hasFormDataChanged(
  current: CredentialFormData,
  previous: CredentialFormData
): boolean {
  return (
    current.firstName !== previous.firstName ||
    current.lastName !== previous.lastName ||
    current.nic !== previous.nic ||
    current.country !== previous.country ||
    current.email !== previous.email ||
    current.walletAddress !== previous.walletAddress ||
    current.investorType !== previous.investorType ||
    current.kycLevel !== previous.kycLevel ||
    current.amlStatus !== previous.amlStatus
  );
}

/**
 * Comprehensive form data processing with enhanced sanitization and validation
 */
export function processFormData(formData: CredentialFormData): {
  sanitizedData: CredentialFormData;
  validation: {
    isValid: boolean;
    errors: ValidationErrors;
  };
} {
  // First sanitize the data
  const sanitizedData = sanitizeFormData(formData);
  
  // Then validate the sanitized data
  const validation = validateFormData(sanitizedData);
  
  return {
    sanitizedData,
    validation,
  };
}

/**
 * Check if form is ready for submission
 */
export function isFormReadyForSubmission(
  formData: CredentialFormData,
  sessionId: string | null
): {
  ready: boolean;
  reason?: string;
} {
  if (!sessionId) {
    return {
      ready: false,
      reason: 'Session not initialized',
    };
  }
  
  const validation = validateFormData(formData);
  if (!validation.isValid) {
    return {
      ready: false,
      reason: 'Form validation failed',
    };
  }
  
  if (!formData.walletAddress) {
    return {
      ready: false,
      reason: 'Wallet address not set',
    };
  }
  
  return {
    ready: true,
  };
}