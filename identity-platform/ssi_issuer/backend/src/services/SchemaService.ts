import { CredentialSchema, ICredentialSchema } from '../models/CredentialSchema';
import { Transaction } from '../models/Transaction';
import { logger } from '../utils/logger';

export interface CreateSchemaRequest {
  name: string;
  description?: string;
  version?: string;
  schemaData: Record<string, any>;
  isDefault?: boolean;
  createdBy?: string;
}

export interface UpdateSchemaRequest {
  name?: string;
  description?: string;
  schemaData?: Record<string, any>;
  isActive?: boolean;
}

export class SchemaService {
  private static instance: SchemaService;

  public static getInstance(): SchemaService {
    if (!SchemaService.instance) {
      SchemaService.instance = new SchemaService();
    }
    return SchemaService.instance;
  }

  /**
   * Create a new credential schema
   */
  async createSchema(request: CreateSchemaRequest): Promise<ICredentialSchema> {
    try {
      // Validate schema data
      const validation = CredentialSchema.validateSchemaData(request.schemaData);
      if (!validation.valid) {
        throw new Error(`Schema validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if schema with same name already exists
      const existingSchema = await CredentialSchema.findByName(request.name);
      if (existingSchema) {
        throw new Error('Schema with this name already exists');
      }

      // Generate unique ID for schema
      const schemaId = `schema-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create new schema
      const newSchema = new CredentialSchema({
        _id: schemaId,
        name: request.name.trim(),
        description: request.description?.trim(),
        version: request.version || '1.0.0',
        schemaData: request.schemaData,
        isDefault: request.isDefault || false,
        isActive: true,
        createdBy: request.createdBy
      });

      const savedSchema = await newSchema.save();

      // Log transaction
      await Transaction.log(
        'schema_created',
        'schema',
        savedSchema._id,
        {
          name: savedSchema.name,
          version: savedSchema.version,
          isDefault: savedSchema.isDefault,
          action: 'create'
        },
        request.createdBy,
        'info'
      );

      logger.info(`Schema created: ${savedSchema.name} v${savedSchema.version} (${savedSchema._id})`);

      return savedSchema;
    } catch (error) {
      logger.error('Error creating schema:', error);
      throw error;
    }
  }

  /**
   * Get all schemas with optional filtering
   */
  async getSchemas(options: { activeOnly?: boolean; publicOnly?: boolean } = {}): Promise<ICredentialSchema[]> {
    try {
      let query = CredentialSchema.find({});

      if (options.activeOnly) {
        query = query.where({ isActive: true });
      }

      if (options.publicOnly) {
        query = query.where({ isActive: true });
      }

      const schemas = await query
        .sort({ isDefault: -1, name: 1 })
        .select('_id name description version schemaData isDefault isActive createdAt updatedAt createdBy');

      return schemas;
    } catch (error) {
      logger.error('Error getting schemas:', error);
      throw error;
    }
  }

  /**
   * Get schema by ID
   */
  async getSchemaById(id: string): Promise<ICredentialSchema | null> {
    try {
      return await CredentialSchema.findById(id);
    } catch (error) {
      logger.error(`Error getting schema ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get schema by name
   */
  async getSchemaByName(name: string): Promise<ICredentialSchema | null> {
    try {
      return await CredentialSchema.findByName(name);
    } catch (error) {
      logger.error(`Error getting schema by name ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get default schema
   */
  async getDefaultSchema(): Promise<ICredentialSchema | null> {
    try {
      return await CredentialSchema.findDefault();
    } catch (error) {
      logger.error('Error getting default schema:', error);
      throw error;
    }
  }

  /**
   * Set schema as default
   */
  async setDefaultSchema(id: string, updatedBy?: string): Promise<ICredentialSchema> {
    try {
      // Check if schema exists
      const schema = await CredentialSchema.findById(id);
      if (!schema) {
        throw new Error('Schema not found');
      }

      if (!schema.isActive) {
        throw new Error('Cannot set inactive schema as default');
      }

      // Get current default for logging
      const currentDefault = await CredentialSchema.findDefault();

      // Set as default using atomic operation
      await CredentialSchema.setDefault(id);

      // Get updated schema
      const updatedSchema = await CredentialSchema.findById(id);
      if (!updatedSchema) {
        throw new Error('Failed to retrieve updated schema');
      }

      // Log transaction
      await Transaction.log(
        'schema_updated',
        'schema',
        id,
        {
          name: updatedSchema.name,
          action: 'set_default',
          previousDefault: currentDefault?._id || null
        },
        updatedBy,
        'info'
      );

      logger.info(`Schema set as default: ${updatedSchema.name} v${updatedSchema.version} (${id})`);

      return updatedSchema;
    } catch (error) {
      logger.error(`Error setting default schema ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update schema
   */
  async updateSchema(id: string, updates: UpdateSchemaRequest, updatedBy?: string): Promise<ICredentialSchema> {
    try {
      const schema = await CredentialSchema.findById(id);
      if (!schema) {
        throw new Error('Schema not found');
      }

      // Validate schema data if provided
      if (updates.schemaData) {
        const validation = CredentialSchema.validateSchemaData(updates.schemaData);
        if (!validation.valid) {
          throw new Error(`Schema validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Check if name change conflicts with existing schema
      if (updates.name && updates.name !== schema.name) {
        const existingSchema = await CredentialSchema.findByName(updates.name);
        if (existingSchema && existingSchema._id !== id) {
          throw new Error('Schema with this name already exists');
        }
      }

      // Apply updates
      Object.assign(schema, updates);
      const updatedSchema = await schema.save();

      // Log transaction
      await Transaction.log(
        'schema_updated',
        'schema',
        id,
        {
          name: updatedSchema.name,
          action: 'update',
          changes: updates
        },
        updatedBy,
        'info'
      );

      logger.info(`Schema updated: ${updatedSchema.name} v${updatedSchema.version} (${id})`);

      return updatedSchema;
    } catch (error) {
      logger.error(`Error updating schema ${id}:`, error);
      throw error;
    }
  }

  /**
   * Activate schema
   */
  async activateSchema(id: string, updatedBy?: string): Promise<ICredentialSchema> {
    try {
      const schema = await CredentialSchema.findById(id);
      if (!schema) {
        throw new Error('Schema not found');
      }

      if (schema.isActive) {
        return schema; // Already active
      }

      await schema.activate();

      // Log transaction
      await Transaction.log(
        'schema_activated',
        'schema',
        id,
        {
          name: schema.name,
          action: 'activate'
        },
        updatedBy,
        'info'
      );

      logger.info(`Schema activated: ${schema.name} v${schema.version} (${id})`);

      return schema;
    } catch (error) {
      logger.error(`Error activating schema ${id}:`, error);
      throw error;
    }
  }

  /**
   * Deactivate schema
   */
  async deactivateSchema(id: string, updatedBy?: string): Promise<ICredentialSchema> {
    try {
      const schema = await CredentialSchema.findById(id);
      if (!schema) {
        throw new Error('Schema not found');
      }

      if (!schema.isActive) {
        return schema; // Already inactive
      }

      if (schema.isDefault) {
        throw new Error('Cannot deactivate the default schema');
      }

      await schema.deactivate();

      // Log transaction
      await Transaction.log(
        'schema_deactivated',
        'schema',
        id,
        {
          name: schema.name,
          action: 'deactivate'
        },
        updatedBy,
        'info'
      );

      logger.info(`Schema deactivated: ${schema.name} v${schema.version} (${id})`);

      return schema;
    } catch (error) {
      logger.error(`Error deactivating schema ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create new version of existing schema
   */
  async createSchemaVersion(
    id: string, 
    newVersion: string, 
    updates: Partial<CreateSchemaRequest>,
    createdBy?: string
  ): Promise<ICredentialSchema> {
    try {
      const originalSchema = await CredentialSchema.findById(id);
      if (!originalSchema) {
        throw new Error('Original schema not found');
      }

      // Validate new version format
      if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
        throw new Error('Version must follow semantic versioning (e.g., 1.0.0)');
      }

      // Check if version already exists
      const existingVersion = await CredentialSchema.findByNameAndVersion(originalSchema.name, newVersion);
      if (existingVersion) {
        throw new Error(`Version ${newVersion} already exists for schema ${originalSchema.name}`);
      }

      // Validate schema data if provided
      const schemaData = updates.schemaData || originalSchema.schemaData;
      const validation = CredentialSchema.validateSchemaData(schemaData);
      if (!validation.valid) {
        throw new Error(`Schema validation failed: ${validation.errors.join(', ')}`);
      }

      // Create new version
      const newSchema = await originalSchema.createNewVersion(newVersion, {
        ...updates,
        schemaData,
        createdBy
      });

      // Log transaction
      await Transaction.log(
        'schema_created',
        'schema',
        newSchema._id,
        {
          name: newSchema.name,
          version: newSchema.version,
          action: 'create_version',
          originalSchemaId: id,
          originalVersion: originalSchema.version
        },
        createdBy,
        'info'
      );

      logger.info(`Schema version created: ${newSchema.name} v${newSchema.version} (${newSchema._id})`);

      return newSchema;
    } catch (error) {
      logger.error(`Error creating schema version for ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all versions of a schema
   */
  async getSchemaVersions(name: string): Promise<any[]> {
    try {
      return await CredentialSchema.getVersions(name);
    } catch (error) {
      logger.error(`Error getting schema versions for ${name}:`, error);
      throw error;
    }
  }

  /**
   * Validate schema data
   */
  validateSchemaData(schemaData: any): { valid: boolean; errors: string[] } {
    return CredentialSchema.validateSchemaData(schemaData);
  }
}

export const schemaService = SchemaService.getInstance();