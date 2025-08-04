import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getVerificationService } from '../services/verificationService';
import { getBlockchainService } from '../services/blockchainService';
import { 
  ApiResponse, 
  CredentialPresentation, 
  VerificationResult,
  BlockchainRegistrationResult
} from '../types';

const router = Router();

/**
 * Validation middleware for verification requests
 */
function validateVerificationRequest(req: Request, res: Response, next: Function) {
  const { presentation, proofRequestId } = req.body;

  if (!presentation) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'MISSING_PRESENTATION',
        message: 'Presentation is required for verification'
      },
      timestamp: new Date().toISOString()
    };
    res.status(400).json(response);
    return;
  }

  // Validate presentation structure
  const verificationService = getVerificationService();
  const validation = verificationService.validatePresentationStructure(presentation);
  
  if (!validation.valid) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INVALID_PRESENTATION',
        message: 'Invalid presentation structure',
        details: { errors: validation.errors }
      },
      timestamp: new Date().toISOString()
    };
    res.status(400).json(response);
    return;
  }

  // Validate proofRequestId if provided
  if (proofRequestId && (typeof proofRequestId !== 'string' || proofRequestId.trim().length === 0)) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INVALID_PROOF_REQUEST_ID',
        message: 'Proof request ID must be a non-empty string if provided'
      },
      timestamp: new Date().toISOString()
    };
    res.status(400).json(response);
    return;
  }

  next();
}

/**
 * POST /api/verify
 * Verify a credential presentation
 */
