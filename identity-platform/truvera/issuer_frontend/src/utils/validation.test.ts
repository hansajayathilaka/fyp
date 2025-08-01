import { describe, it, expect } from 'vitest';
import { 
  sanitizeString, 
  sanitizeEmail, 
  isValidEmail, 
  isValidWalletAddress, 
  validateFormData,
  sanitizeFormData 
} from './validation';
import { CredentialFormData } from '../types';

describe('Validation Utilities', () => {
  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello world  ')).toBe('hello world');
    });

    it('should remove HTML tags', () => {
      expect(sanitizeString('hello<script>alert("xss")</script>world')).toBe('helloscriptalert(xss)/scriptworld');
    });

    it('should remove quotes', () => {
      expect(sanitizeString('hello "world" test')).toBe('hello world test');
    });

    it('should limit length to 255 characters', () => {
      const longString = 'a'.repeat(300);
      expect(sanitizeString(longString)).toHaveLength(255);
    });
  });

  describe('sanitizeEmail', () => {
    it('should trim and lowercase email', () => {
      expect(sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
    });

    it('should limit length to 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(sanitizeEmail(longEmail)).toHaveLength(254);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidWalletAddress', () => {
    it('should validate correct Ethereum addresses', () => {
      expect(isValidWalletAddress('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')).toBe(true);
      expect(isValidWalletAddress('0x0000000000000000000000000000000000000000')).toBe(true);
    });

    it('should reject invalid wallet addresses', () => {
      expect(isValidWalletAddress('742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')).toBe(false); // Missing 0x
      expect(isValidWalletAddress('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b')).toBe(false); // Too short
      expect(isValidWalletAddress('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6G')).toBe(false); // Invalid character
      expect(isValidWalletAddress('')).toBe(false);
    });
  });

  describe('validateFormData', () => {
    const validFormData: CredentialFormData = {
      firstName: 'John',
      lastName: 'Doe',
      nic: '123456789V',
      country: 'United States',
      email: 'john.doe@example.com',
      walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      investorType: 'Individual',
      kycLevel: 'basic',
      amlStatus: true,
    };

    it('should validate correct form data', () => {
      const result = validateFormData(validFormData);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should require firstName', () => {
      const invalidData = { ...validFormData, firstName: '' };
      const result = validateFormData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.firstName).toBe('First name is required');
    });

    it('should require lastName', () => {
      const invalidData = { ...validFormData, lastName: '' };
      const result = validateFormData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.lastName).toBe('Last name is required');
    });

    it('should require country', () => {
      const invalidData = { ...validFormData, country: '' };
      const result = validateFormData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.country).toBe('Country is required');
    });

    it('should validate email format when provided', () => {
      const invalidData = { ...validFormData, email: 'invalid-email' };
      const result = validateFormData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Please enter a valid email address');
    });

    it('should require valid wallet address', () => {
      const invalidData = { ...validFormData, walletAddress: 'invalid-address' };
      const result = validateFormData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.walletAddress).toBe('Please enter a valid Ethereum wallet address');
    });

    it('should validate investorType', () => {
      const invalidData = { ...validFormData, investorType: 'InvalidType' as any };
      const result = validateFormData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.investorType).toBe('Please select a valid investor type');
    });

    it('should validate kycLevel', () => {
      const invalidData = { ...validFormData, kycLevel: 'invalid' as any };
      const result = validateFormData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.kycLevel).toBe('Please select a valid KYC level');
    });
  });

  describe('sanitizeFormData', () => {
    it('should sanitize all string fields', () => {
      const dirtyData: CredentialFormData = {
        firstName: '  John<script>  ',
        lastName: '  Doe"test  ',
        nic: '  123456789V  ',
        country: '  United States  ',
        email: '  JOHN.DOE@EXAMPLE.COM  ',
        walletAddress: '  0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6  ',
        investorType: 'Individual',
        kycLevel: 'basic',
        amlStatus: true,
      };

      const sanitized = sanitizeFormData(dirtyData);

      expect(sanitized.firstName).toBe('Johnscript');
      expect(sanitized.lastName).toBe('Doetest');
      expect(sanitized.country).toBe('United States');
      expect(sanitized.email).toBe('john.doe@example.com');
      expect(sanitized.walletAddress).toBe('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
    });
  });
});