import { expect } from 'chai';
import { EnvironmentConfigLoader, NetworkDetector } from '../../src/config';
import { SupportedNetwork } from '../../src/config/types';

describe('Configuration System Integration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment and Network Detection Integration', () => {
    it('should work together to provide network configuration', () => {
      // Set up environment
      process.env.DEFAULT_NETWORK = 'hedera-testnet';
      process.env.HEDERA_TESTNET_URL = 'https://custom-hedera-testnet.com';

      // Create instances
      const envLoader = new (EnvironmentConfigLoader as any)();
      const networkDetector = NetworkDetector.createWithFreshConfig();

      // Test integration
      const currentNetwork = envLoader.getDefaultNetwork();
      expect(currentNetwork).to.equal('hedera-testnet');

      const networkConfig = networkDetector.getNetworkConfig(currentNetwork);
      expect(networkConfig.rpcUrl).to.equal('https://custom-hedera-testnet.com');
      expect(networkConfig.nativeTokenDecimals).to.equal(8);
      expect(networkConfig.nativeTokenSymbol).to.equal('HBAR');
    });

    it('should handle network switching scenarios', () => {
      // Start with Ethereum
      process.env.DEFAULT_NETWORK = 'ethereum';
      const envLoader = new (EnvironmentConfigLoader as any)();
      const networkDetector = NetworkDetector.createWithFreshConfig();

      let currentNetwork = envLoader.getDefaultNetwork();
      let networkConfig = networkDetector.getNetworkConfig(currentNetwork);
      expect(networkConfig.nativeTokenDecimals).to.equal(18);
      expect(networkConfig.nativeTokenSymbol).to.equal('ETH');

      // Switch to Hedera
      process.env.DEFAULT_NETWORK = 'hedera-testnet';
      envLoader.reload();

      currentNetwork = envLoader.getDefaultNetwork();
      networkConfig = networkDetector.getNetworkConfig(currentNetwork);
      expect(networkConfig.nativeTokenDecimals).to.equal(8);
      expect(networkConfig.nativeTokenSymbol).to.equal('HBAR');
    });

    it('should provide consistent decimal handling across components', () => {
      const networks: SupportedNetwork[] = ['ethereum', 'hardhat', 'hedera-testnet', 'hedera-mainnet'];
      const networkDetector = NetworkDetector.getInstance();

      networks.forEach(network => {
        const config = networkDetector.getNetworkConfig(network);
        const tokenInfo = networkDetector.getNativeTokenInfo(network);
        const isHedera = networkDetector.isHederaNetwork(network);
        const isEthereum = networkDetector.isEthereumNetwork(network);

        // Consistency checks
        expect(config.nativeTokenDecimals).to.equal(tokenInfo.decimals);
        expect(config.nativeTokenSymbol).to.equal(tokenInfo.symbol);

        // Network type consistency
        if (isHedera) {
          expect(config.nativeTokenDecimals).to.equal(8);
          expect(config.nativeTokenSymbol).to.equal('HBAR');
          expect(isEthereum).to.be.false;
        }

        if (isEthereum) {
          expect(config.nativeTokenDecimals).to.equal(18);
          expect(config.nativeTokenSymbol).to.equal('ETH');
          expect(isHedera).to.be.false;
        }
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should provide consistent error handling across components', () => {
      const networkDetector = NetworkDetector.getInstance();

      // Test chain ID error
      expect(() => {
        networkDetector.detectNetworkByChainId(999);
      }).to.throw().with.property('name', 'NetworkDetectionError');

      // Test invalid network error
      expect(() => {
        networkDetector.getNetworkConfig('invalid' as SupportedNetwork);
      }).to.throw().with.property('name', 'NetworkDetectionError');

      // Test environment config error
      process.env.DEFAULT_NETWORK = 'invalid-network';
      expect(() => {
        new (EnvironmentConfigLoader as any)();
      }).to.throw().with.property('name', 'EnvironmentConfigError');
    });
  });

  describe('Configuration Validation Integration', () => {
    it('should validate complete configuration setup', () => {
      // Set up valid complete configuration
      process.env.DEFAULT_NETWORK = 'hedera-testnet';
      process.env.FALLBACK_DECIMALS = '8';
      process.env.HEDERA_TESTNET_URL = 'https://testnet.hashio.io/api';
      process.env.PRIVATE_KEY = 'test-private-key';

      const envLoader = new (EnvironmentConfigLoader as any)();
      const networkDetector = NetworkDetector.createWithFreshConfig();

      // Validate environment configuration
      const config = envLoader.getConfig();
      expect(config.defaultNetwork).to.equal('hedera-testnet');
      expect(config.fallbackDecimals).to.equal('8');
      expect(config.hederaTestnetUrl).to.equal('https://testnet.hashio.io/api');
      expect(config.privateKey).to.equal('test-private-key');

      // Validate network detection
      const network = envLoader.getDefaultNetwork();
      expect(networkDetector.isValidNetwork(network)).to.be.true;
      expect(networkDetector.isHederaNetwork(network)).to.be.true;

      // Validate network configuration
      const networkConfig = networkDetector.getNetworkConfig(network);
      expect(networkConfig.rpcUrl).to.equal('https://testnet.hashio.io/api');
      expect(networkConfig.nativeTokenDecimals).to.equal(8);
    });

    it('should handle missing configuration gracefully', () => {
      // Clear all configuration
      delete process.env.DEFAULT_NETWORK;
      delete process.env.FALLBACK_DECIMALS;
      delete process.env.HEDERA_TESTNET_URL;
      delete process.env.PRIVATE_KEY;

      const envLoader = new (EnvironmentConfigLoader as any)();
      const networkDetector = NetworkDetector.createWithFreshConfig();

      // Should use defaults
      expect(envLoader.getDefaultNetwork()).to.equal('hardhat');
      expect(envLoader.getFallbackDecimals()).to.equal(18);
      expect(envLoader.getPrivateKey()).to.be.undefined;

      // Should still work with default network
      const networkConfig = networkDetector.getNetworkConfig('hardhat');
      expect(networkConfig.nativeTokenDecimals).to.equal(18);
      expect(networkConfig.nativeTokenSymbol).to.equal('ETH');
    });
  });

  describe('Performance and Singleton Behavior', () => {
    it('should maintain singleton instances across multiple calls', () => {
      const envLoader1 = EnvironmentConfigLoader.getInstance();
      const envLoader2 = EnvironmentConfigLoader.getInstance();
      const networkDetector1 = NetworkDetector.getInstance();
      const networkDetector2 = NetworkDetector.getInstance();

      expect(envLoader1).to.equal(envLoader2);
      expect(networkDetector1).to.equal(networkDetector2);
    });

    it('should handle rapid configuration queries efficiently', () => {
      const networkDetector = NetworkDetector.getInstance();
      const networks: SupportedNetwork[] = ['ethereum', 'hardhat', 'hedera-testnet', 'hedera-mainnet'];

      // Perform multiple rapid queries
      for (let i = 0; i < 100; i++) {
        networks.forEach(network => {
          const config = networkDetector.getNetworkConfig(network);
          const tokenInfo = networkDetector.getNativeTokenInfo(network);
          expect(config.nativeTokenDecimals).to.equal(tokenInfo.decimals);
        });
      }
    });
  });
});