router.post('/', validateVerificationRequest, async (req: Request, res: Response) => {
  const sessionId = uuidv4();
  
  try {
    const { presentation, proofRequestId } = req.body;
    
    console.log(`Starting verification session: ${sessionId}`);
    console.log(`Presentation contains ${presentation.credentials.length} credentials`);
    if (proofRequestId) {
      console.log(`Associated with proof request: ${proofRequestId}`);
    }

    // Get verification service
    const verificationService = getVerificationService();

    // Perform verification
    const verificationResult = await verificationService.verifyPresentation({
      presentation: presentation as CredentialPresentation,
      proofRequestId
    });

    console.log(`Verification completed for session ${sessionId}: ${verificationResult.verified ? 'VERIFIED' : 'FAILED'}`);

    // Try to register user on blockchain if verification was successful
    let blockchainRegistration: BlockchainRegistrationResult = {
      attempted: false,
      success: false,
      status: 'failed',
      userFriendlyMessage: 'Blockchain registration not attempted'
    };

    if (verificationResult.verified) {
      // Extract user info before blockchain call for logging
      let userType: number | undefined = undefined;
      let ssiIdentifier: string | undefined = undefined;
      let walletAddress: string | undefined = undefined;
      
      try {
        const verifiedCredential = verificationResult.results.find(result => result.verified);
        if (verifiedCredential) {
          // Extract wallet address
          const credentialSubject = verifiedCredential.credential.credentialSubject;
          walletAddress = credentialSubject?.walletAddress || 
                         credentialSubject?.wallet || 
                         credentialSubject?.address || 
                         credentialSubject?.ethAddress ||
                         credentialSubject?.ethereumAddress;
          
          // Extract SSI identifier
          if (verifiedCredential.credential.credentialSubject?.id) {
            ssiIdentifier = verifiedCredential.credential.credentialSubject.id;
          } else if (verificationResult.presentation.holder) {
            ssiIdentifier = verificationResult.presentation.holder;
          } else if (verifiedCredential.credential.id) {
            ssiIdentifier = verifiedCredential.credential.id;
          }
          
          // Determine user type (simplified version of blockchain service logic)
          if (credentialSubject?.organizationName || 
              credentialSubject?.companyName || 
              credentialSubject?.businessName || 
              credentialSubject?.entityType === 'organization' ||
              credentialSubject?.entityType === 'company' ||
              credentialSubject?.investorType === 'Company') {
            userType = 1; // COMPANY
          } else {
            userType = 0; // INDIVIDUAL
          }
        }
      } catch (extractError) {
        console.warn(`Failed to extract user info for session ${sessionId}:`, extractError);
      }

      try {
        blockchainRegistration.attempted = true;
        const blockchainService = getBlockchainService();

        const blockchainResult = await blockchainService.registerUserOnBlockchain(
          verificationResult,
          sessionId
        );
        
        blockchainRegistration = {
          attempted: true,
          success: blockchainResult.success,
          status: blockchainResult.status,
          transactionHash: blockchainResult.transactionHash,
          transactionDetails: blockchainResult.transactionInfo ? {
            transactionHash: blockchainResult.transactionInfo.transactionHash,
            blockNumber: blockchainResult.transactionInfo.blockNumber,
            blockHash: blockchainResult.transactionInfo.blockHash,
            gasUsed: blockchainResult.transactionInfo.gasUsed,
            effectiveGasPrice: blockchainResult.transactionInfo.effectiveGasPrice,
            explorerUrl: blockchainResult.transactionInfo.explorerUrl,
            networkName: blockchainResult.transactionInfo.networkName,
            chainId: blockchainResult.transactionInfo.chainId
          } : undefined,
          error: blockchainResult.success ? undefined : blockchainResult.error,
          alreadyRegistered: blockchainResult.alreadyRegistered,
          userFriendlyMessage: blockchainResult.userFriendlyMessage,
          userType: userType,
          ssiIdentifier: ssiIdentifier,
          walletAddress: walletAddress
        };
        
        if (blockchainResult.success) {
          if (blockchainResult.status === 'already_registered') {
            console.log(`✅ User already registered on blockchain for session: ${sessionId}`);
            console.log(`   Status: ALREADY_REGISTERED`);
            console.log(`   Wallet: ${walletAddress}, User type: ${userType}, SSI: ${ssiIdentifier}`);
          } else if (blockchainResult.status === 'newly_registered') {
            console.log(`✅ User registered on blockchain successfully for session: ${sessionId}`);
            console.log(`   Status: NEWLY_REGISTERED`);
            console.log(`   Transaction hash: ${blockchainResult.transactionHash}`);
            console.log(`   Wallet: ${walletAddress}, User type: ${userType}, SSI: ${ssiIdentifier}`);
          }
        } else {
          console.warn(`❌ Blockchain registration failed for session ${sessionId}`);
          console.warn(`   Status: FAILED`);
          console.warn(`   Error: ${blockchainResult.userFriendlyMessage || blockchainResult.error}`);
        }
      } catch (error) {
        // Don't fail the verification if blockchain registration fails
        console.error(`Blockchain registration error for session ${sessionId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown blockchain error';
        blockchainRegistration = {
          attempted: true,
          success: false,
          status: 'failed',
          error: errorMessage,
          userFriendlyMessage: errorMessage,
          userType: userType,
          ssiIdentifier: ssiIdentifier,
          walletAddress: walletAddress
        };
      }
    }

    // Add blockchain registration status to verification result
    const enhancedVerificationResult = {
      ...verificationResult,
      blockchainRegistration
    };

    const response: ApiResponse<VerificationResult> = {
      success: true,
      data: enhancedVerificationResult,
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error(`Verification failed for session ${sessionId}:`, error);

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'VERIFICATION_FAILED',
        message: error instanceof Error ? error.message : 'Verification process failed',
        details: error instanceof Error ? { stack: error.stack } : error
      },
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

/**
 * POST /api/verify/batch
 * Verify multiple presentations in batch
 */
router.post('/batch', async (req: Request, res: Response) => {
  const batchId = uuidv4();
  
  try {
    const { presentations } = req.body;

    if (!presentations || !Array.isArray(presentations) || presentations.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_BATCH_REQUEST',
          message: 'Presentations array is required and must not be empty'
        },
        timestamp: new Date().toISOString()
      };
      res.status(400).json(response);
      return;
    }

    console.log(`Starting batch verification: ${batchId} with ${presentations.length} presentations`);

    const verificationService = getVerificationService();
    const results: VerificationResult[] = [];

    // Process each presentation
    for (let i = 0; i < presentations.length; i++) {
      const sessionId = `${batchId}-${i}`;
      
      try {
        const { presentation, proofRequestId } = presentations[i];
        
        // Validate presentation structure
        const validation = verificationService.validatePresentationStructure(presentation);
        if (!validation.valid) {
          throw new Error(`Invalid presentation structure: ${validation.errors.join(', ')}`);
        }

        // Perform verification
        const result = await verificationService.verifyPresentation({
          presentation: presentation as CredentialPresentation,
          proofRequestId
        });

        // Try blockchain registration for verified results
        let blockchainRegistration: BlockchainRegistrationResult = {
          attempted: false,
          success: false,
          status: 'failed',
          userFriendlyMessage: 'Blockchain registration not attempted'
        };

        if (result.verified) {
          try {
            blockchainRegistration.attempted = true;
            const blockchainService = getBlockchainService();
            const blockchainResult = await blockchainService.registerUserOnBlockchain(
              result,
              sessionId
            );
            
            blockchainRegistration = {
              attempted: true,
              success: blockchainResult.success,
              status: blockchainResult.status,
              transactionHash: blockchainResult.transactionHash,
              transactionDetails: blockchainResult.transactionInfo ? {
                transactionHash: blockchainResult.transactionInfo.transactionHash,
                blockNumber: blockchainResult.transactionInfo.blockNumber,
                blockHash: blockchainResult.transactionInfo.blockHash,
                gasUsed: blockchainResult.transactionInfo.gasUsed,
                effectiveGasPrice: blockchainResult.transactionInfo.effectiveGasPrice,
                explorerUrl: blockchainResult.transactionInfo.explorerUrl,
                networkName: blockchainResult.transactionInfo.networkName,
                chainId: blockchainResult.transactionInfo.chainId
              } : undefined,
              error: blockchainResult.success ? undefined : blockchainResult.error,
              alreadyRegistered: blockchainResult.alreadyRegistered,
              userFriendlyMessage: blockchainResult.userFriendlyMessage
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown blockchain error';
            blockchainRegistration = {
              attempted: true,
              success: false,
              status: 'failed',
              error: errorMessage,
              userFriendlyMessage: errorMessage
            };
          }
        }

        // Add blockchain registration status to result
        const enhancedResult = {
          ...result,
          blockchainRegistration
        };

        results.push(enhancedResult);
        
        console.log(`Batch item ${i} completed for ${batchId}: ${result.verified ? 'VERIFIED' : 'FAILED'}`);

      } catch (error) {
        console.error(`Batch item ${i} failed for ${batchId}:`, error);
        
        // Create a failed result for this presentation
        const failedResult: VerificationResult = {
          verified: false,
          partiallyVerified: false,
          results: [],
          presentation: presentations[i].presentation || { holder: '', credentials: [] },
          timestamp: new Date().toISOString(),
          blockchainRegistration: {
            attempted: false,
            success: false,
            status: 'failed',
            error: 'Verification failed, blockchain registration not attempted',
            userFriendlyMessage: 'Verification failed, blockchain registration not attempted'
          }
        };
        
        results.push(failedResult);
      }
    }

    console.log(`Batch verification completed: ${batchId}`);

    const response: ApiResponse<VerificationResult[]> = {
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error(`Batch verification failed for ${batchId}:`, error);

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'BATCH_VERIFICATION_FAILED',
        message: error instanceof Error ? error.message : 'Batch verification process failed',
        details: error instanceof Error ? { stack: error.stack } : error
      },
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

export default router;