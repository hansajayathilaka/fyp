import { expect } from 'chai';
import { NETWORK_CONFIGS, DECIMAL_CONSTANTS, DEFAULT_NETWORK } from '../../src/config/constants';
import { SupportedNetwork } from '../../src/config/types';

describe('Configuration Constants', () => {
  describe('NETWORK_CONFIGS', () => {
    it('should have all required networks defined', () => {
      const expectedNetworks: SupportedNetwork[] = ['hardhat', 'ethereum', 'hedera-testnet', 'hedera-mainnet'];
      const actualNetworks = Object.keys(NETWORK_CONFIGS) as SupportedNetwork[];
      
      expect(actualNetworks).to.have.length(expectedNetworks.length);
      expectedNetworks.forEach(network => {
        expect(actualNetworks).to.include(network);
      });
    });

    it('should have correct Hardhat configuration', () => {
      const config = NETWORK_CONFIGS.hardhat;
      expect(config.chainId).to.equal(31337);
      expect(config.name).to.equal('Hardhat Local');
      expect(config.nativeTokenDecimals).to.equal(18);
      expect(config.nativeTokenSymbol).to.equal('ETH');
      expect(config.rpcUrl).to.equal('http://127.0.0.1:8545');
      expect(config.explorerUrl).to.be.undefined;
    });

    it('should have correct Ethereum mainnet configuration', () => {
      const config = NETWORK_CONFIGS.ethereum;
      expect(config.chainId).to.equal(1);
      expect(config.name).to.equal('Ethereum Mainnet');
      expect(config.nativeTokenDecimals).to.equal(18);
      expect(config.nativeTokenSymbol).to.equal('ETH');
      expect(config.rpcUrl).to.include('mainnet');
    });

    it('should have correct Hedera testnet configuration', () => {
      const config = NETWORK_CONFIGS['hedera-testnet'];
      expect(config.chainId).to.equal(296);
      expect(config.name).to.equal('Hedera Testnet');
      expect(config.nativeTokenDecimals).to.equal(8);
      expect(config.nativeTokenSymbol).to.equal('HBAR');
      expect(config.rpcUrl).to.equal('https://testnet.hashio.io/api');
      expect(config.explorerUrl).to.equal('https://hashscan.io/testnet');
    });

    it('should have correct Hedera mainnet configuration', () => {
      const config = NETWORK_CONFIGS['hedera-mainnet'];
      expect(config.chainId).to.equal(295);
      expect(config.name).to.equal('Hedera Mainnet');
      expect(config.nativeTokenDecimals).to.equal(8);
      expect(config.nativeTokenSymbol).to.equal('HBAR');
      expect(config.rpcUrl).to.equal('https://mainnet.hashio.io/api');
      expect(config.explorerUrl).to.equal('https://hashscan.io/mainnet');
    });

    it('should have unique chain IDs for all networks', () => {
      const chainIds = Object.values(NETWORK_CONFIGS).map(config => config.chainId);
      const uniqueChainIds = [...new Set(chainIds)];
      expect(chainIds).to.have.length(uniqueChainIds.length);
    });

    it('should have valid RPC URLs for all networks', () => {
      Object.values(NETWORK_CONFIGS).forEach(config => {
        expect(config.rpcUrl).to.be.a('string');
        expect(config.rpcUrl.length).to.be.greaterThan(0);
        
        // Should be a valid URL format
        if (config.rpcUrl.startsWith('http')) {
          expect(() => new URL(config.rpcUrl)).to.not.throw();
        }
      });
    });
  });

  describe('DECIMAL_CONSTANTS', () => {
    it('should have correct conversion factors', () => {
      expect(DECIMAL_CONSTANTS.WEI_TO_TINYBAR).to.equal(BigInt(10) ** BigInt(10));
      expect(DECIMAL_CONSTANTS.TINYBAR_TO_WEI).to.equal(BigInt(10) ** BigInt(10));
    });

    it('should have correct decimal limits', () => {
      expect(DECIMAL_CONSTANTS.MAX_SAFE_DECIMALS).to.equal(18);
      expect(DECIMAL_CONSTANTS.MIN_SAFE_DECIMALS).to.equal(0);
      expect(DECIMAL_CONSTANTS.DEFAULT_FALLBACK_DECIMALS).to.equal(18);
    });

    it('should have logical decimal limits', () => {
      expect(DECIMAL_CONSTANTS.MIN_SAFE_DECIMALS).to.be.lessThan(DECIMAL_CONSTANTS.MAX_SAFE_DECIMALS);
      expect(DECIMAL_CONSTANTS.DEFAULT_FALLBACK_DECIMALS).to.be.at.least(DECIMAL_CONSTANTS.MIN_SAFE_DECIMALS);
      expect(DECIMAL_CONSTANTS.DEFAULT_FALLBACK_DECIMALS).to.be.at.most(DECIMAL_CONSTANTS.MAX_SAFE_DECIMALS);
    });

    it('should have conversion factors that are powers of 10', () => {
      const weiToTinybar = DECIMAL_CONSTANTS.WEI_TO_TINYBAR;
      const tinybarToWei = DECIMAL_CONSTANTS.TINYBAR_TO_WEI;
      
      // Should be equal (bidirectional conversion)
      expect(weiToTinybar).to.equal(tinybarToWei);
      
      // Should be 10^10 (difference between 18 and 8 decimals)
      expect(weiToTinybar).to.equal(BigInt('10000000000'));
    });
  });

  describe('DEFAULT_NETWORK', () => {
    it('should be a valid supported network', () => {
      expect(Object.keys(NETWORK_CONFIGS)).to.include(DEFAULT_NETWORK);
    });

    it('should be hardhat for development', () => {
      expect(DEFAULT_NETWORK).to.equal('hardhat');
    });
  });

  describe('Network Configuration Consistency', () => {
    it('should have consistent decimal places for Ethereum-based networks', () => {
      expect(NETWORK_CONFIGS.ethereum.nativeTokenDecimals).to.equal(18);
      expect(NETWORK_CONFIGS.hardhat.nativeTokenDecimals).to.equal(18);
    });

    it('should have consistent decimal places for Hedera networks', () => {
      expect(NETWORK_CONFIGS['hedera-testnet'].nativeTokenDecimals).to.equal(8);
      expect(NETWORK_CONFIGS['hedera-mainnet'].nativeTokenDecimals).to.equal(8);
    });

    it('should have consistent token symbols for same network types', () => {
      expect(NETWORK_CONFIGS.ethereum.nativeTokenSymbol).to.equal('ETH');
      expect(NETWORK_CONFIGS.hardhat.nativeTokenSymbol).to.equal('ETH');
      expect(NETWORK_CONFIGS['hedera-testnet'].nativeTokenSymbol).to.equal('HBAR');
      expect(NETWORK_CONFIGS['hedera-mainnet'].nativeTokenSymbol).to.equal('HBAR');
    });
  });
});