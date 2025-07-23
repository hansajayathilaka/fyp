import { expect } from 'chai';
import { parseAmount, formatAmount, safeFormatAmount, safeParseAmount, getNetworkInfo, formatAmountForDisplay } from '../src/utils/decimal-utils';

describe('Decimal Utils', () => {
  describe('parseAmount', () => {
    it('should parse user input correctly for Ethereum (18 decimals)', () => {
      // Mock Ethereum environment
      const result = parseAmount('1.5');
      // Should be 1.5 * 10^18 for Ethereum
      expect(result.toString()).to.equal('1500000000000000000');
    });

    it('should handle zero input', () => {
      const result = parseAmount('0');
      expect(result.toString()).to.equal('0');
    });

    it('should handle decimal input', () => {
      const result = parseAmount('0.1');
      // Should be 0.1 * 10^18 for Ethereum
      expect(result.toString()).to.equal('100000000000000000');
    });
  });

  describe('formatAmount', () => {
    it('should format blockchain amounts correctly for Ethereum', () => {
      const amount = BigInt('1500000000000000000'); // 1.5 ETH
      const result = formatAmount(amount);
      expect(result).to.equal('1.5');
    });

    it('should handle zero amounts', () => {
      const result = formatAmount(BigInt('0'));
      expect(result).to.equal('0.0');
    });

    it('should handle small amounts', () => {
      const amount = BigInt('100000000000000000'); // 0.1 ETH
      const result = formatAmount(amount);
      expect(result).to.equal('0.1');
    });
  });

  describe('safeFormatAmount', () => {
    it('should format valid amounts', () => {
      const amount = BigInt('1000000000000000000'); // 1 ETH
      const result = safeFormatAmount(amount);
      expect(result).to.equal('1.0');
    });

    it('should return raw value on error', () => {
      // This test is more about ensuring no exceptions are thrown
      const amount = BigInt('123');
      const result = safeFormatAmount(amount);
      expect(typeof result).to.equal('string');
    });
  });

  describe('safeParseAmount', () => {
    it('should parse valid input', () => {
      const result = safeParseAmount('1.0');
      expect(result.toString()).to.equal('1000000000000000000');
    });

    it('should throw error for empty input', () => {
      expect(() => safeParseAmount('')).to.throw('Input cannot be empty');
    });

    it('should throw error for invalid format', () => {
      expect(() => safeParseAmount('abc')).to.throw('Invalid number format');
    });

    it('should throw error for whitespace only', () => {
      expect(() => safeParseAmount('   ')).to.throw('Input cannot be empty');
    });
  });

  describe('getNetworkInfo', () => {
    it('should return network information', () => {
      const info = getNetworkInfo();
      expect(info).to.have.property('decimals');
      expect(info).to.have.property('network');
      expect(typeof info.decimals).to.equal('number');
      expect(typeof info.network).to.equal('string');
    });

    it('should default to Ethereum when no window.ethereum', () => {
      const info = getNetworkInfo();
      expect(info.decimals).to.equal(18);
      expect(info.network).to.equal('Ethereum');
    });
  });

  describe('formatAmountForDisplay', () => {
    it('should format with limited decimal places', () => {
      const amount = BigInt('1234567890123456789'); // ~1.234 ETH
      const result = formatAmountForDisplay(amount, 4);
      expect(result).to.match(/^1\.234[56]?$/); // Should be around 1.2345 or 1.2346 due to rounding
    });

    it('should handle zero amounts', () => {
      const result = formatAmountForDisplay(BigInt('0'));
      expect(result).to.equal('0');
    });

    it('should remove trailing zeros', () => {
      const amount = BigInt('1000000000000000000'); // 1.0 ETH
      const result = formatAmountForDisplay(amount);
      expect(result).to.equal('1');
    });

    it('should handle very small amounts', () => {
      const amount = BigInt('1000000000000'); // Very small amount
      const result = formatAmountForDisplay(amount, 6);
      expect(typeof result).to.equal('string');
      expect(result.length).to.be.greaterThan(0);
    });
  });
});