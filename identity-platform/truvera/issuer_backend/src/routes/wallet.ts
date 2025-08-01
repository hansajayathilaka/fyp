import { Router, Request, Response } from 'express';
import { sessionService, credentialService } from '../services';
import { createSuccessResponse, createErrorResponse, logger } from '../middleware';

const router = Router();

/**
 * Connect MetaMask wallet
 */
router.post('/connect', (req: Request, res: Response) => {
  try {
    const { sessionId, walletAddress } = req.body;
    
    if (!sessionId) {
      return res.status(400).json(createErrorResponse(
        'MISSING_SESSION_ID',
        'Session ID is required'
      ));
    }
    
    if (!walletAddress) {
      return res.status(400).json(createErrorResponse(
        'MISSING_WALLET_ADDRESS',
        'Wallet address is required'
      ));
    }
    
    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json(createErrorResponse(
        'INVALID_WALLET_ADDRESS',
        'Invalid Ethereum wallet address format'
      ));
    }
    
    logger.info('Connecting MetaMask wallet', { 
      sessionId, 
      walletAddress: walletAddress.substring(0, 10) + '...' 
    });
    
    const session = sessionService.setWalletAddress(sessionId, walletAddress);
    
    if (!session) {
      return res.status(404).json(createErrorResponse(
        'SESSION_NOT_FOUND',
        'Session not found or expired'
      ));
    }
    
    res.json(createSuccessResponse({
      sessionId: session.sessionId,
      currentStep: session.currentStep,
      walletAddress: session.walletAddress,
      message: 'Wallet connected successfully',
    }));
  } catch (error) {
    logger.error('Failed to connect wallet', { 
      sessionId: req.body.sessionId, 
      error 
    });
    res.status(500).json(createErrorResponse(
      'WALLET_CONNECTION_FAILED',
      'Failed to connect wallet'
    ));
  }
});

/**
 * Generate QR code for Truvera wallet connection
 */
router.post('/qr-generate', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json(createErrorResponse(
        'MISSING_SESSION_ID',
        'Session ID is required'
      ));
    }
    
    logger.info('Generating QR code for wallet connection', { sessionId });
    
    const result = await credentialService.generateQRCode(sessionId);
    
    if (!result.success) {
      return res.status(400).json(createErrorResponse(
        'QR_GENERATION_FAILED',
        result.message
      ));
    }
    
    res.json(createSuccessResponse({
      connectionId: result.connectionId,
      qrCodeData: result.qrCodeData,
      qrCodeImage: result.qrCodeImage,
      invitationUrl: result.invitationUrl,
      message: result.message,
    }));
  } catch (error) {
    logger.error('Failed to generate QR code', { 
      sessionId: req.body.sessionId, 
      error 
    });
    res.status(500).json(createErrorResponse(
      'QR_GENERATION_ERROR',
      'Internal error while generating QR code'
    ));
  }
});

/**
 * Check wallet connection status
 */
router.get('/connection-status/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    logger.debug('Checking wallet connection status', { sessionId });
    
    const result = await credentialService.checkConnectionStatus(sessionId);
    
    if (!result.success) {
      return res.status(400).json(createErrorResponse(
        'CONNECTION_STATUS_FAILED',
        result.message
      ));
    }
    
    res.json(createSuccessResponse({
      status: result.status,
      holderDID: result.holderDID,
      message: result.message,
    }));
  } catch (error) {
    logger.error('Failed to check connection status', { 
      sessionId: req.params.sessionId, 
      error 
    });
    res.status(500).json(createErrorResponse(
      'CONNECTION_STATUS_ERROR',
      'Internal error while checking connection status'
    ));
  }
});

/**
 * Disconnect wallet (cleanup session)
 */
router.post('/disconnect', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json(createErrorResponse(
        'MISSING_SESSION_ID',
        'Session ID is required'
      ));
    }
    
    logger.info('Disconnecting wallet', { sessionId });
    
    const deleted = sessionService.deleteSession(sessionId);
    
    if (!deleted) {
      return res.status(404).json(createErrorResponse(
        'SESSION_NOT_FOUND',
        'Session not found'
      ));
    }
    
    res.json(createSuccessResponse({
      message: 'Wallet disconnected successfully',
    }));
  } catch (error) {
    logger.error('Failed to disconnect wallet', { 
      sessionId: req.body.sessionId, 
      error 
    });
    res.status(500).json(createErrorResponse(
      'WALLET_DISCONNECTION_FAILED',
      'Failed to disconnect wallet'
    ));
  }
});

export default router;