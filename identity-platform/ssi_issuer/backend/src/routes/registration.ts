import { Router, Request, Response } from 'express';
import { registrationService } from '../services/RegistrationService';
import { oobiService } from '../services/OOBIService';
import { CredentialSchema } from '../models/CredentialSchema';
import { logger } from '../utils/logger';
import { 
  validateRegistration, 
  validateObjectId, 
  validateRegistrationQuery,
  validateApplicationData 
} from '../utils/validation';
import QRCode from 'qrcode';

const router = Router();

/**
 * POST /api/register
 * User registration submission
 */
router.post('/register', validateRegistration, async (req: Request, res: Response) => {
  try {
    const { 
      email, 
      fullName, 
      phone, 
      organization, 
      requestedSchemaId, 
      applicationData = {} 
    } = req.body;

    // Get schema for validation
    const schema = await CredentialSchema.findById(requestedSchemaId);
    if (!schema) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Requested schema not found',
          code: 'SCHEMA_NOT_FOUND'
        }
      });
    }

    // Validate application data against schema
    const validation = validateApplicationData(applicationData, schema);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Application data validation failed',
          code: 'APPLICATION_DATA_INVALID',
          details: validation.errors
        }
      });
    }

    // Create registration using service
    const registration = await registrationService.createRegistration({
      email,
      fullName,
      phone,
      organization,
      requestedSchemaId,
      applicationData
    });

    res.status(201).json({
      success: true,
      data: {
        id: registration._id,
        email: registration.email,
        fullName: registration.fullName,
        phone: registration.phone,
        organization: registration.organization,
        requestedSchemaId: registration.requestedSchemaId,
        status: registration.status,
        connectionStatus: registration.connectionStatus,
        createdAt: registration.createdAt
      }
    });

  } catch (error) {
    logger.error('Error creating registration:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Email already registered') {
        return res.status(409).json({
          success: false,
          error: {
            message: error.message,
            code: 'EMAIL_EXISTS'
          }
        });
      }
      
      if (error.message === 'Requested schema not found') {
        return res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'SCHEMA_NOT_FOUND'
          }
        });
      }
      
      if (error.message === 'Requested schema is not active') {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'SCHEMA_INACTIVE'
          }
        });
      }
      
      if (error.message.includes('Missing required fields')) {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'REQUIRED_FIELDS_MISSING'
          }
        });
      }
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create registration',
        code: 'REGISTRATION_CREATE_ERROR'
      }
    });
  }
});

/**
 * GET /api/schemas/public
 * Get available schemas for registration
 */
router.get('/schemas/public', async (req: Request, res: Response) => {
  try {
    const schemas = await CredentialSchema.find({ 
      isActive: true 
    }).select('_id name description version schemaData isDefault');

    res.json({
      success: true,
      data: schemas.map(schema => ({
        id: schema._id,
        name: schema.name,
        description: schema.description,
        version: schema.version,
        schemaData: schema.schemaData,
        isDefault: schema.isDefault
      }))
    });

  } catch (error) {
    logger.error('Error fetching public schemas:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch available schemas',
        code: 'SCHEMAS_FETCH_ERROR'
      }
    });
  }
});

/**
 * GET /api/connection/qr
 * Generate connection QR code for registration
 */
router.get('/connection/qr', async (req: Request, res: Response) => {
  try {
    const { registrationId, expirationHours } = req.query;

    if (!registrationId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Registration ID is required',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    // Generate OOBI invitation using service
    const invitation = await oobiService.generateInvitation({
      registrationId: registrationId as string,
      expirationHours: expirationHours ? parseInt(expirationHours as string) : undefined
    });

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(invitation.oobiUrl);

    res.json({
      success: true,
      data: {
        invitationId: invitation.invitationId,
        qrCode: qrCodeDataUrl,
        invitationUrl: invitation.oobiUrl,
        expiresAt: invitation.expiresAt
      }
    });

  } catch (error) {
    logger.error('Error generating connection QR code:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Registration not found') {
        return res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'REGISTRATION_NOT_FOUND'
          }
        });
      }
      
      if (error.message === 'Registration must be approved before generating invitation') {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'REGISTRATION_NOT_APPROVED'
          }
        });
      }
      
      if (error.message.includes('No KERIA identifiers')) {
        return res.status(503).json({
          success: false,
          error: {
            message: 'KERIA service not properly configured',
            code: 'KERIA_NOT_CONFIGURED'
          }
        });
      }
      
      if (error.message.includes('Failed to generate OOBI')) {
        return res.status(503).json({
          success: false,
          error: {
            message: 'Failed to generate connection invitation',
            code: 'OOBI_GENERATION_ERROR'
          }
        });
      }
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate connection QR code',
        code: 'QR_GENERATION_ERROR'
      }
    });
  }
});

/**
 * GET /api/admin/registrations
 * List all registrations (admin only)
 */
