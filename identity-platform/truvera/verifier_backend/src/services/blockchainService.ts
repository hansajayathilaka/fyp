import { ethers } from 'ethers';
import { VerificationResult, VerifiableCredential } from '../types';

export interface BlockchainConfig {
  enabled: boolean;
  contractAddress: string;
  privateKey: string;
  rpcUrl: string;
}

export enum UserType {
  INDIVIDUAL = 0,
  ORGANIZATION = 1,
  GOVERNMENT = 2,
  ACADEMIC = 3
}

export interface BlockchainActionResponse {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export class BlockchainService {
  private provider!: ethers.JsonRpcProvider;
  private wallet!: ethers.Wallet;
  private contract!: ethers.Contract;
  private config: BlockchainConfig;

  // Smart contract ABI for the registerUserByAdmin function
  private readonly contractABI = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "walletAddress",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "ssiIdentifier",
          "type": "string"
        },
        {
          "internalType": "enum UserType",
          "name": "userType",
          "type": "uint8"
        }
      ],
      "name": "registerUserByAdmin",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];

  constructor(config: BlockchainConfig) {
    this.config = config;
    
    if (!config.enabled) {
      console.log('Blockchain service is disabled');
      return;
    }

    try {
      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
      
      // Initialize wallet
      this.wallet = new ethers.Wallet(config.privateKey, this.provider);
      
      // Initialize contract
      this.contract = new ethers.Contract(
        config.contractAddress,
        this.contractABI,
        this.wallet
      );

      console.log('Blockchain service initialized successfully');
      console.log(`Contract address: ${config.contractAddress}`);
      console.log(`Wallet address: ${this.wallet.address}`);
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  /**
   * Register user on blockchain after successful verification
   */
  async registerUserOnBlockchain(
    verificationResult: VerificationResult,
    sessionId: string
  ): Promise<BlockchainActionResponse> {
    if (!this.config.enabled) {
      console.log('Blockchain integration is disabled');
      return {
        success: true,
        error: 'Blockchain integration disabled'
      };
    }

    try {
      console.log(`Registering user on blockchain for session: ${sessionId}`);

      // Extract wallet address, SSI identifier and user type from the verification result
      const { walletAddress, ssiIdentifier, userType } = this.extractUserInfo(verificationResult);

      console.log(`Extracted user info - Wallet: ${walletAddress}, SSI: ${ssiIdentifier}, Type: ${userType}`);

      // Call the smart contract registerUserByAdmin function
      const transaction = await this.contract.registerUserByAdmin(walletAddress, ssiIdentifier, userType);
      
      console.log(`Transaction submitted: ${transaction.hash}`);
      
      // Wait for transaction confirmation
      const receipt = await transaction.wait();
      
      console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: transaction.hash
      };

    } catch (error) {
      console.error(`Blockchain registration failed for session ${sessionId}:`, error);
      
      return {
        success: false,
        error: this.parseBlockchainError(error)
      };
    }
  }

  /**
   * Extract wallet address, SSI identifier and user type from verification result
   */
  private extractUserInfo(verificationResult: VerificationResult): { walletAddress: string; ssiIdentifier: string; userType: UserType } {
    // Get the first verified credential
    const verifiedCredential = verificationResult.results.find(result => result.verified);
    
    if (!verifiedCredential) {
      throw new Error('No verified credential found in verification result');
    }

    const credential = verifiedCredential.credential;
    
    // Extract wallet address from credential
    const walletAddress = this.extractWalletAddress(credential);
    
    // Extract SSI identifier from credential subject or holder
    const ssiIdentifier = this.extractSSIIdentifier(credential, verificationResult.presentation.holder);
    
    // Extract user type from credential
    const userType = this.extractUserType(credential);

    return { walletAddress, ssiIdentifier, userType };
  }

  /**
   * Extract wallet address from credential
   */
  private extractWalletAddress(credential: VerifiableCredential): string {
    const credentialSubject = credential.credentialSubject;
    
    if (!credentialSubject) {
      throw new Error('No credential subject found to extract wallet address');
    }

    // Try different possible field names for wallet address
    const walletAddress = credentialSubject.walletAddress || 
                         credentialSubject.wallet || 
                         credentialSubject.address || 
                         credentialSubject.ethAddress ||
                         credentialSubject.ethereumAddress;

    if (!walletAddress) {
      throw new Error('Could not extract wallet address from credential subject');
    }

    // Validate that it's a valid Ethereum address
    if (typeof walletAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      throw new Error(`Invalid wallet address format: ${walletAddress}`);
    }

    return walletAddress;
  }

  /**
   * Extract SSI identifier from credential
   */
  private extractSSIIdentifier(credential: VerifiableCredential, holder: string): string {
    // Try to get SSI identifier from credential subject
    if (credential.credentialSubject?.id) {
      return credential.credentialSubject.id;
    }
    
    // Fallback to holder if available
    if (holder) {
      return holder;
    }
    
    // Fallback to credential ID
    if (credential.id) {
      return credential.id;
    }
    
    throw new Error('Could not extract SSI identifier from credential');
  }

  /**
   * Extract user type from credential based on credential subject data
   */
  private extractUserType(credential: VerifiableCredential): UserType {
    const credentialSubject = credential.credentialSubject;
    
    if (!credentialSubject) {
      console.warn('No credential subject found, defaulting to INDIVIDUAL');
      return UserType.INDIVIDUAL;
    }

    // Check for organization indicators
    if (credentialSubject.organizationName || 
        credentialSubject.companyName || 
        credentialSubject.businessName ||
        credentialSubject.entityType === 'organization') {
      return UserType.ORGANIZATION;
    }

    // Check for government indicators
    if (credentialSubject.governmentId || 
        credentialSubject.governmentAgency ||
        credentialSubject.entityType === 'government') {
      return UserType.GOVERNMENT;
    }

    // Check for academic indicators
    if (credentialSubject.institutionName || 
        credentialSubject.academicInstitution ||
        credentialSubject.entityType === 'academic') {
      return UserType.ACADEMIC;
    }

    // Check credential type for additional hints
    if (credential.type) {
      const types = Array.isArray(credential.type) ? credential.type : [credential.type];
      
      for (const type of types) {
        const typeStr = type.toLowerCase();
        if (typeStr.includes('organization') || typeStr.includes('business')) {
          return UserType.ORGANIZATION;
        }
        if (typeStr.includes('government') || typeStr.includes('official')) {
          return UserType.GOVERNMENT;
        }
        if (typeStr.includes('academic') || typeStr.includes('education')) {
          return UserType.ACADEMIC;
        }
      }
    }

    // Default to individual
    console.log('Could not determine specific user type, defaulting to INDIVIDUAL');
    return UserType.INDIVIDUAL;
  }

  /**
   * Parse blockchain error and return user-friendly message
   */
  private parseBlockchainError(error: any): string {
    // Log the full error for debugging
    console.error('Full blockchain error details:', error);

    if (!error) {
      return 'Unknown blockchain error occurred';
    }

    // Handle ethers.js specific errors
    if (error.code) {
      switch (error.code) {
        case 'CALL_EXCEPTION':
          return 'Smart contract call failed - the transaction was reverted';
        case 'INSUFFICIENT_FUNDS':
          return 'Insufficient funds to complete the transaction';
        case 'NETWORK_ERROR':
          return 'Network connection error - please try again';
        case 'TIMEOUT':
          return 'Transaction timed out - please try again';
        case 'NONCE_EXPIRED':
          return 'Transaction nonce expired - please try again';
        case 'REPLACEMENT_UNDERPRICED':
          return 'Transaction fee too low - please try again';
        case 'UNPREDICTABLE_GAS_LIMIT':
          return 'Unable to estimate gas limit for transaction';
        case 'INVALID_ARGUMENT':
          return 'Invalid transaction parameters';
        default:
          // For other ethers codes, try to extract a meaningful message
          break;
      }
    }

    // Handle common error patterns
    const errorMessage = error.message || (typeof error === 'string' ? error : '');
    
    if (!errorMessage || errorMessage === '[object Object]') {
      return 'Blockchain transaction failed - please try again';
    }
    
    if (errorMessage.includes('transaction execution reverted')) {
      return 'Transaction was rejected by the smart contract';
    }
    
    if (errorMessage.includes('insufficient funds')) {
      return 'Insufficient funds to complete the transaction';
    }
    
    if (errorMessage.includes('gas required exceeds allowance')) {
      return 'Transaction requires more gas than allowed';
    }
    
    if (errorMessage.includes('nonce too low')) {
      return 'Transaction nonce is too low - please try again';
    }
    
    if (errorMessage.includes('nonce too high')) {
      return 'Transaction nonce is too high - please try again';
    }
    
    if (errorMessage.includes('replacement transaction underpriced')) {
      return 'Transaction fee is too low';
    }
    
    if (errorMessage.includes('already known')) {
      return 'Transaction is already pending';
    }
    
    if (errorMessage.includes('connection refused') || errorMessage.includes('network error')) {
      return 'Unable to connect to blockchain network';
    }
    
    if (errorMessage.includes('timeout')) {
      return 'Transaction timed out - please try again';
    }
    
    if (errorMessage.includes('invalid address')) {
      return 'Invalid wallet address provided';
    }
    
    if (errorMessage.includes('contract not deployed')) {
      return 'Smart contract not found at the specified address';
    }

    // If we can't parse the error, return a generic message
    // but try to extract the first meaningful part of the error
    const lines = errorMessage.split('\n');
    const firstLine = lines[0]?.trim();
    
    if (firstLine && firstLine.length < 100) {
      return `Blockchain error: ${firstLine}`;
    }
    
    return 'Blockchain transaction failed - please try again';
  }

  /**
   * Test blockchain connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.config.enabled) {
      console.log('Blockchain integration is disabled, skipping connection test');
      return true;
    }

    try {
      // Test provider connection
      const blockNumber = await this.provider.getBlockNumber();
      console.log(`Connected to blockchain, current block: ${blockNumber}`);
      
      // Test wallet balance
      const balance = await this.provider.getBalance(this.wallet.address);
      console.log(`Wallet balance: ${ethers.formatEther(balance)} ETH`);
      
      // Test contract connection (call a view function if available)
      console.log(`Contract connected at: ${this.config.contractAddress}`);
      
      return true;
    } catch (error) {
      console.error('Blockchain connection test failed:', error);
      console.error('User-friendly error:', this.parseBlockchainError(error));
      return false;
    }
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig(): Omit<BlockchainConfig, 'privateKey'> {
    const { privateKey, ...safeConfig } = this.config;
    return safeConfig;
  }

  /**
   * Update blockchain configuration
   */
  updateConfig(newConfig: Partial<BlockchainConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.enabled && this.config.enabled) {
      // Reinitialize if configuration changed
      try {
        this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
        this.wallet = new ethers.Wallet(this.config.privateKey, this.provider);
        this.contract = new ethers.Contract(
          this.config.contractAddress,
          this.contractABI,
          this.wallet
        );
        console.log('Blockchain service configuration updated and reinitialized');
      } catch (error) {
        console.error('Failed to reinitialize blockchain service after config update:', error);
        throw error;
      }
    }
  }
}

// Default configuration for blockchain integration
const DEFAULT_CONFIG: BlockchainConfig = {
  enabled: false,
  contractAddress: '',
  privateKey: '',
  rpcUrl: ''
};

// Singleton instance
let blockchainServiceInstance: BlockchainService | null = null;

export function createBlockchainService(config?: Partial<BlockchainConfig>): BlockchainService {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  blockchainServiceInstance = new BlockchainService(finalConfig);
  return blockchainServiceInstance;
}

export function getBlockchainService(): BlockchainService {
  if (!blockchainServiceInstance) {
    // Create with default config if not initialized
    blockchainServiceInstance = new BlockchainService(DEFAULT_CONFIG);
  }
  return blockchainServiceInstance;
}

export function updateBlockchainConfig(config: Partial<BlockchainConfig>): void {
  const service = getBlockchainService();
  service.updateConfig(config);
}