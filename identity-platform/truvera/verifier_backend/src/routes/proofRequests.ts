import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getTruveraService } from '../services/truveraService';
import { ProofRequestConfig, ProofRequest, ApiResponse } from '../types';

const router = Router();

// In-memory storage for proof requests (for session management)
const proofRequestStore = new Map<string, ProofRequest>();

/**
 * Validation middleware for proof request creation
 */
function validateProofRequestConfig(req: Request, res: Response, next: Function) {
  const { name, purpose, credentialTypes, requiredFields, timeoutMinutes } = req.body;

  const errors: string[] = [];

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('name is required and must be a non-empty string');
  }

  if (!purpose || typeof purpose !== 'string' || purpose.trim().length === 0) {
    errors.push('purpose is required and must be a non-empty string');
  }

  if (!credentialTypes || !Array.isArray(credentialTypes) || credentialTypes.length === 0) {
    errors.push('credentialTypes is required and must be a non-empty array');
  } else {
    // Validate each credential type is a string
    credentialTypes.forEach((type, index) => {
      if (typeof type !== 'string' || type.trim().length === 0) {
        errors.push(`credentialTypes[${index}] must be a non-empty string`);
      }
    });
  }

  // Validate optional fields
  if (requiredFields !== undefined) {
    if (!Array.isArray(requiredFields)) {
      errors.push('requiredFields must be an array if provided');
    } else {
      requiredFields.forEach((field, index) => {
        if (!field.path || typeof field.path !== 'string') {
          errors.push(`requiredFields[${index}].path is required and must be a string`);
        }
        if (typeof field.required !== 'boolean') {
          errors.push(`requiredFields[${index}].required must be a boolean`);
        }
      });
    }
  }

  if (timeoutMinutes !== undefined) {
    if (typeof timeoutMinutes !== 'number' || timeoutMinutes <= 0 || timeoutMinutes > 1440) {
      errors.push('timeoutMinutes must be a positive number not exceeding 1440 (24 hours)');
    }
  }

  if (errors.length > 0) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid proof request configuration',
        details: { errors }
      },
      timestamp: new Date().toISOString()
    };
    res.status(400).json(response);
    return;
  }

  next();
}

/**
 * POST /api/proof-requests
 * Create a new proof request via Truvera API
 */
router.post('/', validateProofRequestConfig, async (req: Request, res: Response) => {
  try {
    const config: ProofRequestConfig = {
      name: req.body.name.trim(),
      purpose: req.body.purpose.trim(),
      credentialTypes: req.body.credentialTypes.map((type: string) => type.trim()),
      requiredFields: req.body.requiredFields || [],
      timeoutMinutes: req.body.timeoutMinutes || 30
    };

    console.log('Creating proof request with config:', config);

    // Get Truvera service instance
    const truveraService = getTruveraService();

    // Transform config to Truvera API format
    const fields = [
      // Always require the credential type
      {
        path: ['$.type'],
        filter: {
          type: 'array',
          contains: {
            const: 'DEIPAccessCredential'
          }
        }
      },
      // Add required fields from config
      ...config.requiredFields.map(field => ({
        path: [`$.${field.path}`],
        filter: {
          type: field.path.includes('amlStatus') ? 'boolean' : 'string'
        }
      }))
    ];

    const truveraPayload = {
      name: config.name,
      request: {
        name: config.name,
        purpose: config.purpose,
        input_descriptors: [
          {
            id: 'deip_access_credential',
            name: 'DEIP Access Credential',
            purpose: 'We need to verify your DEIP access credential',
            constraints: {
              fields: fields
            }
          }
        ]
      }
    };

    // Create proof request via Truvera API
    const truveraResponse = await truveraService.createProofRequest(truveraPayload);

    console.log('Truvera API Response:', JSON.stringify(truveraResponse, null, 2));

    // Create our internal proof request object
    // Calculate expiration based on the actual creation time from Truvera, not current time
    const createdTime = new Date(truveraResponse.created);
    const expirationTime = new Date(createdTime.getTime() + (config.timeoutMinutes || 30) * 60 * 1000);
    
    const proofRequest: ProofRequest = {
      id: truveraResponse.id,
      qr: truveraResponse.qr,
      response_url: truveraResponse.response_url,
      config: config,
      status: truveraResponse.verified ? 'completed' : (truveraResponse.expired ? 'expired' : 'active'),
      createdAt: truveraResponse.created,
      expiresAt: expirationTime.toISOString()
    };

    console.log('Created proof request object:', JSON.stringify(proofRequest, null, 2));
    console.log(`⏰ Timer calculation - Created: ${createdTime.toISOString()}, Expires: ${expirationTime.toISOString()}, Duration: ${config.timeoutMinutes || 30} minutes`);

    // Store in memory for session management
    proofRequestStore.set(proofRequest.id, proofRequest);

    console.log(`Proof request created successfully: ${proofRequest.id}`);

    const response: ApiResponse<ProofRequest> = {
      success: true,
      data: proofRequest,
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);

  } catch (error) {
    console.error('Error creating proof request:', error);

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'PROOF_REQUEST_CREATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create proof request',
        details: error instanceof Error ? { stack: error.stack } : error
      },
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

/**
 * GET /api/proof-requests/:id/status
 * Get proof request status for monitoring
 */
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const proofRequestId = req.params.id;

    if (!proofRequestId || typeof proofRequestId !== 'string') {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_PROOF_REQUEST_ID',
          message: 'Proof request ID is required and must be a string'
        },
        timestamp: new Date().toISOString()
      };
      res.status(400).json(response);
      return;
    }

    console.log(`Getting status for proof request: ${proofRequestId}`);

    // Check if we have this proof request in our store
    const storedProofRequest = proofRequestStore.get(proofRequestId);
    if (!storedProofRequest) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'PROOF_REQUEST_NOT_FOUND',
          message: 'Proof request not found'
        },
        timestamp: new Date().toISOString()
      };
      res.status(404).json(response);
      return;
    }

    // Get Truvera service instance
    const truveraService = getTruveraService();

    // Get current status from Truvera API
    const truveraResponse = await truveraService.getProofRequestStatus(proofRequestId);

    // Update our stored proof request with latest status
    // IMPORTANT: Preserve the original createdAt and expiresAt timestamps to prevent timer reset
    const updatedProofRequest: ProofRequest = {
      ...storedProofRequest,
      status: truveraResponse.verified ? 'completed' : (truveraResponse.expired ? 'expired' : 'active'),
      // Update other fields that might have changed
      qr: truveraResponse.qr,
      response_url: truveraResponse.response_url,
      // Include presentation data if available
      presentation: truveraResponse.presentation || undefined,
      // Explicitly preserve original timestamps to prevent frontend timer reset
      createdAt: storedProofRequest.createdAt,
      expiresAt: storedProofRequest.expiresAt,
    };

    // Update in store
    proofRequestStore.set(proofRequestId, updatedProofRequest);

    console.log(`Proof request status updated: ${proofRequestId} -> ${updatedProofRequest.status}`);
    console.log(`Timestamps preserved - Created: ${updatedProofRequest.createdAt}, Expires: ${updatedProofRequest.expiresAt}`);

    const response: ApiResponse<ProofRequest> = {
      success: true,
      data: updatedProofRequest,
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('Error getting proof request status:', error);

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'PROOF_REQUEST_STATUS_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get proof request status',
        details: error instanceof Error ? { stack: error.stack } : error
      },
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

