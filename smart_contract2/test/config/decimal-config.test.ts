/**
 * Unit tests for DecimalConfig service
 */

import { expect } from 'chai';
import { DecimalConfig, DecimalConversionError, NetworkConfigError } from '../../src/config/decimal-config';
import { SupportedNetwork } from '../../src/config/types';
import { DECIMAL_CONSTANTS } from '../../src/config/constants';

describe('DecimalConfig', () => {
  let decimalConfig: DecimalConfig;

  beforeEach(() => {
    // Create fresh instance for each test to avoid state pollution
    decimalConfig = DecimalConfig.createWithFreshConfig();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when calling getInstance multiple times', () => {
      const instance1 = DecimalConfig.getInstance();
      const instance2 = DecimalConfig.getInstance();
      expect(instance1).to.equal(instance2);
    });

    it('should create different instances when using createWithFreshConfig', () => {
      const instance1 = DecimalConfig.createWithFreshConfig();
      const instance2 = DecimalConfig.createWithFreshConfig();
      expect(instance1).to.not.equal(instance2);
    });
  });

  describe('Network Configuration', () => {
    it('should get current network configuration', () => {
      const networkConfig = decimalConfig.getCurrentNetwork();
      expect(networkConfig).to.have.property('chainId');
      expect(networkConfig).to.have.property('name');
      expect(networkConfig).to.have.property('nativeTokenDecimals');
      expect(networkConfig).to.have.property('nativeTokenSymbol');
      expect(networkConfig).to.have.property('rpcUrl');
    });

    it('should set and get current network', () => {
      decimalConfig.setCurrentNetwork('hedera-testnet');
      const networkConfig = decimalConfig.getCurrentNetwork();
      expect(networkConfig.name).to.equal('Hedera Testnet');
      expect(networkConfig.nativeTokenDecimals).to.equal(8);
      expect(networkConfig.nativeTokenSymbol).to.equal('HBAR');
    });

    it('should throw error for invalid network', () => {
      expect(() => {
        decimalConfig.setCurrentNetwork('invalid-network' as SupportedNetwork);
      }).to.throw(NetworkConfigError);
    });

    it('should correctly identify Hedera networks', () => {
      decimalConfig.setCurrentNetwork('hedera-testnet');
      expect(decimalConfig.isHederaNetwork()).to.be.true;

      decimalConfig.setCurrentNetwork('hedera-mainnet');
      expect(decimalConfig.isHederaNetwork()).to.be.true;

      decimalConfig.setCurrentNetwork('ethereum');
      expect(decimalConfig.isHederaNetwork()).to.be.false;

      decimalConfig.setCurrentNetwork('hardhat');
      expect(decimalConfig.isHederaNetwork()).to.be.false;
    });
  });

  describe('Token Decimals', () => {
    it('should return native token decimals for Ethereum networks', () => {
      decimalConfig.setCurrentNetwork('ethereum');
      expect(decimalConfig.getTokenDecimals()).to.equal(18);

      decimalConfig.setCurrentNetwork('hardhat');
      expect(decimalConfig.getTokenDecimals()).to.equal(18);
    });

    it('should return native token decimals for Hedera networks', () => {
      decimalConfig.setCurrentNetwork('hedera-testnet');
      expect(decimalConfig.getTokenDecimals()).to.equal(8);

      decimalConfig.setCurrentNetwork('hedera-mainnet');
      expect(decimalConfig.getTokenDecimals()).to.equal(8);
    });

    it('should return correct native token symbols', () => {
      decimalConfig.setCurrentNetwork('ethereum');
      expect(decimalConfig.getNativeTokenSymbol()).to.equal('ETH');

      decimalConfig.setCurrentNetwork('hedera-testnet');
      expect(decimalConfig.getNativeTokenSymbol()).to.equal('HBAR');
    });
  });

  describe('Decimal Validation', () => {
    it('should validate decimal precision within safe bounds', () => {
      expect(decimalConfig.validateDecimalPrecision(0)).to.be.true;
      expect(decimalConfig.validateDecimalPrecision(8)).to.be.true;
      expect(decimalConfig.validateDecimalPrecision(18)).to.be.true;
    });

    it('should reject invalid decimal precision', () => {
      expect(decimalConfig.validateDecimalPrecision(-1)).to.be.false;
      expect(decimalConfig.validateDecimalPrecision(19)).to.be.false;
      expect(decimalConfig.validateDecimalPrecision(1.5)).to.be.false;
      expect(decimalConfig.validateDecimalPrecision(NaN)).to.be.false;
    });

    it('should return correct safe decimal bounds', () => {
      expect(decimalConfig.getMaxSafeDecimals()).to.equal(DECIMAL_CONSTANTS.MAX_SAFE_DECIMALS);
      expect(decimalConfig.getMinSafeDecimals()).to.equal(DECIMAL_CONSTANTS.MIN_SAFE_DECIMALS);
    });
  });

  describe('Decimal Conversion', () => {
    describe('Same Decimal Precision', () => {
      it('should return same amount when decimals are equal', () => {
        const amount = BigInt('1000000000000000000'); // 1 ETH in wei
        const result = decimalConfig.convertBetweenNetworks(amount, 18, 18);
        expect(result).to.equal(amount);
      });
    });

    describe('Scaling Down (Higher to Lower Decimals)', () => {
      it('should convert from 18 decimals to 8 decimals correctly', () => {
        const amount = BigInt('1000000000000000000'); // 1 ETH in wei (18 decimals)
        const result = decimalConfig.convertBetweenNetworks(amount, 18, 8);
        const expected = BigInt('100000000'); // 1 HBAR in tinybar (8 decimals)
        expect(result).to.equal(expected);
      });

      it('should handle fractional amounts when scaling down', () => {
        const amount = BigInt('1500000000000000000'); // 1.5 ETH in wei
        const result = decimalConfig.convertBetweenNetworks(amount, 18, 8);
        const expected = BigInt('150000000'); // 1.5 HBAR in tinybar
        expect(result).to.equal(expected);
      });

      it('should truncate precision when scaling down', () => {
        const amount = BigInt('1000000001000000000'); // 1.000000001 ETH in wei
        const result = decimalConfig.convertBetweenNetworks(amount, 18, 8);
        const expected = BigInt('100000000'); // 1 HBAR in tinybar (precision lost)
        expect(result).to.equal(expected);
      });
    });

    describe('Scaling Up (Lower to Higher Decimals)', () => {
      it('should convert from 8 decimals to 18 decimals correctly', () => {
        const amount = BigInt('100000000'); // 1 HBAR in tinybar (8 decimals)
        const result = decimalConfig.convertBetweenNetworks(amount, 8, 18);
        const expected = BigInt('1000000000000000000'); // 1 ETH in wei (18 decimals)
        expect(result).to.equal(expected);
      });

      it('should handle fractional amounts when scaling up', () => {
        const amount = BigInt('150000000'); // 1.5 HBAR in tinybar
        const result = decimalConfig.convertBetweenNetworks(amount, 8, 18);
        const expected = BigInt('1500000000000000000'); // 1.5 ETH in wei
        expect(result).to.equal(expected);
      });
    });

    describe('Edge Cases', () => {
      it('should handle zero amounts', () => {
        const result = decimalConfig.convertBetweenNetworks(0n, 18, 8);
        expect(result).to.equal(0n);
      });

      it('should handle very small amounts', () => {
        const amount = BigInt('1'); // 1 wei
        const result = decimalConfig.convertBetweenNetworks(amount, 18, 8);
        expect(result).to.equal(0n); // Truncated to 0
      });

      it('should handle very large amounts', () => {
        const amount = BigInt('1000000000000000000000'); // 1000 ETH in wei
        const result = decimalConfig.convertBetweenNetworks(amount, 18, 8);
        const expected = BigInt('100000000000'); // 1000 HBAR in tinybar
        expect(result).to.equal(expected);
      });
    });

    describe('Error Handling', () => {
      it('should throw error for negative amounts', () => {
        expect(() => {
          decimalConfig.convertBetweenNetworks(BigInt('-1'), 18, 8);
        }).to.throw(DecimalConversionError, 'Amount cannot be negative');
      });

      it('should throw error for invalid source decimals', () => {
        expect(() => {
          decimalConfig.convertBetweenNetworks(BigInt('1000'), -1, 8);
        }).to.throw(DecimalConversionError, 'Invalid source decimals');
      });

      it('should throw error for invalid target decimals', () => {
        expect(() => {
          decimalConfig.convertBetweenNetworks(BigInt('1000'), 18, 25);
        }).to.throw(DecimalConversionError, 'Invalid target decimals');
      });

      it('should include conversion details in error', () => {
        try {
          decimalConfig.convertBetweenNetworks(BigInt('-1'), 18, 8);
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error).to.be.instanceOf(DecimalConversionError);
          const conversionError = error as DecimalConversionError;
          expect(conversionError.fromDecimals).to.equal(18);
          expect(conversionError.toDecimals).to.equal(8);
          expect(conversionError.amount).to.equal(BigInt('-1'));
        }
      });
    });
  });

  describe('Convenience Methods', () => {
    describe('Wei to Tinybar Conversion', () => {
      it('should convert wei to tinybar correctly', () => {
        const weiAmount = BigInt('1000000000000000000'); // 1 ETH in wei
        const result = decimalConfig.weiToTinybar(weiAmount);
        const expected = BigInt('100000000'); // 1 HBAR in tinybar
        expect(result).to.equal(expected);
      });
    });

    describe('Tinybar to Wei Conversion', () => {
      it('should convert tinybar to wei correctly', () => {
        const tinybarAmount = BigInt('100000000'); // 1 HBAR in tinybar
        const result = decimalConfig.tinybarToWei(tinybarAmount);
        const expected = BigInt('1000000000000000000'); // 1 ETH in wei
        expect(result).to.equal(expected);
      });
    });

    describe('Conversion Factor', () => {
      it('should return 1 for same decimals', () => {
        const factor = decimalConfig.getConversionFactor(18, 18);
        expect(factor).to.equal(1n);
      });

      it('should return correct factor for scaling down', () => {
        const factor = decimalConfig.getConversionFactor(18, 8);
        expect(factor).to.equal(BigInt(10) ** BigInt(10));
      });

      it('should return correct factor for scaling up', () => {
        const factor = decimalConfig.getConversionFactor(8, 18);
        expect(factor).to.equal(BigInt(10) ** BigInt(10));
      });
    });

    describe('Precision Loss Detection', () => {
      it('should detect no precision loss when scaling up', () => {
        const amount = BigInt('100000000'); // 1 HBAR in tinybar
        const wouldLose = decimalConfig.wouldLosePrecision(amount, 8, 18);
        expect(wouldLose).to.be.false;
      });

      it('should detect no precision loss when amount divides evenly', () => {
        const amount = BigInt('1000000000000000000'); // 1 ETH in wei
        const wouldLose = decimalConfig.wouldLosePrecision(amount, 18, 8);
        expect(wouldLose).to.be.false;
      });

      it('should detect precision loss when amount does not divide evenly', () => {
        const amount = BigInt('1000000001000000000'); // 1.000000001 ETH in wei
        const wouldLose = decimalConfig.wouldLosePrecision(amount, 18, 8);
        expect(wouldLose).to.be.true;
      });
    });

    describe('Network Decimal Configuration', () => {
      it('should return correct configuration for Ethereum', () => {
        const config = decimalConfig.getNetworkDecimalConfig('ethereum');
        expect(config.decimals).to.equal(18);
        expect(config.symbol).to.equal('ETH');
      });

      it('should return correct configuration for Hedera', () => {
        const config = decimalConfig.getNetworkDecimalConfig('hedera-testnet');
        expect(config.decimals).to.equal(8);
        expect(config.symbol).to.equal('HBAR');
      });

      it('should return correct configuration for Hardhat', () => {
        const config = decimalConfig.getNetworkDecimalConfig('hardhat');
        expect(config.decimals).to.equal(18);
        expect(config.symbol).to.equal('ETH');
      });
    });
  });

  describe('Integration with Network Detection', () => {
    it('should work with different network configurations', () => {
      // Test Ethereum network
      decimalConfig.setCurrentNetwork('ethereum');
      expect(decimalConfig.getCurrentNetwork().nativeTokenDecimals).to.equal(18);
      expect(decimalConfig.isHederaNetwork()).to.be.false;

      // Test Hedera network
      decimalConfig.setCurrentNetwork('hedera-testnet');
      expect(decimalConfig.getCurrentNetwork().nativeTokenDecimals).to.equal(8);
      expect(decimalConfig.isHederaNetwork()).to.be.true;
    });

    it('should handle network switching correctly', () => {
      // Start with Ethereum
      decimalConfig.setCurrentNetwork('ethereum');
      const ethConfig = decimalConfig.getCurrentNetwork();
      expect(ethConfig.nativeTokenSymbol).to.equal('ETH');

      // Switch to Hedera
      decimalConfig.setCurrentNetwork('hedera-testnet');
      const hederaConfig = decimalConfig.getCurrentNetwork();
      expect(hederaConfig.nativeTokenSymbol).to.equal('HBAR');

      // Verify the change persisted
      expect(decimalConfig.getNativeTokenSymbol()).to.equal('HBAR');
    });
  });
});