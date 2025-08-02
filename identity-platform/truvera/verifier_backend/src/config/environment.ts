import { ConfigurationError } from '../middleware/errorHandler';

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
    if (!process.env.SMART_CONTRACT_ADDRESS) {
      errors.push('SMART_CONTRACT_ADDRESS is required when blockchain is enabled');
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(process.env.SMART_CONTRACT_ADDRESS)) {
      errors.push('SMART_CONTRACT_ADDRESS must be a valid Ethereum address');
    }

    if (!process.env.ACCOUNT_PRIVATE_KEY) {
      errors.push('ACCOUNT_PRIVATE_KEY is required when blockchain is enabled');
    } else if (!/^(0x)?[a-fA-F0-9]{64}$/.test(process.env.ACCOUNT_PRIVATE_KEY)) {
      errors.push('ACCOUNT_PRIVATE_KEY must be a valid private key');
    }

    if (!process.env.BLOCKCHAIN_RPC_URL) {
      errors.push('BLOCKCHAIN_RPC_URL is required when blockchain is enabled');
    } else {
      try {
        new URL(process.env.BLOCKCHAIN_RPC_URL);
      } catch {
        errors.push('BLOCKCHAIN_RPC_URL must be a valid URL');
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
  
  return {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    truveraApiUrl: process.env.TRUVERA_API_URL!,
    truveraApiKey: process.env.TRUVERA_API_KEY!,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    blockchainEnabled,
    smartContractAddress: process.env.SMART_CONTRACT_ADDRESS,
    accountPrivateKey: process.env.ACCOUNT_PRIVATE_KEY,
    blockchainRpcUrl: process.env.BLOCKCHAIN_RPC_URL,
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
    console.log(`  Smart Contract Address: ${config.smartContractAddress}`);
    console.log(`  Blockchain RPC URL: ${config.blockchainRpcUrl}`);
    console.log(`  Account Private Key: ${config.accountPrivateKey?.substring(0, 8)}...`);
  }
}