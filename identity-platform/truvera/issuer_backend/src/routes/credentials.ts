import { Router, Request, Response } from 'express';
import { credentialService, sessionService } from '../services';
import { createSuccessResponse, createErrorResponse, logger } from '../middleware';
import { 
  asyncHandler, 
  ValidationError, 
  BusinessLogicError
} from '../middleware/errorHandler';
import { CredentialFormData, ProcessStep } from '../types';

const router = Router();

/**
 * Submit credential form data
 */
router.post('/form', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, formData } = req.body;

  // Validate required parameters
  if (!sessionId) {
    throw new ValidationError('Session ID is required for form submission');
  }

  if (!formData) {
    throw new ValidationError('Form data is required for submission');
  }

  // Validate form data structure and content
  const validation = credentialService.validateFormData(formData as CredentialFormData);

  if (!validation.isValid) {
    throw new ValidationError(
      'Form validation failed. Please correct the errors and try again.',
      {
        errors: validation.errors,
        errorCount: Object.keys(validation.errors).length,
        invalidFields: Object.keys(validation.errors)
      }
    );
  }

  logger.info('Form data submitted for processing', {
    sessionId,
    firstName: formData.firstName,
    lastName: formData.lastName,
    nic: formData.nic,
    country: formData.country,
    investorType: formData.investorType,
    kycLevel: formData.kycLevel,
    hasEmail: !!formData.email,
    amlStatus: formData.amlStatus
  });

  // Store form data in session
  const result = await credentialService.storeFormData({
    sessionId,
    formData: formData as CredentialFormData,
  });

  if (!result.success) {
    throw new BusinessLogicError(
      `Failed to store form data: ${result.message}`,
      { sessionId, originalMessage: result.message }
    );
  }

  res.json(createSuccessResponse({
    message: 'Form data stored successfully',
    nextStep: 'qr_generation',
    sessionId,
    formSummary: {
      firstName: formData.firstName,
      lastName: formData.lastName,
      nic: formData.nic,
      country: formData.country,
      investorType: formData.investorType,
      kycLevel: formData.kycLevel
    }
  }));
}));

/**
 * Issue credential
 */
router.post('/issue', async (req: Request, res: Response) => {
  try {
    const { sessionId, formData } = req.body;

    if (!sessionId) {
      return res.status(400).json(createErrorResponse(
        'MISSING_SESSION_ID',
        'Session ID is required'
      ));
    }

    if (!formData) {
      return res.status(400).json(createErrorResponse(
        'MISSING_FORM_DATA',
        'Form data is required'
      ));
    }

    // Validate form data
    const validation = credentialService.validateFormData(formData as CredentialFormData);

    if (!validation.isValid) {
      return res.status(400).json(createErrorResponse(
        'INVALID_FORM_DATA',
        'Form validation failed',
        validation.errors
      ));
    }

    logger.info('Issuing credential', {
      sessionId,
      firstName: formData.firstName,
      lastName: formData.lastName,
      nic: formData.nic,
      country: formData.country,
      investorType: formData.investorType,
      kycLevel: formData.kycLevel
    });

    const result = await credentialService.issueCredential({
      sessionId,
      formData: formData as CredentialFormData,
    });

    if (!result.success) {
      return res.status(400).json(createErrorResponse(
        'CREDENTIAL_ISSUANCE_FAILED',
        result.message
      ));
    }

    res.json(createSuccessResponse({
      credentialId: result.credentialId,
      status: result.status,
      message: result.message,
    }));
  } catch (error) {
    logger.error('Failed to issue credential', {
      sessionId: req.body.sessionId,
      error
    });
    res.status(500).json(createErrorResponse(
      'CREDENTIAL_ISSUANCE_ERROR',
      'Internal error while issuing credential'
    ));
  }
});

/**
 * Get credential status (rate limiting removed - frontend handles 5-second intervals)
 */
router.get('/status/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    logger.debug('Getting credential status', { sessionId });

    // First check if session exists
    const session = sessionService.getSession(sessionId);
    if (!session) {
      return res.status(404).json(createErrorResponse(
        'SESSION_NOT_FOUND',
        'Session not found or expired',
        { sessionId }
      ));
    }

    const result = await credentialService.getCredentialStatus(sessionId);

    if (!result.success) {
      return res.status(400).json(createErrorResponse(
        'CREDENTIAL_STATUS_FAILED',
        result.message,
        { 
          sessionId,
          currentStep: session.currentStep,
          hasCredentialId: !!session.credentialId,
          hasIssuerId: !!session.issuerId
        }
      ));
    }

    res.json(createSuccessResponse({
      sessionId,
      status: result.status,
      deliveryStatus: result.deliveryStatus,
      message: result.message,
      details: result.details,
      currentStep: session.currentStep,
      credentialId: session.credentialId,
      issuerId: session.issuerId,
      lastUpdated: new Date().toISOString()
    }));
  } catch (error) {
    logger.error('Failed to get credential status', {
      sessionId: req.params.sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json(createErrorResponse(
      'CREDENTIAL_STATUS_ERROR',
      'Internal error while getting credential status. Please try again.'
    ));
  }
});

