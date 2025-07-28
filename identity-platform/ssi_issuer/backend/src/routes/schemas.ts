import { Router, Request, Response } from 'express';
import { schemaService } from '../services/SchemaService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/admin/schemas
 * Create a new credential schema
 */
router.post('/admin/schemas', async (req: Request, res: Response) => {
  try {
    const { name, description, version, schemaData, isDefault = false } = req.body;

    // Validate required fields
    if (!name || !schemaData) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Name and schemaData are required',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    // Create schema using service
    const savedSchema = await schemaService.createSchema({
      name,
      description,
      version,
      schemaData,
      isDefault,
      createdBy: req.headers.authorization ? 'admin' : undefined // TODO: Extract from JWT
    });

    res.status(201).json({
      success: true,
      data: {
        id: savedSchema._id,
        name: savedSchema.name,
        description: savedSchema.description,
        version: savedSchema.version,
        schemaData: savedSchema.schemaData,
        isDefault: savedSchema.isDefault,
        isActive: savedSchema.isActive,
        createdAt: savedSchema.createdAt,
        updatedAt: savedSchema.updatedAt
      }
    });
  } catch (error) {
    logger.error('Error creating schema:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: {
            message: error.message,
            code: 'SCHEMA_EXISTS'
          }
        });
      }
      
      if (error.message.includes('validation failed')) {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'SCHEMA_VALIDATION_ERROR'
          }
        });
      }
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create schema',
        code: 'SCHEMA_CREATE_ERROR'
      }
    });
  }
});

/**
 * GET /api/admin/schemas
 * List all credential schemas
 */
router.get('/admin/schemas', async (req: Request, res: Response) => {
  try {
    const { activeOnly } = req.query;
    
    const schemas = await schemaService.getSchemas({
      activeOnly: activeOnly === 'true'
    });

    res.json({
      success: true,
      data: schemas.map(schema => ({
        id: schema._id,
        name: schema.name,
        description: schema.description,
        version: schema.version,
        schemaData: schema.schemaData,
        isDefault: schema.isDefault,
        isActive: schema.isActive,
        createdAt: schema.createdAt,
        updatedAt: schema.updatedAt,
        createdBy: schema.createdBy
      }))
    });
  } catch (error) {
    logger.error('Error listing schemas:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to list schemas',
        code: 'SCHEMA_LIST_ERROR'
      }
    });
  }
});

/**
 * PUT /api/admin/schemas/:id/default
 * Set a schema as the default schema
 */
router.put('/admin/schemas/:id/default', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const updatedSchema = await schemaService.setDefaultSchema(
      id,
      req.headers.authorization ? 'admin' : undefined // TODO: Extract from JWT
    );

    res.json({
      success: true,
      data: {
        id: updatedSchema._id,
        name: updatedSchema.name,
        description: updatedSchema.description,
        version: updatedSchema.version,
        schemaData: updatedSchema.schemaData,
        isDefault: updatedSchema.isDefault,
        isActive: updatedSchema.isActive,
        createdAt: updatedSchema.createdAt,
        updatedAt: updatedSchema.updatedAt
      }
    });
  } catch (error) {
    logger.error('Error setting default schema:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Schema not found') {
        return res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'SCHEMA_NOT_FOUND'
          }
        });
      }
      
      if (error.message.includes('inactive schema')) {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'SCHEMA_INACTIVE'
          }
        });
      }
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to set default schema',
        code: 'SCHEMA_DEFAULT_ERROR'
      }
    });
  }
});

/**
 * GET /api/admin/schemas/:id
 * Get a specific schema by ID
 */
router.get('/admin/schemas/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const schema = await schemaService.getSchemaById(id);
    if (!schema) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Schema not found',
          code: 'SCHEMA_NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      data: {
        id: schema._id,
        name: schema.name,
        description: schema.description,
        version: schema.version,
        schemaData: schema.schemaData,
        isDefault: schema.isDefault,
        isActive: schema.isActive,
        createdAt: schema.createdAt,
        updatedAt: schema.updatedAt,
        createdBy: schema.createdBy
      }
    });
  } catch (error) {
    logger.error('Error getting schema:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get schema',
        code: 'SCHEMA_GET_ERROR'
      }
    });
  }
});

/**
 * PUT /api/admin/schemas/:id
 * Update a schema
 */
