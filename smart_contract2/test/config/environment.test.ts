import { expect } from 'chai';
import { EnvironmentConfigLoader, EnvironmentConfigError } from '../../src/config/environment';
import { SupportedNetwork } from '../../src/config/types';

describe('EnvironmentConfigLoader', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Configuration Loading', () => {
    it('should load default configuration when no environment variables are set', () => {
      // Clear relevant environment variables
      delete process.env.DEFAULT_NETWORK;
      delete process.env.FALLBACK_DECIMALS;
      delete process.env.HEDERA_TESTNET_URL;
      delete process.env.ETHEREUM_MAINNET_URL;

      const loader = EnvironmentConfigLoader.getInstance();
      const config = loader.getConfig();

      expect(config.defaultNetwork).to.be.undefined;
      expect(config.fallbackDecimals).to.be.undefined;
      expect(config.hederaTestnetUrl).to.be.undefined;
      expect(config.ethereumMainnetUrl).to.be.undefined;
    });

    it('should load configuration from environment variables', () => {
      process.env.DEFAULT_NETWORK = 'hedera-testnet';
      process.env.FALLBACK_DECIMALS = '8';
      process.env.HEDERA_TESTNET_URL = 'https://custom-hedera-url.com';
      process.env.ETHEREUM_MAINNET_URL = 'https://custom-ethereum-url.com';

      // Create new instance to pick up environment changes
      const loader = new (EnvironmentConfigLoader as any)();
      const config = loader.getConfig();

      expect(config.defaultNetwork).to.equal('hedera-testnet');
      expect(config.fallbackDecimals).to.equal('8');
      expect(config.hederaTestnetUrl).to.equal('https://custom-hedera-url.com');
      expect(config.ethereumMainnetUrl).to.equal('https://custom-ethereum-url.com');
    });
  });

  describe('Configuration Validation', () => {
    it('should throw error for invalid default network', () => {
      process.env.DEFAULT_NETWORK = 'invalid-network';

      expect(() => {
        new (EnvironmentConfigLoader as any)();
      }).to.throw(EnvironmentConfigError, 'Invalid DEFAULT_NETWORK');
    });

    it('should throw error for invalid fallback decimals - non-numeric', () => {
      process.env.FALLBACK_DECIMALS = 'not-a-number';

      expect(() => {
        new (EnvironmentConfigLoader as any)();
      }).to.throw(EnvironmentConfigError, 'Invalid FALLBACK_DECIMALS');
    });

    it('should throw error for invalid fallback decimals - out of range', () => {
      process.env.FALLBACK_DECIMALS = '25';

      expect(() => {
        new (EnvironmentConfigLoader as any)();
      }).to.throw(EnvironmentConfigError, 'Invalid FALLBACK_DECIMALS');
    });

    it('should throw error for invalid Hedera testnet URL', () => {
      process.env.HEDERA_TESTNET_URL = 'not-a-valid-url';

      expect(() => {
        new (EnvironmentConfigLoader as any)();
      }).to.throw(EnvironmentConfigError, 'Invalid HEDERA_TESTNET_URL');
    });

    it('should throw error for invalid Ethereum mainnet URL', () => {
      process.env.ETHEREUM_MAINNET_URL = 'invalid-url';

      expect(() => {
        new (EnvironmentConfigLoader as any)();
      }).to.throw(EnvironmentConfigError, 'Invalid ETHEREUM_MAINNET_URL');
    });

    it('should accept valid configuration', () => {
      process.env.DEFAULT_NETWORK = 'hedera-testnet';
      process.env.FALLBACK_DECIMALS = '8';
      process.env.HEDERA_TESTNET_URL = 'https://testnet.hashio.io/api';
      process.env.ETHEREUM_MAINNET_URL = 'https://mainnet.infura.io/v3/test';

      expect(() => {
        new (EnvironmentConfigLoader as any)();
      }).to.not.throw();
    });
  });

  describe('Getter Methods', () => {
    beforeEach(() => {
      process.env.DEFAULT_NETWORK = 'hedera-testnet';
      process.env.FALLBACK_DECIMALS = '8';
      process.env.HEDERA_TESTNET_URL = 'https://custom-hedera.com';
      process.env.PRIVATE_KEY = 'test-private-key';
    });

    it('should return correct default network', () => {
      const loader = new (EnvironmentConfigLoader as any)();
      expect(loader.getDefaultNetwork()).to.equal('hedera-testnet');
    });

    it('should return fallback network when not set', () => {
      delete process.env.DEFAULT_NETWORK;
      const loader = new (EnvironmentConfigLoader as any)();
      expect(loader.getDefaultNetwork()).to.equal('hardhat');
    });

    it('should return correct fallback decimals', () => {
      const loader = new (EnvironmentConfigLoader as any)();
      expect(loader.getFallbackDecimals()).to.equal(8);
    });

    it('should return default fallback decimals when not set', () => {
      delete process.env.FALLBACK_DECIMALS;
      const loader = new (EnvironmentConfigLoader as any)();
      expect(loader.getFallbackDecimals()).to.equal(18);
    });

    it('should return private key', () => {
      const loader = new (EnvironmentConfigLoader as any)();
      expect(loader.getPrivateKey()).to.equal('test-private-key');
    });

    it('should return custom RPC URLs', () => {
      const loader = new (EnvironmentConfigLoader as any)();
      expect(loader.getCustomRpcUrl('hedera-testnet')).to.equal('https://custom-hedera.com');
      expect(loader.getCustomRpcUrl('ethereum')).to.be.undefined;
      expect(loader.getCustomRpcUrl('hardhat')).to.be.undefined;
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = EnvironmentConfigLoader.getInstance();
      const instance2 = EnvironmentConfigLoader.getInstance();
      expect(instance1).to.equal(instance2);
    });
  });

  describe('Reload Functionality', () => {
    it('should reload configuration when environment changes', () => {
      process.env.DEFAULT_NETWORK = 'hardhat';
      const loader = new (EnvironmentConfigLoader as any)();
      expect(loader.getDefaultNetwork()).to.equal('hardhat');

      process.env.DEFAULT_NETWORK = 'hedera-testnet';
      loader.reload();
      expect(loader.getDefaultNetwork()).to.equal('hedera-testnet');
    });
  });
});