/**
 * Get comprehensive credential delivery status
 * This endpoint provides detailed information about the credential delivery process
 * using multiple API checks as demonstrated in the test script
 */
router.get('/status/:sessionId/comprehensive', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  logger.info('Getting comprehensive credential delivery status', { sessionId });

  // First check if session exists
  const session = sessionService.getSession(sessionId);
  if (!session) {
    throw new ValidationError('Session not found or expired', { sessionId });
  }

  const result = await credentialService.getComprehensiveCredentialStatus(sessionId);

  if (!result.success) {
    throw new BusinessLogicError(
      `Failed to get comprehensive credential status: ${result.message}`,
      { sessionId, originalMessage: result.message }
    );
  }

  res.json(createSuccessResponse({
    message: result.message,
    data: result.data,
    apiInfo: {
      description: 'Comprehensive status check using multiple Truvera APIs',
      apisUsed: [
        'GET /openid/issuers/{id} - Primary status check',
        'GET /jobs/{id} - Job status if available',
        'GET /credentials/{id} - Credential metadata if available',
        'GET /credentials - Recent activity context'
      ],
      statusInterpretation: {
        'issuer exists + 200': 'Credential not yet claimed',
        'issuer 404': 'Credential successfully delivered (expected)',
        'job status': 'Additional blockchain operation context',
        'recommendations': 'Actionable next steps for implementation'
      }
    }
  }));
}));

/**
 * Validate form data (for real-time validation)
 */
router.post('/validate', (req: Request, res: Response) => {
  try {
    const { formData, fieldName } = req.body;

    if (!formData) {
      return res.status(400).json(createErrorResponse(
        'MISSING_FORM_DATA',
        'Form data is required for validation'
      ));
    }

    const validation = credentialService.validateFormData(formData as CredentialFormData);

    // If fieldName is provided, return validation for specific field only
    if (fieldName && typeof fieldName === 'string') {
      const fieldError = validation.errors[fieldName];
      res.json(createSuccessResponse({
        field: fieldName,
        isValid: !fieldError,
        error: fieldError || null,
      }));
    } else {
      // Return full validation results
      res.json(createSuccessResponse({
        isValid: validation.isValid,
        errors: validation.errors,
        errorCount: Object.keys(validation.errors).length,
        validFields: Object.keys(formData).filter(key => !validation.errors[key]),
        invalidFields: Object.keys(validation.errors),
      }));
    }
  } catch (error) {
    logger.error('Failed to validate form data', {
      error,
      hasFormData: !!req.body.formData,
      fieldName: req.body.fieldName
    });
    res.status(500).json(createErrorResponse(
      'VALIDATION_ERROR',
      'Internal error while validating form data'
    ));
  }
});

/**
 * Generate QR code for credential offer
 */
router.post('/qr-generate', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json(createErrorResponse(
        'MISSING_SESSION_ID',
        'Session ID is required for QR code generation'
      ));
    }

    // Check if session exists
    const session = sessionService.getSession(sessionId);
    if (!session) {
      return res.status(404).json(createErrorResponse(
        'SESSION_NOT_FOUND',
        'Session not found or expired',
        { sessionId }
      ));
    }

    logger.info('Generating credential offer QR code', { 
      sessionId,
      currentStep: session.currentStep,
      hasFormData: !!session.formData
    });

    const result = await credentialService.generateCredentialOfferQR(sessionId);

    if (!result.success) {
      return res.status(400).json(createErrorResponse(
        'CREDENTIAL_OFFER_GENERATION_FAILED',
        result.message,
        { 
          sessionId,
          currentStep: session.currentStep,
          hasFormData: !!session.formData,
          hasWalletAddress: !!session.walletAddress
        }
      ));
    }

    res.json(createSuccessResponse({
      sessionId,
      connectionId: result.connectionId,
      credentialOfferUrl: result.credentialOfferUrl,
      qrCodeData: result.qrCodeData,
      qrCodeImage: result.qrCodeImage,
      message: result.message,
      nextStep: 'wallet_pairing',
      generatedAt: new Date().toISOString()
    }));
  } catch (error) {
    logger.error('Failed to generate credential offer QR code', {
      sessionId: req.body.sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json(createErrorResponse(
      'CREDENTIAL_OFFER_QR_ERROR',
      'Internal error while generating credential offer QR code. Please try again.'
    ));
  }
});