router.put('/admin/schemas/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, schemaData, isActive } = req.body;

    const updatedSchema = await schemaService.updateSchema(
      id,
      { name, description, schemaData, isActive },
      req.headers.authorization ? 'admin' : undefined // TODO: Extract from JWT
    );

    res.json({
      success: true,
      data: {
        id: updatedSchema._id,
        name: updatedSchema.name,
        description: updatedSchema.description,
        version: updatedSchema.version,
        schemaData: updatedSchema.schemaData,
        isDefault: updatedSchema.isDefault,
        isActive: updatedSchema.isActive,
        createdAt: updatedSchema.createdAt,
        updatedAt: updatedSchema.updatedAt
      }
    });
  } catch (error) {
    logger.error('Error updating schema:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Schema not found') {
        return res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'SCHEMA_NOT_FOUND'
          }
        });
      }
      
      if (error.message.includes('validation failed') || error.message.includes('already exists')) {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'SCHEMA_VALIDATION_ERROR'
          }
        });
      }
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update schema',
        code: 'SCHEMA_UPDATE_ERROR'
      }
    });
  }
});

/**
 * PUT /api/admin/schemas/:id/activate
 * Activate a schema
 */
router.put('/admin/schemas/:id/activate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const schema = await schemaService.activateSchema(
      id,
      req.headers.authorization ? 'admin' : undefined // TODO: Extract from JWT
    );

    res.json({
      success: true,
      data: {
        id: schema._id,
        name: schema.name,
        isActive: schema.isActive
      }
    });
  } catch (error) {
    logger.error('Error activating schema:', error);
    
    if (error instanceof Error && error.message === 'Schema not found') {
      return res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'SCHEMA_NOT_FOUND'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to activate schema',
        code: 'SCHEMA_ACTIVATE_ERROR'
      }
    });
  }
});

/**
 * PUT /api/admin/schemas/:id/deactivate
 * Deactivate a schema
 */
router.put('/admin/schemas/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const schema = await schemaService.deactivateSchema(
      id,
      req.headers.authorization ? 'admin' : undefined // TODO: Extract from JWT
    );

    res.json({
      success: true,
      data: {
        id: schema._id,
        name: schema.name,
        isActive: schema.isActive
      }
    });
  } catch (error) {
    logger.error('Error deactivating schema:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Schema not found') {
        return res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'SCHEMA_NOT_FOUND'
          }
        });
      }
      
      if (error.message.includes('Cannot deactivate')) {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'SCHEMA_DEACTIVATE_FORBIDDEN'
          }
        });
      }
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to deactivate schema',
        code: 'SCHEMA_DEACTIVATE_ERROR'
      }
    });
  }
});

/**
 * POST /api/admin/schemas/:id/versions
 * Create a new version of an existing schema
 */
router.post('/admin/schemas/:id/versions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { version, description, schemaData } = req.body;

    if (!version) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Version is required',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    const newSchema = await schemaService.createSchemaVersion(
      id,
      version,
      { description, schemaData },
      req.headers.authorization ? 'admin' : undefined // TODO: Extract from JWT
    );

    res.status(201).json({
      success: true,
      data: {
        id: newSchema._id,
        name: newSchema.name,
        description: newSchema.description,
        version: newSchema.version,
        schemaData: newSchema.schemaData,
        isDefault: newSchema.isDefault,
        isActive: newSchema.isActive,
        createdAt: newSchema.createdAt,
        updatedAt: newSchema.updatedAt
      }
    });
  } catch (error) {
    logger.error('Error creating schema version:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'SCHEMA_NOT_FOUND'
          }
        });
      }
      
      if (error.message.includes('already exists') || error.message.includes('validation')) {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'SCHEMA_VERSION_ERROR'
          }
        });
      }
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create schema version',
        code: 'SCHEMA_VERSION_CREATE_ERROR'
      }
    });
  }
});

/**
 * GET /api/admin/schemas/name/:name/versions
 * Get all versions of a schema by name
 */
router.get('/admin/schemas/name/:name/versions', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    
    const versions = await schemaService.getSchemaVersions(name);

    res.json({
      success: true,
      data: versions
    });
  } catch (error) {
    logger.error('Error getting schema versions:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get schema versions',
        code: 'SCHEMA_VERSIONS_ERROR'
      }
    });
  }
});

/**
 * POST /api/admin/schemas/validate
 * Validate schema data without creating a schema
 */
router.post('/admin/schemas/validate', async (req: Request, res: Response) => {
  try {
    const { schemaData } = req.body;

    if (!schemaData) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'schemaData is required',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    const validation = schemaService.validateSchemaData(schemaData);

    res.json({
      success: true,
      data: {
        valid: validation.valid,
        errors: validation.errors
      }
    });
  } catch (error) {
    logger.error('Error validating schema:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to validate schema',
        code: 'SCHEMA_VALIDATION_ERROR'
      }
    });
  }
});

/**
 * GET /api/schemas/public
 * Get public schemas (for registration form)
 */
router.get('/schemas/public', async (req: Request, res: Response) => {
  try {
    const schemas = await schemaService.getSchemas({ publicOnly: true });

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
    logger.error('Error listing public schemas:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to list public schemas',
        code: 'SCHEMA_PUBLIC_LIST_ERROR'
      }
    });
  }
});

export { router as schemaRoutes };