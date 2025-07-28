import { Router, Request, Response } from 'express';
import { registryService } from '../services/RegistryService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/admin/registries
 * Create a new registry
 */
router.post('/admin/registries', async (req: Request, res: Response) => {
  try {
    const { name, registryName, schemaId } = req.body;

    // Validate required fields
    if (!name || !registryName) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Identifier name and registry name are required',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    const registry = await registryService.createRegistry({
      name,
      registryName,
      schemaId,
      createdBy: req.headers.authorization ? 'admin' : undefined // TODO: Extract from JWT
    });

    res.status(201).json({
      success: true,
      data: {
        name: registry.name,
        registryName: registry.registryName,
        regk: registry.regk,
        state: registry.state,
        schemaId: registry.schemaId,
        created: registry.created
      }
    });
  } catch (error) {
    logger.error('Error creating registry:', error);
    
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
      
      if (error.message.includes('not active')) {
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
        message: 'Failed to create registry',
        code: 'REGISTRY_CREATE_ERROR'
      }
    });
  }
});

/**
 * GET /api/admin/registries
 * List all registries
 */
router.get('/admin/registries', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.query;
    
    const registries = await registryService.listRegistries(identifier as string);

    res.json({
      success: true,
      data: registries.map(registry => ({
        name: registry.name,
        registryName: registry.registryName,
        regk: registry.regk,
        state: registry.state,
        schemaId: registry.schemaId,
        created: registry.created
      }))
    });
  } catch (error) {
    logger.error('Error listing registries:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to list registries',
        code: 'REGISTRY_LIST_ERROR'
      }
    });
  }
});

/**
 * GET /api/admin/registries/:identifier/:registryName
 * Get a specific registry
 */
router.get('/admin/registries/:identifier/:registryName', async (req: Request, res: Response) => {
  try {
    const { identifier, registryName } = req.params;
    
    const registry = await registryService.getRegistry(identifier, registryName);
    
    if (!registry) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Registry not found',
          code: 'REGISTRY_NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      data: {
        name: registry.name,
        registryName: registry.registryName,
        regk: registry.regk,
        state: registry.state,
        schemaId: registry.schemaId,
        created: registry.created
      }
    });
  } catch (error) {
    logger.error('Error getting registry:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get registry',
        code: 'REGISTRY_GET_ERROR'
      }
    });
  }
});

/**
 * PUT /api/admin/registries/:registryName/schema
 * Associate a schema with a registry
 */
router.put('/admin/registries/:registryName/schema', async (req: Request, res: Response) => {
  try {
    const { registryName } = req.params;
    const { schemaId } = req.body;

    if (!schemaId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Schema ID is required',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    await registryService.associateSchemaWithRegistry(
      registryName,
      schemaId,
      req.headers.authorization ? 'admin' : undefined // TODO: Extract from JWT
    );

    res.json({
      success: true,
      data: {
        registryName,
        schemaId,
        message: 'Schema associated with registry successfully'
      }
    });
  } catch (error) {
    logger.error('Error associating schema with registry:', error);
    
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
      
      if (error.message.includes('not active')) {
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
        message: 'Failed to associate schema with registry',
        code: 'REGISTRY_SCHEMA_ASSOCIATE_ERROR'
      }
    });
  }
});

/**
 * DELETE /api/admin/registries/:registryName/schema
 * Remove schema association from registry
 */
router.delete('/admin/registries/:registryName/schema', async (req: Request, res: Response) => {
  try {
    const { registryName } = req.params;

    await registryService.removeSchemaFromRegistry(
      registryName,
      req.headers.authorization ? 'admin' : undefined // TODO: Extract from JWT
    );

    res.json({
      success: true,
      data: {
        registryName,
        message: 'Schema association removed from registry successfully'
      }
    });
  } catch (error) {
    logger.error('Error removing schema from registry:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to remove schema from registry',
        code: 'REGISTRY_SCHEMA_REMOVE_ERROR'
      }
    });
  }
});

/**
 * GET /api/admin/registries/:registryName/schema
 * Get schema associated with a registry
 */
router.get('/admin/registries/:registryName/schema', async (req: Request, res: Response) => {
  try {
    const { registryName } = req.params;
    
    const schema = await registryService.getRegistrySchema(registryName);
    
    if (!schema) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No schema associated with this registry',
          code: 'SCHEMA_NOT_ASSOCIATED'
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
        updatedAt: schema.updatedAt
      }
    });
  } catch (error) {
    logger.error('Error getting registry schema:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get registry schema',
        code: 'REGISTRY_SCHEMA_GET_ERROR'
      }
    });
  }
});

/**
 * GET /api/admin/schemas/:schemaId/registries
 * Get all registries associated with a schema
 */
router.get('/admin/schemas/:schemaId/registries', async (req: Request, res: Response) => {
  try {
    const { schemaId } = req.params;
    
    const registries = await registryService.getRegistriesForSchema(schemaId);

    res.json({
      success: true,
      data: {
        schemaId,
        registries
      }
    });
  } catch (error) {
    logger.error('Error getting registries for schema:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get registries for schema',
        code: 'SCHEMA_REGISTRIES_GET_ERROR'
      }
    });
  }
});

/**
 * POST /api/admin/schemas/:schemaId/ensure-registry
 * Ensure a registry exists for a schema
 */
router.post('/admin/schemas/:schemaId/ensure-registry', async (req: Request, res: Response) => {
  try {
    const { schemaId } = req.params;
    const { identifierName } = req.body;

    if (!identifierName) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Identifier name is required',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    const registry = await registryService.ensureRegistryForSchema(
      identifierName,
      schemaId,
      req.headers.authorization ? 'admin' : undefined // TODO: Extract from JWT
    );

    res.json({
      success: true,
      data: {
        name: registry.name,
        registryName: registry.registryName,
        regk: registry.regk,
        state: registry.state,
        schemaId: registry.schemaId,
        created: registry.created
      }
    });
  } catch (error) {
    logger.error('Error ensuring registry for schema:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
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
        message: 'Failed to ensure registry for schema',
        code: 'REGISTRY_ENSURE_ERROR'
      }
    });
  }
});

/**
 * GET /api/admin/registries/stats
 * Get registry statistics
 */
router.get('/admin/registries/stats', async (req: Request, res: Response) => {
  try {
    const stats = await registryService.getRegistryStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting registry stats:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get registry stats',
        code: 'REGISTRY_STATS_ERROR'
      }
    });
  }
});

export { router as registryRoutes };