/**
 * GET /api/proof-requests/:id
 * Get full proof request details (for internal use)
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const proofRequestId = req.params.id;

    if (!proofRequestId || typeof proofRequestId !== 'string') {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_PROOF_REQUEST_ID',
          message: 'Proof request ID is required and must be a string'
        },
        timestamp: new Date().toISOString()
      };
      res.status(400).json(response);
      return;
    }

    const storedProofRequest = proofRequestStore.get(proofRequestId);
    if (!storedProofRequest) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'PROOF_REQUEST_NOT_FOUND',
          message: 'Proof request not found'
        },
        timestamp: new Date().toISOString()
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<ProofRequest> = {
      success: true,
      data: storedProofRequest,
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('Error getting proof request:', error);

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'PROOF_REQUEST_GET_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get proof request',
        details: error instanceof Error ? { stack: error.stack } : error
      },
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

/**
 * DELETE /api/proof-requests/:id
 * Delete a proof request from memory (cleanup)
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const proofRequestId = req.params.id;

    if (!proofRequestId || typeof proofRequestId !== 'string') {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_PROOF_REQUEST_ID',
          message: 'Proof request ID is required and must be a string'
        },
        timestamp: new Date().toISOString()
      };
      res.status(400).json(response);
      return;
    }

    const deleted = proofRequestStore.delete(proofRequestId);

    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'PROOF_REQUEST_NOT_FOUND',
          message: 'Proof request not found'
        },
        timestamp: new Date().toISOString()
      };
      res.status(404).json(response);
      return;
    }

    console.log(`Proof request deleted from memory: ${proofRequestId}`);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Proof request deleted successfully' },
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('Error deleting proof request:', error);

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'PROOF_REQUEST_DELETE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete proof request',
        details: error instanceof Error ? { stack: error.stack } : error
      },
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

/**
 * GET /api/proof-requests
 * List all proof requests in memory (for debugging/admin)
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const proofRequests = Array.from(proofRequestStore.values());

    const response: ApiResponse<ProofRequest[]> = {
      success: true,
      data: proofRequests,
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('Error listing proof requests:', error);

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'PROOF_REQUEST_LIST_FAILED',
        message: error instanceof Error ? error.message : 'Failed to list proof requests',
        details: error instanceof Error ? { stack: error.stack } : error
      },
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

export default router;