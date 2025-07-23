import { expect } from 'chai';
import { 
  parseAmount, 
  formatAmount, 
  safeFormatAmount, 
  safeParseAmount, 
  validateAmountInput,
  formatAmountForDisplay
} from '../src/utils/decimal-utils';

describe('Decimal Utils Error Handling', () => {
  describe('parseAmount error handling', () => {
    it('should throw error for empty input', () => {
      expect(() => parseAmount('')).to.throw('Input cannot be empty');
    });
    
    it('should throw error for invalid input', () => {
      expect(() => parseAmount('abc')).to.throw('Failed to parse amount');
    });
  });
  
  describe('safeParseAmount error handling', () => {
    it('should throw error for empty input', () => {
      expect(() => safeParseAmount('')).to.throw('Input cannot be empty');
    });
    
    it('should throw error for invalid format', () => {
      expect(() => safeParseAmount('abc')).to.throw('Invalid number format');
    });
    
    it('should return default value when provided', () => {
      const defaultValue = BigInt(0);
      const result = safeParseAmount('invalid', defaultValue);
      expect(result).to.equal(defaultValue);
    });
  });
  
  describe('safeFormatAmount error handling', () => {
    it('should return fallback for invalid amounts', () => {
      // For testing purposes, we'll create a mock object that will throw when toString is called
      // This simulates a failure in the formatAmount function
      const badAmount = {
        toString: () => { throw new Error('Mock error'); }
      } as unknown as bigint;
      
      // Test with default fallback (should use amount.toString())
      const amount = BigInt('123');
      const result = safeFormatAmount(amount);
      // The actual value depends on the network decimals, but it should be a string
      expect(typeof result).to.equal('string');
      
      // Test with custom fallback
      const customFallback = 'N/A';
      const resultWithFallback = safeFormatAmount(amount, customFallback);
      expect(resultWithFallback).to.not.equal(customFallback); // Should not use fallback for valid amount
      
      // Test with throwing object and custom fallback
      try {
        const badResult = safeFormatAmount(badAmount, customFallback);
        // If we get here, the function caught the error and used the fallback
        expect(badResult).to.equal(customFallback);
      } catch (error) {
        // If we get here, the function didn't handle the error properly
        expect.fail('safeFormatAmount should not throw with a fallback value');
      }
    });
  });
  
  describe('validateAmountInput', () => {
    it('should validate correct input', () => {
      const result = validateAmountInput('123.45');
      expect(result.isValid).to.be.true;
      expect(result.errorMessage).to.be.undefined;
    });
    
    it('should reject empty input', () => {
      const result = validateAmountInput('');
      expect(result.isValid).to.be.false;
      expect(result.errorMessage).to.equal('Input cannot be empty');
    });
    
    it('should reject invalid number format', () => {
      const result = validateAmountInput('abc');
      expect(result.isValid).to.be.false;
      expect(result.errorMessage).to.equal('Invalid number format');
    });
    
    it('should reject negative numbers', () => {
      const result = validateAmountInput('-123');
      expect(result.isValid).to.be.false;
      expect(result.errorMessage).to.include('Invalid number format');
    });
  });
  
  describe('formatAmountForDisplay error handling', () => {
    it('should use fallback value when formatting fails', () => {
      // For testing purposes, we'll create a mock object that will throw when used
      const badAmount = {
        toString: () => { throw new Error('Mock error'); }
      } as unknown as bigint;
      
      // Test with valid amount
      const amount = BigInt('123');
      const result = formatAmountForDisplay(amount);
      expect(typeof result).to.equal('string');
      
      // Test with fallback for bad amount
      const fallback = 'Error';
      try {
        const badResult = formatAmountForDisplay(badAmount, 2, fallback);
        // If we get here, the function caught the error and used the fallback
        expect(badResult).to.equal(fallback);
      } catch (error) {
        // If we get here, the function didn't handle the error properly
        expect.fail('formatAmountForDisplay should not throw with a fallback value');
      }
    });
  });
});