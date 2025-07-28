import { Router, Request, Response } from 'express';
import { oobiService } from '../services/OOBIService';
import { keriaClient } from '../services/KeriaClient';
import { logger } from '../utils/logger';
import { validateOOBI, validateConnectionInvitation, validateObjectId } from '../utils/validation';
import QRCode from 'qrcode';

const router = Router();

/**
 * POST /oobis/resolve
 * Resolve OOBI and establish contact
 */
router.post('/resolve', validateOOBI, async (req: Request, res: Response) => {
  try {
    const { oobi, alias } = req.body;

    // Resolve OOBI using KERIA client
    try {
      const resolveResult = await keriaClient.oobis().resolve(oobi);
      
      if (!resolveResult) {
        throw new Error('OOBI resolution failed');
      }

      // Create contact alias if not provided
      const contactAlias = alias || `contact_${Date.now()}`;

      // Add contact to KERIA
      const contactResult = await keriaClient.contacts().add(contactAlias, oobi);
      
      if (!contactResult) {
        throw new Error('Failed to add contact');
      }

      logger.info('OOBI resolved and contact added successfully', {
        oobi,
        alias: contactAlias
      });

      res.json({
        success: true,
        data: {
          oobi,
          alias: contactAlias,
          resolved: true,
          contactAdded: true,
          resolveResult,
          contactResult
        }
      });

    } catch (keriaError) {
      logger.error('KERIA OOBI resolution failed:', keriaError);

      return res.status(503).json({
        success: false,
        error: {
          message: 'Failed to resolve OOBI with KERIA',
          code: 'KERIA_OOBI_ERROR',
          details: keriaError instanceof Error ? keriaError.message : 'Unknown error'
        }
      });
    }

  } catch (error) {
    logger.error('Error resolving OOBI:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to resolve OOBI',
        code: 'OOBI_RESOLVE_ERROR'
      }
    });
  }
});

/**
 * GET /contacts
 * List all KERIA contacts
 */
router.get('/contacts', async (req: Request, res: Response) => {
  try {
    const contacts = await keriaClient.contacts().list();

    res.json({
      success: true,
      data: contacts || []
    });

  } catch (error) {
    logger.error('Error listing contacts:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to list contacts',
        code: 'CONTACTS_LIST_ERROR'
      }
    });
  }
});

/**
 * GET /contacts/:alias
 * Get specific contact details
 */
router.get('/contacts/:alias', async (req: Request, res: Response) => {
  try {
    const { alias } = req.params;

    const contact = await keriaClient.contacts().get(alias);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Contact not found',
          code: 'CONTACT_NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      data: contact
    });

  } catch (error) {
    logger.error('Error getting contact:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get contact',
        code: 'CONTACT_GET_ERROR'
      }
    });
  }
});

/**
 * GET /api/connection/invitation/:id/qr
 * Get QR code for specific invitation
 */
router.get('/api/connection/invitation/:id/qr', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get invitation using service
    const invitation = await oobiService.getInvitation(id);
    
    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Invitation not found',
          code: 'INVITATION_NOT_FOUND'
        }
      });
    }

    // Check if invitation is expired
    if (invitation.isExpired()) {
      return res.status(410).json({
        success: false,
        error: {
          message: 'Invitation has expired',
          code: 'INVITATION_EXPIRED'
        }
      });
    }

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(invitation.invitationUrl);

    res.json({
      success: true,
      data: {
        invitationId: invitation.invitationId,
        qrCode: qrCodeDataUrl,
        invitationUrl: invitation.invitationUrl,
        state: invitation.state,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt
      }
    });

  } catch (error) {
    logger.error('Error generating invitation QR code:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate QR code',
        code: 'QR_GENERATION_ERROR'
      }
    });
  }
});

/**
 * POST /api/connection/invitation/:id/accept
 * Accept connection invitation (for testing/admin purposes)
 */
router.post('/api/connection/invitation/:id/accept', validateConnectionInvitation, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { contactAlias } = req.body;

    // Accept invitation using service
    const result = await oobiService.acceptInvitation(id, contactAlias);

    res.json({
      success: true,
      data: {
        invitationId: id,
        connectionId: result.connectionId,
        alias: result.alias,
        state: result.state,
        acceptedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('Error accepting invitation:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Invitation not found') {
        return res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'INVITATION_NOT_FOUND'
          }
        });
      }
      
      if (error.message === 'Invitation has expired') {
        return res.status(410).json({
          success: false,
          error: {
            message: error.message,
            code: 'INVITATION_EXPIRED'
          }
        });
      }
      
      if (error.message === 'Invitation already accepted') {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'INVITATION_ALREADY_ACCEPTED'
          }
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to accept invitation',
        code: 'INVITATION_ACCEPT_ERROR'
      }
    });
  }
});

/**
 * GET /api/connection/status/:registrationId
 * Get connection status for a registration
 */
router.get('/api/connection/status/:registrationId', validateObjectId, async (req: Request, res: Response) => {
  try {
    const { registrationId } = req.params;

    // Get connection status using service
    const status = await oobiService.getConnectionStatus(registrationId);

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Error getting connection status:', error);
    
    if (error instanceof Error && error.message === 'Registration not found') {
      return res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'REGISTRATION_NOT_FOUND'
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get connection status',
        code: 'CONNECTION_STATUS_ERROR'
      }
    });
  }
});

/**
 * GET /api/admin/oobi/stats
 * Get OOBI statistics (admin only)
 */
router.get('/api/admin/oobi/stats', async (req: Request, res: Response) => {
  try {
    const stats = await oobiService.getOOBIStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error getting OOBI stats:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get OOBI statistics',
        code: 'OOBI_STATS_ERROR'
      }
    });
  }
});

/**
 * POST /api/admin/oobi/cleanup
 * Manually trigger cleanup of expired invitations (admin only)
 */
router.post('/api/admin/oobi/cleanup', async (req: Request, res: Response) => {
  try {
    const cleanedCount = await oobiService.cleanupExpiredInvitations();

    res.json({
      success: true,
      data: {
        cleanedCount,
        message: `Cleaned up ${cleanedCount} expired invitations`
      }
    });

  } catch (error) {
    logger.error('Error cleaning up expired invitations:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to cleanup expired invitations',
        code: 'OOBI_CLEANUP_ERROR'
      }
    });
  }
});

export { router as oobiRoutes };