/**
 * Create credential offer with complete workflow (form data + QR generation)
 */
router.post('/create-offer', async (req: Request, res: Response) => {
  try {
    const { sessionId, formData } = req.body;

    if (!sessionId) {
      return res.status(400).json(createErrorResponse(
        'MISSING_SESSION_ID',
        'Session ID is required'
      ));
    }

    if (!formData) {
      return res.status(400).json(createErrorResponse(
        'MISSING_FORM_DATA',
        'Form data is required'
      ));
    }

    logger.info('Creating credential offer with complete workflow', {
      sessionId,
      firstName: formData.firstName,
      lastName: formData.lastName,
      nic: formData.nic,
      country: formData.country,
      investorType: formData.investorType,
      kycLevel: formData.kycLevel
    });

    const result = await credentialService.createCredentialOfferWithQR(
      sessionId,
      formData as CredentialFormData
    );

    if (!result.success) {
      return res.status(400).json(createErrorResponse(
        'CREDENTIAL_OFFER_CREATION_FAILED',
        result.message
      ));
    }

    res.json(createSuccessResponse({
      connectionId: result.connectionId,
      credentialOfferUrl: result.credentialOfferUrl,
      qrCodeData: result.qrCodeData,
      qrCodeImage: result.qrCodeImage,
      message: result.message,
      nextStep: 'wallet_pairing',
    }));
  } catch (error) {
    logger.error('Failed to create credential offer with complete workflow', {
      sessionId: req.body.sessionId,
      error
    });
    res.status(500).json(createErrorResponse(
      'CREDENTIAL_OFFER_CREATION_ERROR',
      'Internal error while creating credential offer'
    ));
  }
});

/**
 * Get operation summary for a session
 */
router.get('/summary/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    logger.debug('Getting operation summary', { sessionId });

    // Get session details
    const session = sessionService.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json(createErrorResponse(
        'SESSION_NOT_FOUND',
        'Session not found or expired'
      ));
    }

    // Get credential status if available
    let credentialStatus = null;
    if (session.credentialId || session.issuerId) {
      const statusResult = await credentialService.getCredentialStatus(sessionId);
      if (statusResult.success) {
        credentialStatus = {
          status: statusResult.status,
          deliveryStatus: statusResult.deliveryStatus,
          message: statusResult.message
        };
      }
    }

    // Build operation summary
    const summary = {
      sessionId: session.sessionId,
      currentStep: session.currentStep,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      
      // Connection details
      walletAddress: session.walletAddress,
      connectionId: session.connectionId,
      holderDID: session.holderDID,
      
      // Issuance details
      issuerId: session.issuerId,
      credentialId: session.credentialId,
      
      // Form data summary (without sensitive info)
      formData: session.formData ? {
        firstName: session.formData.firstName,
        lastName: session.formData.lastName,
        nic: session.formData.nic,
        country: session.formData.country,
        investorType: session.formData.investorType,
        kycLevel: session.formData.kycLevel,
        hasEmail: !!session.formData.email,
        hasWalletAddress: !!session.formData.walletAddress,
        amlStatus: session.formData.amlStatus
      } : null,
      
      // Credential status
      credentialStatus,
      
      // Progress indicators
      progress: {
        walletConnected: !!session.walletAddress,
        formSubmitted: !!session.formData,
        qrGenerated: !!session.connectionId,
        walletPaired: !!session.holderDID,
        credentialIssued: !!session.credentialId,
        completed: session.currentStep === ProcessStep.COMPLETION
      }
    };

    res.json(createSuccessResponse(summary));
  } catch (error) {
    logger.error('Failed to get operation summary', {
      sessionId: req.params.sessionId,
      error
    });
    res.status(500).json(createErrorResponse(
      'SUMMARY_RETRIEVAL_ERROR',
      'Internal error while retrieving operation summary'
    ));
  }
});

/**
 * Get process statistics (for monitoring)
 */
router.get('/admin/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await credentialService.getProcessStatistics();

    res.json(createSuccessResponse(stats));
  } catch (error) {
    logger.error('Failed to get process statistics', error);
    res.status(500).json(createErrorResponse(
      'STATS_RETRIEVAL_FAILED',
      'Failed to retrieve process statistics'
    ));
  }
});

export default router;