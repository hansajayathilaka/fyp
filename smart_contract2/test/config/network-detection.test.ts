import { expect } from 'chai';
import { NetworkDetector, NetworkDetectionError } from '../../src/config/network-detection';
import { EnvironmentConfigLoader } from '../../src/config/environment';
import { SupportedNetwork } from '../../src/config/types';
import { NETWORK_CONFIGS } from '../../src/config/constants';

describe('NetworkDetector', () => {
  let detector: NetworkDetector;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    detector = NetworkDetector.getInstance();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Network Detection by Chain ID', () => {
    it('should detect Hardhat network by chain ID', () => {
      const network = detector.detectNetworkByChainId(31337);
      expect(network).to.equal('hardhat');
    });

    it('should detect Ethereum mainnet by chain ID', () => {
      const network = detector.detectNetworkByChainId(1);
      expect(network).to.equal('ethereum');
    });

    it('should detect Hedera testnet by chain ID', () => {
      const network = detector.detectNetworkByChainId(296);
      expect(network).to.equal('hedera-testnet');
    });

    it('should detect Hedera mainnet by chain ID', () => {
      const network = detector.detectNetworkByChainId(295);
      expect(network).to.equal('hedera-mainnet');
    });

    it('should throw error for unsupported chain ID', () => {
      expect(() => {
        detector.detectNetworkByChainId(999);
      }).to.throw(NetworkDetectionError, 'Unsupported chain ID: 999');
    });
  });

  describe('Network Configuration Retrieval', () => {
    it('should return correct network configuration', () => {
      const config = detector.getNetworkConfig('hedera-testnet');
      expect(config.chainId).to.equal(296);
      expect(config.name).to.equal('Hedera Testnet');
      expect(config.nativeTokenDecimals).to.equal(8);
      expect(config.nativeTokenSymbol).to.equal('HBAR');
    });

    it('should return configuration with custom RPC URL when available', () => {
      process.env.HEDERA_TESTNET_URL = 'https://custom-hedera-url.com';
      
      // Create new detector instance to pick up environment changes
      const newDetector = NetworkDetector.createWithFreshConfig();
      const config = newDetector.getNetworkConfig('hedera-testnet');
      
      expect(config.rpcUrl).to.equal('https://custom-hedera-url.com');
    });

    it('should throw error for unknown network', () => {
      expect(() => {
        detector.getNetworkConfig('unknown-network' as SupportedNetwork);
      }).to.throw(NetworkDetectionError, 'Unknown network: unknown-network');
    });
  });

  describe('Current Network Detection', () => {
    it('should return default network when no environment variable set', () => {
      delete process.env.DEFAULT_NETWORK;
      const network = detector.getCurrentNetwork();
      expect(network).to.equal('hardhat');
    });

    it('should return network from environment variable', () => {
      process.env.DEFAULT_NETWORK = 'hedera-testnet';
      // Create new detector instance to pick up environment changes
      const newDetector = NetworkDetector.createWithFreshConfig();
      const network = newDetector.getCurrentNetwork();
      expect(network).to.equal('hedera-testnet');
    });
  });

  describe('Network Type Checking', () => {
    it('should correctly identify Hedera networks', () => {
      expect(detector.isHederaNetwork('hedera-testnet')).to.be.true;
      expect(detector.isHederaNetwork('hedera-mainnet')).to.be.true;
      expect(detector.isHederaNetwork('ethereum')).to.be.false;
      expect(detector.isHederaNetwork('hardhat')).to.be.false;
    });

    it('should correctly identify Ethereum networks', () => {
      expect(detector.isEthereumNetwork('ethereum')).to.be.true;
      expect(detector.isEthereumNetwork('hardhat')).to.be.true;
      expect(detector.isEthereumNetwork('hedera-testnet')).to.be.false;
      expect(detector.isEthereumNetwork('hedera-mainnet')).to.be.false;
    });
  });

  describe('Network Validation', () => {
    it('should validate supported networks', () => {
      expect(detector.isValidNetwork('hardhat')).to.be.true;
      expect(detector.isValidNetwork('ethereum')).to.be.true;
      expect(detector.isValidNetwork('hedera-testnet')).to.be.true;
      expect(detector.isValidNetwork('hedera-mainnet')).to.be.true;
      expect(detector.isValidNetwork('invalid-network')).to.be.false;
    });

    it('should return all supported networks', () => {
      const networks = detector.getSupportedNetworks();
      expect(networks).to.have.length(4);
      expect(networks).to.include.members(['hardhat', 'ethereum', 'hedera-testnet', 'hedera-mainnet']);
    });
  });

  describe('Network Detection by RPC URL', () => {
    it('should detect network by RPC URL', () => {
      const network = detector.detectNetworkByRpcUrl('https://testnet.hashio.io/api');
      expect(network).to.equal('hedera-testnet');
    });

    it('should return null for unknown RPC URL', () => {
      const network = detector.detectNetworkByRpcUrl('https://unknown-rpc.com');
      expect(network).to.be.null;
    });
  });

  describe('Network Display Information', () => {
    it('should return correct display name', () => {
      const displayName = detector.getNetworkDisplayName('hedera-testnet');
      expect(displayName).to.equal('Hedera Testnet');
    });

    it('should return native token information', () => {
      const tokenInfo = detector.getNativeTokenInfo('hedera-testnet');
      expect(tokenInfo.symbol).to.equal('HBAR');
      expect(tokenInfo.decimals).to.equal(8);

      const ethTokenInfo = detector.getNativeTokenInfo('ethereum');
      expect(ethTokenInfo.symbol).to.equal('ETH');
      expect(ethTokenInfo.decimals).to.equal(18);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = NetworkDetector.getInstance();
      const instance2 = NetworkDetector.getInstance();
      expect(instance1).to.equal(instance2);
    });
  });

  describe('Error Handling', () => {
    it('should include chain ID in error for unsupported networks', () => {
      try {
        detector.detectNetworkByChainId(999);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(NetworkDetectionError);
        expect((error as NetworkDetectionError).chainId).to.equal(999);
      }
    });

    it('should not include chain ID in error for unknown network names', () => {
      try {
        detector.getNetworkConfig('unknown' as SupportedNetwork);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(NetworkDetectionError);
        expect((error as NetworkDetectionError).chainId).to.be.undefined;
      }
    });
  });
});