router.get('/admin/registrations', validateRegistrationQuery, async (req: Request, res: Response) => {
  try {
    const {
      status,
      connectionStatus,
      requestedSchemaId,
      email,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      createdAfter,
      createdBefore
    } = req.query;

    const filters: any = {};
    if (status) filters.status = status;
    if (connectionStatus) filters.connectionStatus = connectionStatus;
    if (requestedSchemaId) filters.requestedSchemaId = requestedSchemaId;
    if (email) filters.email = email;
    if (createdAfter) filters.createdAfter = new Date(createdAfter as string);
    if (createdBefore) filters.createdBefore = new Date(createdBefore as string);

    const pagination = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    };

    const result = await registrationService.listRegistrations(filters, pagination);

    res.json({
      success: true,
      data: result.registrations.map(reg => ({
        id: reg._id,
        email: reg.email,
        fullName: reg.fullName,
        phone: reg.phone,
        organization: reg.organization,
        requestedSchemaId: reg.requestedSchemaId,
        status: reg.status,
        connectionStatus: reg.connectionStatus,
        connectionId: reg.connectionId,
        reviewedBy: reg.reviewedBy,
        reviewedAt: reg.reviewedAt,
        createdAt: reg.createdAt,
        updatedAt: reg.updatedAt
      })),
      pagination: {
        page: result.page,
        limit: pagination.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });

  } catch (error) {
    logger.error('Error listing registrations:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to list registrations',
        code: 'REGISTRATIONS_LIST_ERROR'
      }
    });
  }
});

/**
 * GET /api/admin/registrations/:id
 * Get specific registration (admin only)
 */
router.get('/admin/registrations/:id', validateObjectId, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const registration = await registrationService.getRegistrationById(id);
    if (!registration) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Registration not found',
          code: 'REGISTRATION_NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      data: {
        id: registration._id,
        email: registration.email,
        fullName: registration.fullName,
        phone: registration.phone,
        organization: registration.organization,
        requestedSchemaId: registration.requestedSchemaId,
        applicationData: registration.applicationData,
        status: registration.status,
        connectionStatus: registration.connectionStatus,
        connectionId: registration.connectionId,
        reviewedBy: registration.reviewedBy,
        reviewedAt: registration.reviewedAt,
        createdAt: registration.createdAt,
        updatedAt: registration.updatedAt
      }
    });

  } catch (error) {
    logger.error('Error getting registration:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get registration',
        code: 'REGISTRATION_GET_ERROR'
      }
    });
  }
});

/**
 * PUT /api/admin/registrations/:id/approve
 * Approve registration (admin only)
 */
router.put('/admin/registrations/:id/approve', validateObjectId, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reviewedBy = req.headers.authorization ? 'admin' : 'system'; // TODO: Extract from JWT

    const registration = await registrationService.approveRegistration(id, reviewedBy);

    res.json({
      success: true,
      data: {
        id: registration._id,
        email: registration.email,
        status: registration.status,
        reviewedBy: registration.reviewedBy,
        reviewedAt: registration.reviewedAt
      }
    });

  } catch (error) {
    logger.error('Error approving registration:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Registration not found') {
        return res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'REGISTRATION_NOT_FOUND'
          }
        });
      }
      
      if (error.message === 'Registration is not in pending status') {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'REGISTRATION_NOT_PENDING'
          }
        });
      }
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to approve registration',
        code: 'REGISTRATION_APPROVE_ERROR'
      }
    });
  }
});

/**
 * PUT /api/admin/registrations/:id/reject
 * Reject registration (admin only)
 */
router.put('/admin/registrations/:id/reject', validateObjectId, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const reviewedBy = req.headers.authorization ? 'admin' : 'system'; // TODO: Extract from JWT

    const registration = await registrationService.rejectRegistration(id, reviewedBy, reason);

    res.json({
      success: true,
      data: {
        id: registration._id,
        email: registration.email,
        status: registration.status,
        reviewedBy: registration.reviewedBy,
        reviewedAt: registration.reviewedAt,
        reason
      }
    });

  } catch (error) {
    logger.error('Error rejecting registration:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Registration not found') {
        return res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'REGISTRATION_NOT_FOUND'
          }
        });
      }
      
      if (error.message === 'Registration is not in pending status') {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'REGISTRATION_NOT_PENDING'
          }
        });
      }
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to reject registration',
        code: 'REGISTRATION_REJECT_ERROR'
      }
    });
  }
});

/**
 * GET /api/admin/registrations/stats
 * Get registration statistics (admin only)
 */
router.get('/admin/registrations/stats', async (req: Request, res: Response) => {
  try {
    const stats = await registrationService.getRegistrationStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error getting registration stats:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get registration statistics',
        code: 'REGISTRATION_STATS_ERROR'
      }
    });
  }
});

export { router as registrationRoutes };