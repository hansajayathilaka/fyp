import { Router, Request, Response } from 'express';
import { getBlockchainService, updateBlockchainConfig, BlockchainConfig } from '../services/blockchainService';
import { ApiResponse, VerificationResult } from '../types';

const router = Router();

/**
 * Validation middleware for blockchain user registration
 */
function validateUserRegistrationRequest(req: Request, res: Response, next: Function) {
  const { verificationResult, sessionId } = req.body;

  if (!verificationResult) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'MISSING_VERIFICATION_RESULT',
        message: 'Verification result is required for user registration'
      },
      timestamp: new Date().toISOString()
    };
    res.status(400).json(response);
    return;
  }

  if (!sessionId || typeof sessionId !== 'string') {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INVALID_SESSION_ID',
        message: 'Session ID is required and must be a string'
      },
      timestamp: new Date().toISOString()
    };
    res.status(400).json(response);
    return;
  }

  if (!verificationResult.verified) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'VERIFICATION_NOT_SUCCESSFUL',
        message: 'User registration requires successful verification'
      },
      timestamp: new Date().toISOString()
    };
    res.status(400).json(response);
    return;
  }

  next();
}

/**
 * POST /api/blockchain/register-user
 * Register user on blockchain after successful verification
 */
router.post('/register-user', validateUserRegistrationRequest, async (req: Request, res: Response) => {
  try {
    const { verificationResult, sessionId } = req.body;

    console.log(`Blockchain user registration requested for session: ${sessionId}`);

    // Get blockchain service
    const blockchainService = getBlockchainService();

    // Register user on blockchain
    const result = await blockchainService.registerUserOnBlockchain(
      verificationResult as VerificationResult,
      sessionId
    );

    if (result.success) {
      console.log(`User registered on blockchain successfully for session: ${sessionId}`);
      console.log(`Transaction hash: ${result.transactionHash}`);
    } else {
      console.warn(`Blockchain registration failed for session ${sessionId}: ${result.error}`);
    }

    const response: ApiResponse = {
      success: result.success,
      data: {
        message: result.success ? 'User registered on blockchain successfully' : 'Blockchain registration failed',
        transactionHash: result.transactionHash,
        sessionId
      },
      error: result.success ? undefined : {
        code: 'BLOCKCHAIN_REGISTRATION_FAILED',
        message: result.error || 'Unknown blockchain error'
      },
      timestamp: new Date().toISOString()
    };

    res.status(result.success ? 200 : 500).json(response);

  } catch (error) {
    console.error('Blockchain registration error:', error);

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'BLOCKCHAIN_REGISTRATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to register user on blockchain',
        details: error instanceof Error ? { stack: error.stack } : error
      },
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

/**
 * GET /api/blockchain/config
 * Get current blockchain configuration (without sensitive data)
 */
router.get('/config', (req: Request, res: Response) => {
  try {
    const blockchainService = getBlockchainService();
    const config = blockchainService.getConfig();

    const response: ApiResponse = {
      success: true,
      data: config,
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('Error getting blockchain configuration:', error);

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'BLOCKCHAIN_CONFIG_GET_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get blockchain configuration',
        details: error instanceof Error ? { stack: error.stack } : error
      },
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

/**
 * PUT /api/blockchain/config
 * Update blockchain configuration
 */
router.put('/config', async (req: Request, res: Response) => {
  try {
    const { enabled, contractAddress, privateKey, rpcUrl } = req.body;

    // Validate configuration
    const errors: string[] = [];

    if (enabled !== undefined && typeof enabled !== 'boolean') {
      errors.push('enabled must be a boolean');
    }

    if (contractAddress !== undefined) {
      if (typeof contractAddress !== 'string') {
        errors.push('contractAddress must be a string');
      } else if (contractAddress && !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        errors.push('contractAddress must be a valid Ethereum address');
      }
    }

    if (privateKey !== undefined) {
      if (typeof privateKey !== 'string') {
        errors.push('privateKey must be a string');
      } else if (privateKey && !/^(0x)?[a-fA-F0-9]{64}$/.test(privateKey)) {
        errors.push('privateKey must be a valid private key');
      }
    }

    if (rpcUrl !== undefined) {
      if (typeof rpcUrl !== 'string') {
        errors.push('rpcUrl must be a string');
      } else if (rpcUrl) {
        try {
          new URL(rpcUrl);
        } catch {
          errors.push('rpcUrl must be a valid URL');
        }
      }
    }

    if (errors.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid blockchain configuration',
          details: { errors }
        },
        timestamp: new Date().toISOString()
      };
      res.status(400).json(response);
      return;
    }

    // Update configuration
    const updateConfig: Partial<BlockchainConfig> = {};
    if (enabled !== undefined) updateConfig.enabled = enabled;
    if (contractAddress !== undefined) updateConfig.contractAddress = contractAddress;
    if (privateKey !== undefined) updateConfig.privateKey = privateKey;
    if (rpcUrl !== undefined) updateConfig.rpcUrl = rpcUrl;

    updateBlockchainConfig(updateConfig);

    console.log('Blockchain configuration updated successfully');

    const response: ApiResponse = {
      success: true,
      data: { message: 'Blockchain configuration updated successfully' },
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('Error updating blockchain configuration:', error);

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'BLOCKCHAIN_CONFIG_UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update blockchain configuration',
        details: error instanceof Error ? { stack: error.stack } : error
      },
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

/**
 * GET /api/blockchain/transaction/:hash
 * Get transaction information by hash
 */
router.get('/transaction/:hash', async (req: Request, res: Response) => {
  try {
    const { hash } = req.params;

    if (!hash || !/^0x[a-fA-F0-9]{64}$/.test(hash)) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_TRANSACTION_HASH',
          message: 'Transaction hash must be a valid 64-character hex string starting with 0x'
        },
        timestamp: new Date().toISOString()
      };
      res.status(400).json(response);
      return;
    }

    console.log(`Getting transaction information for hash: ${hash}`);

    const blockchainService = getBlockchainService();
    const config = blockchainService.getConfig();

    if (!config.enabled) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'BLOCKCHAIN_DISABLED',
          message: 'Blockchain integration is disabled'
        },
        timestamp: new Date().toISOString()
      };
      res.status(503).json(response);
      return;
    }

    // Get transaction receipt and details
    const provider = blockchainService.getProvider();
    if (!provider) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'BLOCKCHAIN_NOT_INITIALIZED',
          message: 'Blockchain provider is not initialized'
        },
        timestamp: new Date().toISOString()
      };
      res.status(503).json(response);
      return;
    }

    const [transaction, receipt] = await Promise.all([
      provider.getTransaction(hash),
      provider.getTransactionReceipt(hash)
    ]);

    if (!transaction) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'TRANSACTION_NOT_FOUND',
          message: 'Transaction not found on the blockchain'
        },
        timestamp: new Date().toISOString()
      };
      res.status(404).json(response);
      return;
    }

    // Create transaction info using the service method
    const transactionInfo = receipt ? blockchainService.createTransactionInfo(hash, receipt) : null;

    const response: ApiResponse = {
      success: true,
      data: {
        transaction: {
          hash: transaction.hash,
          from: transaction.from,
          to: transaction.to,
          value: transaction.value.toString(),
          gasLimit: transaction.gasLimit.toString(),
          gasPrice: transaction.gasPrice?.toString() || '0',
          nonce: transaction.nonce,
          data: transaction.data
        },
        receipt: receipt ? {
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          gasUsed: receipt.gasUsed.toString(),
          effectiveGasPrice: (receipt as any).effectiveGasPrice?.toString() || transaction.gasPrice?.toString() || '0',
          status: receipt.status,
          logs: receipt.logs.length
        } : null,
        transactionInfo
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error(`Error getting transaction information for hash ${req.params.hash}:`, error);

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'TRANSACTION_INFO_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get transaction information',
        details: error instanceof Error ? { stack: error.stack } : error
      },
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

/**
 * POST /api/blockchain/test
 * Test blockchain connection
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    console.log('Testing blockchain connection');

    const blockchainService = getBlockchainService();
    const testResult = await blockchainService.testConnection();

    if (testResult) {
      console.log('Blockchain connection test successful');
    } else {
      console.log('Blockchain connection test failed');
    }

    const response: ApiResponse = {
      success: testResult,
      data: {
        message: testResult ? 'Blockchain connection successful' : 'Blockchain connection failed',
        connected: testResult
      },
      error: testResult ? undefined : {
        code: 'BLOCKCHAIN_CONNECTION_FAILED',
        message: 'Unable to connect to blockchain network'
      },
      timestamp: new Date().toISOString()
    };

    res.status(testResult ? 200 : 500).json(response);

  } catch (error) {
    console.error('Blockchain connection test error:', error);

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'BLOCKCHAIN_TEST_ERROR',
        message: error instanceof Error ? error.message : 'Failed to test blockchain connection',
        details: error instanceof Error ? { stack: error.stack } : error
      },
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

export default router;