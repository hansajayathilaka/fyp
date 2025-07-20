/**
 * Comprehensive unit tests for TokenFormatter utility class
 * Testing edge cases including very small/large numbers and zero values
 */

import { expect } from 'chai';
import { TokenFormatter, FormattingError, ParseError } from '../src/config/token-formatter';
import { DecimalConfig } from '../src/config/decimal-config';

describe('TokenFormatter', () => {
  let formatter: TokenFormatter;
  let decimalConfig: DecimalConfig;

  beforeEach(() => {
    // Create fresh instances for each test to avoid state pollution
    formatter = TokenFormatter.createWithFreshConfig();
    decimalConfig = DecimalConfig.createWithFreshConfig();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = TokenFormatter.getInstance();
      const instance2 = TokenFormatter.getInstance();
      expect(instance1).to.equal(instance2);
    });

    it('should create fresh instance with createWithFreshConfig', () => {
      const instance1 = TokenFormatter.getInstance();
      const instance2 = TokenFormatter.createWithFreshConfig();
      expect(instance1).to.not.equal(instance2);
    });
  });

  describe('formatTokenAmount', () => {
    it('should format basic token amounts correctly', () => {
      const amount = BigInt('1500000000000000000'); // 1.5 ETH in wei
      const result = formatter.formatTokenAmount(amount, 18, 'ETH');
      expect(result).to.equal('1.5 ETH');
    });

    it('should format amounts with trailing zeros correctly', () => {
      const amount = BigInt('1000000000000000000'); // 1.0 ETH in wei
      const result = formatter.formatTokenAmount(amount, 18, 'ETH');
      expect(result).to.equal('1 ETH');
    });

    it('should format zero amounts correctly', () => {
      const amount = BigInt('0');
      const result = formatter.formatTokenAmount(amount, 18, 'ETH');
      expect(result).to.equal('0 ETH');
    });

    it('should format very small amounts correctly', () => {
      const amount = BigInt('1'); // 1 wei
      const result = formatter.formatTokenAmount(amount, 18, 'ETH');
      expect(result).to.equal('0.000000000000000001 ETH');
    });

    it('should format very large amounts correctly', () => {
      const amount = BigInt('1000000000000000000000000'); // 1M ETH in wei
      const result = formatter.formatTokenAmount(amount, 18, 'ETH');
      expect(result).to.equal('1000000 ETH');
    });

    it('should format Hedera amounts correctly', () => {
      const amount = BigInt('150000000'); // 1.5 HBAR in tinybars
      const result = formatter.formatTokenAmount(amount, 8, 'HBAR');
      expect(result).to.equal('1.5 HBAR');
    });

    it('should handle formatting options - no unit', () => {
      const amount = BigInt('1500000000000000000'); // 1.5 ETH
      const result = formatter.formatTokenAmount(amount, 18, 'ETH', { showUnit: false });
      expect(result).to.equal('1.5');
    });

    it('should handle formatting options - max decimals', () => {
      const amount = BigInt('1234567890123456789'); // 1.234567890123456789 ETH
      const result = formatter.formatTokenAmount(amount, 18, 'ETH', { maxDecimals: 2 });
      expect(result).to.equal('1.23 ETH');
    });

    it('should handle formatting options - min decimals', () => {
      const amount = BigInt('1500000000000000000'); // 1.5 ETH
      const result = formatter.formatTokenAmount(amount, 18, 'ETH', { minDecimals: 4 });
      expect(result).to.equal('1.5000 ETH');
    });

    it('should handle formatting options - compact notation', () => {
      const amount = BigInt('1500000000000000000000000'); // 1.5M ETH
      const result = formatter.formatTokenAmount(amount, 18, 'ETH', { compact: true });
      expect(result).to.equal('1.50M ETH');
    });

    it('should handle formatting options - scientific notation', () => {
      const amount = BigInt('1'); // 1 wei
      const result = formatter.formatTokenAmount(amount, 18, 'ETH', { scientific: true });
      expect(result).to.include('e-'); // Should use scientific notation for very small numbers
    });

    it('should throw error for negative amounts', () => {
      expect(() => {
        formatter.formatTokenAmount(BigInt('-1'), 18, 'ETH');
      }).to.throw(FormattingError, 'Amount cannot be negative');
    });

    it('should throw error for invalid decimal precision', () => {
      expect(() => {
        formatter.formatTokenAmount(BigInt('1000'), 25, 'ETH'); // > 18 decimals
      }).to.throw(FormattingError, 'Invalid decimal precision');
    });
  });

  describe('formatNativeToken', () => {
    it('should format native token using current network config', () => {
      // Default network should be hardhat (18 decimals, ETH)
      const amount = BigInt('1500000000000000000'); // 1.5 ETH
      const result = formatter.formatNativeToken(amount);
      expect(result).to.equal('1.5 ETH');
    });

    it('should format native token with options', () => {
      const amount = BigInt('1500000000000000000'); // 1.5 ETH
      const result = formatter.formatNativeToken(amount, { maxDecimals: 2, showUnit: false });
      expect(result).to.equal('1.5');
    });
  });

  describe('parseUserInput', () => {
    it('should parse basic decimal input correctly', () => {
      const result = formatter.parseUserInput('1.5', 18);
      expect(result).to.equal(BigInt('1500000000000000000'));
    });

    it('should parse integer input correctly', () => {
      const result = formatter.parseUserInput('5', 18);
      expect(result).to.equal(BigInt('5000000000000000000'));
    });

    it('should parse zero input correctly', () => {
      const result = formatter.parseUserInput('0', 18);
      expect(result).to.equal(BigInt('0'));
    });

    it('should parse decimal zero input correctly', () => {
      const result = formatter.parseUserInput('0.0', 18);
      expect(result).to.equal(BigInt('0'));
    });

    it('should parse very small input correctly', () => {
      const result = formatter.parseUserInput('0.000000000000000001', 18);
      expect(result).to.equal(BigInt('1'));
    });

    it('should parse input with leading zeros correctly', () => {
      const result = formatter.parseUserInput('01.50', 18);
      expect(result).to.equal(BigInt('1500000000000000000'));
    });

    it('should parse input with thousands separators', () => {
      const result = formatter.parseUserInput('1,500.5', 18);
      expect(result).to.equal(BigInt('1500500000000000000000'));
    });

    it('should parse input with whitespace', () => {
      const result = formatter.parseUserInput(' 1.5 ', 18);
      expect(result).to.equal(BigInt('1500000000000000000'));
    });

    it('should handle different decimal precisions', () => {
      const result = formatter.parseUserInput('1.5', 8); // Hedera decimals
      expect(result).to.equal(BigInt('150000000'));
    });

    it('should throw error for invalid input format', () => {
      expect(() => {
        formatter.parseUserInput('abc', 18);
      }).to.throw(ParseError, 'Invalid number format');
    });

    it('should throw error for negative input', () => {
      expect(() => {
        formatter.parseUserInput('-1.5', 18);
      }).to.throw(ParseError, 'Invalid number format');
    });

    it('should throw error for too many decimal places', () => {
      expect(() => {
        formatter.parseUserInput('1.123456789012345678901', 18); // 21 decimal places
      }).to.throw(ParseError, 'Too many decimal places');
    });

    it('should throw error for invalid decimal precision', () => {
      expect(() => {
        formatter.parseUserInput('1.5', 25); // > 18 decimals
      }).to.throw(ParseError, 'Invalid decimal precision');
    });

    it('should throw error for non-string input', () => {
      expect(() => {
        formatter.parseUserInput(123 as any, 18);
      }).to.throw(ParseError, 'Input must be a string');
    });

    it('should throw error for empty input', () => {
      expect(() => {
        formatter.parseUserInput('', 18);
      }).to.throw(ParseError, 'Invalid number format');
    });

    it('should throw error for just decimal point', () => {
      expect(() => {
        formatter.parseUserInput('.', 18);
      }).to.throw(ParseError, 'Invalid number format');
    });
  });

  describe('parseNativeTokenInput', () => {
    it('should parse native token input using current network config', () => {
      const result = formatter.parseNativeTokenInput('1.5');
      expect(result).to.equal(BigInt('1500000000000000000')); // ETH format
    });
  });

  describe('toDisplayString', () => {
    it('should convert basic amounts to display string', () => {
      const amount = BigInt('1500000000000000000'); // 1.5 ETH
      const result = formatter.toDisplayString(amount, 18);
      expect(result).to.equal('1.5');
    });

    it('should convert zero to display string', () => {
      const amount = BigInt('0');
      const result = formatter.toDisplayString(amount, 18);
      expect(result).to.equal('0');
    });

    it('should convert integer amounts to display string', () => {
      const amount = BigInt('5000000000000000000'); // 5 ETH
      const result = formatter.toDisplayString(amount, 18);
      expect(result).to.equal('5');
    });

    it('should convert very small amounts to display string', () => {
      const amount = BigInt('1'); // 1 wei
      const result = formatter.toDisplayString(amount, 18);
      expect(result).to.equal('0.000000000000000001');
    });

    it('should handle zero decimals', () => {
      const amount = BigInt('123');
      const result = formatter.toDisplayString(amount, 0);
      expect(result).to.equal('123');
    });

    it('should remove trailing zeros', () => {
      const amount = BigInt('1500000000000000000'); // 1.5 with trailing zeros
      const result = formatter.toDisplayString(amount, 18);
      expect(result).to.equal('1.5');
    });

    it('should throw error for negative amounts', () => {
      expect(() => {
        formatter.toDisplayString(BigInt('-1'), 18);
      }).to.throw(FormattingError, 'Amount cannot be negative');
    });

    it('should throw error for invalid decimal precision', () => {
      expect(() => {
        formatter.toDisplayString(BigInt('1000'), 25);
      }).to.throw(FormattingError, 'Invalid decimal precision');
    });
  });

  describe('fromDisplayString', () => {
    it('should convert basic display string to amount', () => {
      const result = formatter.fromDisplayString('1.5', 18);
      expect(result).to.equal(BigInt('1500000000000000000'));
    });

    it('should convert zero display string to amount', () => {
      const result = formatter.fromDisplayString('0', 18);
      expect(result).to.equal(BigInt('0'));
    });

    it('should convert integer display string to amount', () => {
      const result = formatter.fromDisplayString('5', 18);
      expect(result).to.equal(BigInt('5000000000000000000'));
    });

    it('should handle zero decimals', () => {
      const result = formatter.fromDisplayString('123', 0);
      expect(result).to.equal(BigInt('123'));
    });

    it('should handle partial decimal places', () => {
      const result = formatter.fromDisplayString('1.5', 8); // Hedera format
      expect(result).to.equal(BigInt('150000000'));
    });

    it('should throw error for too many decimal places', () => {
      expect(() => {
        formatter.fromDisplayString('1.123456789012345678901', 18);
      }).to.throw(ParseError, 'Too many decimal places');
    });

    it('should throw error for invalid number format', () => {
      expect(() => {
        formatter.fromDisplayString('abc', 18);
      }).to.throw(ParseError, 'Invalid number format');
    });
  });

  describe('Cross-network conversions', () => {
    it('should convert to native decimals correctly', () => {
      // Convert from 8 decimals to current network (18 decimals)
      const amount = BigInt('150000000'); // 1.5 in 8 decimals
      const result = formatter.convertToNativeDecimals(amount, 8);
      expect(result).to.equal(BigInt('1500000000000000000')); // 1.5 in 18 decimals
    });

    it('should convert from native decimals correctly', () => {
      // Convert from current network (18 decimals) to 8 decimals
      const amount = BigInt('1500000000000000000'); // 1.5 in 18 decimals
      const result = formatter.convertFromNativeDecimals(amount, 8);
      expect(result).to.equal(BigInt('150000000')); // 1.5 in 8 decimals
    });
  });

  describe('Smart formatting', () => {
    it('should provide appropriate formatting recommendations for large amounts', () => {
      const amount = BigInt('1500000000000000000000000'); // 1.5M ETH
      const recommendations = formatter.getFormattingRecommendations(amount, 18);
      expect(recommendations.compact).to.be.true;
      expect(recommendations.maxDecimals).to.equal(2);
    });

    it('should provide appropriate formatting recommendations for small amounts', () => {
      const amount = BigInt('1500000000000000'); // 0.0015 ETH
      const recommendations = formatter.getFormattingRecommendations(amount, 18);
      expect(recommendations.maxDecimals).to.equal(6);
      expect(recommendations.minDecimals).to.equal(2);
    });

    it('should provide appropriate formatting recommendations for very small amounts', () => {
      const amount = BigInt('1500000000000'); // 0.0000015 ETH
      const recommendations = formatter.getFormattingRecommendations(amount, 18);
      expect(recommendations.scientific).to.be.true;
    });

    it('should format token amount smartly', () => {
      const amount = BigInt('1500000000000000000000000'); // 1.5M ETH
      const result = formatter.formatTokenAmountSmart(amount, 18, 'ETH');
      expect(result).to.include('M'); // Should use compact notation
    });

    it('should format native token smartly', () => {
      const amount = BigInt('1500000000000000000000000'); // 1.5M ETH
      const result = formatter.formatNativeTokenSmart(amount);
      expect(result).to.include('M'); // Should use compact notation
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle maximum safe integer values', () => {
      const maxSafeAmount = BigInt(Number.MAX_SAFE_INTEGER);
      const result = formatter.formatTokenAmount(maxSafeAmount, 0, 'TOKEN');
      expect(result).to.include(maxSafeAmount.toString());
    });

    it('should handle very large BigInt values', () => {
      const largeAmount = BigInt('123456789012345678901234567890');
      const result = formatter.toDisplayString(largeAmount, 18);
      expect(result).to.be.a('string');
      expect(result.length).to.be.greaterThan(0);
    });

    it('should gracefully handle formatting failures', () => {
      // Test with invalid locale to trigger fallback
      const amount = BigInt('1500000000000000000');
      const result = formatter.formatTokenAmount(amount, 18, 'ETH', { 
        locale: 'invalid-locale' 
      });
      expect(result).to.be.a('string');
      expect(result).to.include('ETH');
    });

    it('should handle precision edge cases', () => {
      // Test with maximum decimal precision
      const amount = BigInt('1');
      const result = formatter.toDisplayString(amount, 18);
      expect(result).to.equal('0.000000000000000001');
    });

    it('should handle minimum decimal precision', () => {
      const amount = BigInt('123');
      const result = formatter.toDisplayString(amount, 0);
      expect(result).to.equal('123');
    });

    it('should validate input bounds correctly', () => {
      // Test boundary conditions
      expect(() => {
        formatter.parseUserInput('1.5', -1); // Below minimum decimals
      }).to.throw(ParseError);

      expect(() => {
        formatter.parseUserInput('1.5', 19); // Above maximum decimals
      }).to.throw(ParseError);
    });
  });

  describe('Compact number formatting', () => {
    it('should format thousands correctly', () => {
      const amount = BigInt('5500000000000000000000'); // 5.5K ETH
      const result = formatter.formatTokenAmount(amount, 18, 'ETH', { compact: true });
      expect(result).to.equal('5.50K ETH');
    });

    it('should format millions correctly', () => {
      const amount = BigInt('2500000000000000000000000'); // 2.5M ETH
      const result = formatter.formatTokenAmount(amount, 18, 'ETH', { compact: true });
      expect(result).to.equal('2.50M ETH');
    });

    it('should format billions correctly', () => {
      const amount = BigInt('3500000000000000000000000000'); // 3.5B ETH
      const result = formatter.formatTokenAmount(amount, 18, 'ETH', { compact: true });
      expect(result).to.equal('3.50B ETH');
    });

    it('should format trillions correctly', () => {
      const amount = BigInt('1500000000000000000000000000000'); // 1.5T ETH
      const result = formatter.formatTokenAmount(amount, 18, 'ETH', { compact: true });
      expect(result).to.equal('1.50T ETH');
    });
  });
});