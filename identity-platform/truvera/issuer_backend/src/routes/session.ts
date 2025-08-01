import { Router, Request, Response } from 'express';
import { sessionService } from '../services';
import { createSuccessResponse, createErrorResponse, logger } from '../middleware';
import { ProcessStep } from '../types';

const router = Router();

/**
 * Create a new session
 */
router.post('/create', (req: Request, res: Response) => {
  try {
    logger.info('Creating new session');
    
    const session = sessionService.createSession();
    
    // Store session ID in the request session
    req.session.sessionId = session.sessionId;
    
    res.json(createSuccessResponse({
      sessionId: session.sessionId,
      currentStep: session.currentStep,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }));
  } catch (error) {
    logger.error('Failed to create session', error);
    res.status(500).json(createErrorResponse(
      'SESSION_CREATION_FAILED',
      'Failed to create session'
    ));
  }
});

/**
 * Get session by ID
 */
router.get('/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const session = sessionService.getSession(sessionId);
    
    if (!session) {
      res.status(404).json(createErrorResponse(
        'SESSION_NOT_FOUND',
        'Session not found or expired'
      ));
      return;
    }
    
    res.json(createSuccessResponse({
      sessionId: session.sessionId,
      currentStep: session.currentStep,
      walletAddress: session.walletAddress,
      connectionId: session.connectionId,
      holderDID: session.holderDID,
      issuerId: session.issuerId,
      credentialId: session.credentialId,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }));
  } catch (error) {
    logger.error('Failed to get session', { sessionId: req.params.sessionId, error });
    res.status(500).json(createErrorResponse(
      'SESSION_RETRIEVAL_FAILED',
      'Failed to retrieve session'
    ));
  }
});

/**
 * Update session step
 */
router.put('/:sessionId/step', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { step } = req.body;
    
    if (!step || !Object.values(ProcessStep).includes(step)) {
      return res.status(400).json(createErrorResponse(
        'INVALID_STEP',
        'Invalid or missing step parameter'
      ));
    }
    
    const session = sessionService.updateSessionStep(sessionId, step);
    
    if (!session) {
      return res.status(404).json(createErrorResponse(
        'SESSION_NOT_FOUND',
        'Session not found or expired'
      ));
    }
    
    res.json(createSuccessResponse({
      sessionId: session.sessionId,
      currentStep: session.currentStep,
    }));
  } catch (error) {
    logger.error('Failed to update session step', { 
      sessionId: req.params.sessionId, 
      error 
    });
    res.status(500).json(createErrorResponse(
      'SESSION_UPDATE_FAILED',
      'Failed to update session step'
    ));
  }
});

/**
 * Delete session
 */
router.delete('/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const deleted = sessionService.deleteSession(sessionId);
    
    if (!deleted) {
      return res.status(404).json(createErrorResponse(
        'SESSION_NOT_FOUND',
        'Session not found'
      ));
    }
    
    // Clear session from request session
    if (req.session.sessionId === sessionId) {
      req.session.sessionId = undefined;
    }
    
    res.json(createSuccessResponse({
      message: 'Session deleted successfully',
    }));
  } catch (error) {
    logger.error('Failed to delete session', { 
      sessionId: req.params.sessionId, 
      error 
    });
    res.status(500).json(createErrorResponse(
      'SESSION_DELETION_FAILED',
      'Failed to delete session'
    ));
  }
});

/**
 * Get session statistics (for monitoring)
 */
router.get('/admin/stats', (_req: Request, res: Response) => {
  try {
    const stats = sessionService.getSessionStats();
    
    res.json(createSuccessResponse(stats));
  } catch (error) {
    logger.error('Failed to get session statistics', error);
    res.status(500).json(createErrorResponse(
      'STATS_RETRIEVAL_FAILED',
      'Failed to retrieve session statistics'
    ));
  }
});

export default router;