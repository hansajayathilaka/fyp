import { ConfigurationError } from '../middleware/errorHandler';
import * as fs from 'fs';
import * as path from 'path';

export interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  truveraApiUrl: string;
  truveraApiKey: string;
  frontendUrl: string;
  blockchainEnabled: boolean;
  smartContractAddress?: string;
  accountPrivateKey?: string;
  blockchainRpcUrl?: string;
}

export interface DeploymentInfo {
  regulatoryManagement: string;
  regulatedERC1155Token: string;
  regulatedMarketplace: string;
  deployer: string;
  network: string;
  chainId: number;
  deploymentTime: string;
  contractABIs: {
    regulatoryManagement: string;
    regulatedERC1155Token: string;
    regulatedMarketplace: string;
  };
}

// Network configuration mapping
const NETWORK_CONFIG: Record<string, { rpcUrl: string; chainId: number }> = {
  sonicTestnet: {
    rpcUrl: 'https://rpc.blaze.soniclabs.com',
    chainId: 57054
  },
  hardhat: {
    rpcUrl: 'http://localhost:8545',
    chainId: 31337
  }
};

/**
 * Load deployment information from deployment-info.json
 */
function loadDeploymentInfo(): DeploymentInfo {
  const deploymentInfoPath = path.join(__dirname, '../../deployment-info.json');
  
  try {
    const deploymentInfoContent = fs.readFileSync(deploymentInfoPath, 'utf8');
    return JSON.parse(deploymentInfoContent) as DeploymentInfo;
  } catch (error) {
    throw new ConfigurationError(
      'Failed to load deployment-info.json',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}

/**
 * Get blockchain configuration from deployment info
 */
function getBlockchainConfigFromDeployment(): { contractAddress: string; rpcUrl: string } {
  const deploymentInfo = loadDeploymentInfo();
  
  const networkConfig = NETWORK_CONFIG[deploymentInfo.network];
  if (!networkConfig) {
    throw new ConfigurationError(
      `Unsupported network: ${deploymentInfo.network}`,
      { availableNetworks: Object.keys(NETWORK_CONFIG) }
    );
  }
  
  return {
    contractAddress: deploymentInfo.regulatoryManagement,
    rpcUrl: networkConfig.rpcUrl
  };
}

/**
 * Validate and parse environment variables
 */
export function validateEnvironment(): EnvironmentConfig {
  const errors: string[] = [];

  // Required environment variables
  const requiredVars = [
    'TRUVERA_API_URL',
    'TRUVERA_API_KEY',
  ];

  // Check for required variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Validate TRUVERA_API_URL format
  if (process.env.TRUVERA_API_URL) {
    try {
      new URL(process.env.TRUVERA_API_URL);
    } catch {
      errors.push('TRUVERA_API_URL must be a valid URL');
    }
  }

  // Validate TRUVERA_API_KEY format (basic check)
  if (process.env.TRUVERA_API_KEY) {
    const apiKey = process.env.TRUVERA_API_KEY.trim();
    if (apiKey.length < 10) {
      errors.push('TRUVERA_API_KEY appears to be too short (minimum 10 characters)');
    }
  }

  // Validate PORT if provided
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push('PORT must be a valid port number (1-65535)');
    }
  }

  // Validate FRONTEND_URL if provided
  if (process.env.FRONTEND_URL) {
    try {
      new URL(process.env.FRONTEND_URL);
    } catch {
      errors.push('FRONTEND_URL must be a valid URL');
    }
  }

  // Validate BLOCKCHAIN_ENABLED
  if (process.env.BLOCKCHAIN_ENABLED) {
    const enabled = process.env.BLOCKCHAIN_ENABLED.toLowerCase();
    if (!['true', 'false'].includes(enabled)) {
      errors.push('BLOCKCHAIN_ENABLED must be "true" or "false"');
    }
  }

  // Validate blockchain configuration if blockchain is enabled
  if (process.env.BLOCKCHAIN_ENABLED?.toLowerCase() === 'true') {
    if (!process.env.ACCOUNT_PRIVATE_KEY) {
      errors.push('ACCOUNT_PRIVATE_KEY is required when blockchain is enabled');
    } else if (!/^(0x)?[a-fA-F0-9]{64}$/.test(process.env.ACCOUNT_PRIVATE_KEY)) {
      errors.push('ACCOUNT_PRIVATE_KEY must be a valid private key');
    }

    // Validate deployment-info.json exists and is readable
    try {
      getBlockchainConfigFromDeployment();
    } catch (error) {
      if (error instanceof ConfigurationError) {
        errors.push(`Deployment configuration error: ${error.message}`);
      } else {
        errors.push('Failed to load blockchain configuration from deployment-info.json');
      }
    }
  }

  // Throw error if validation failed
  if (errors.length > 0) {
    throw new ConfigurationError(
      'Environment validation failed',
      { errors }
    );
  }

  // Return validated configuration
  const blockchainEnabled = process.env.BLOCKCHAIN_ENABLED?.toLowerCase() === 'true';
  
  let blockchainConfig = {
    smartContractAddress: undefined as string | undefined,
    blockchainRpcUrl: undefined as string | undefined,
  };

  // Get blockchain configuration from deployment-info.json if blockchain is enabled
  if (blockchainEnabled) {
    try {
      const deploymentConfig = getBlockchainConfigFromDeployment();
      blockchainConfig = {
        smartContractAddress: deploymentConfig.contractAddress,
        blockchainRpcUrl: deploymentConfig.rpcUrl,
      };
    } catch (error) {
      // This should have been caught in validation above, but just in case
      console.warn('Failed to load blockchain configuration:', error);
    }
  }
  
  return {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    truveraApiUrl: process.env.TRUVERA_API_URL!,
    truveraApiKey: process.env.TRUVERA_API_KEY!,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    blockchainEnabled,
    smartContractAddress: blockchainConfig.smartContractAddress,
    accountPrivateKey: process.env.ACCOUNT_PRIVATE_KEY,
    blockchainRpcUrl: blockchainConfig.blockchainRpcUrl,
  };
}

/**
 * Log configuration (without sensitive data)
 */
export function logConfiguration(config: EnvironmentConfig): void {
  console.log('Server Configuration:');
  console.log(`  Port: ${config.port}`);
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Truvera API URL: ${config.truveraApiUrl}`);
  console.log(`  Truvera API Key: ${config.truveraApiKey.substring(0, 8)}...`);
  console.log(`  Frontend URL: ${config.frontendUrl}`);
  console.log(`  Blockchain Integration: ${config.blockchainEnabled ? 'Enabled' : 'Disabled'}`);
  
  if (config.blockchainEnabled) {
    console.log(`  Smart Contract Address: ${config.smartContractAddress} (from deployment-info.json)`);
    console.log(`  Blockchain RPC URL: ${config.blockchainRpcUrl} (from deployment-info.json)`);
    console.log(`  Account Private Key: ${config.accountPrivateKey?.substring(0, 8)}... (from environment)`);
  }
}