import { keriaClient } from './KeriaClient';
import { schemaService } from './SchemaService';
import { Transaction } from '../models/Transaction';
import { logger } from '../utils/logger';

export interface RegistryInfo {
  name: string;
  registryName: string;
  regk: string;
  state: any;
  schemaId?: string;
  created: Date;
}

export interface CreateRegistryRequest {
  name: string;
  registryName: string;
  schemaId?: string;
  createdBy?: string;
}

export class RegistryService {
  private static instance: RegistryService;
  private registrySchemaMapping: Map<string, string> = new Map(); // registryName -> schemaId

  public static getInstance(): RegistryService {
    if (!RegistryService.instance) {
      RegistryService.instance = new RegistryService();
    }
    return RegistryService.instance;
  }

  /**
   * Create a new registry in KERIA
   */
  async createRegistry(request: CreateRegistryRequest): Promise<RegistryInfo> {
    try {
      logger.info(`Creating registry: ${request.registryName} for identifier: ${request.name}`);

      // Validate schema if provided
      if (request.schemaId) {
        const schema = await schemaService.getSchemaById(request.schemaId);
        if (!schema) {
          throw new Error(`Schema with ID ${request.schemaId} not found`);
        }
        if (!schema.isActive) {
          throw new Error(`Schema ${schema.name} is not active`);
        }
      }

      // Create registry using KERIA client
      const registryOp = await keriaClient.createRegistry(request.name, request.registryName);

      // Wait for the operation to complete
      const completedOp = await keriaClient.waitOperation(registryOp);

      // Get registry details
      const registries = await keriaClient.listRegistries(request.name);
      const registry = registries.find(r => r.name === request.registryName);

      if (!registry) {
        throw new Error(`Registry ${request.registryName} not found after creation`);
      }

      const registryInfo: RegistryInfo = {
        name: request.name,
        registryName: request.registryName,
        regk: registry.regk || completedOp.response?.regk,
        state: registry.state || completedOp.response?.state,
        schemaId: request.schemaId,
        created: new Date()
      };

      // Store schema mapping if provided
      if (request.schemaId) {
        this.registrySchemaMapping.set(request.registryName, request.schemaId);
      }

      // Log transaction
      await Transaction.log(
        'registry_created',
        'registry',
        request.registryName,
        {
          identifierName: request.name,
          registryName: request.registryName,
          schemaId: request.schemaId,
          regk: registryInfo.regk,
          action: 'create'
        },
        request.createdBy,
        'info'
      );

      logger.info(`Registry created successfully: ${request.registryName} (${registryInfo.regk})`);

      return registryInfo;
    } catch (error) {
      logger.error(`Failed to create registry ${request.registryName}:`, error);
      throw error;
    }
  }

  /**
   * List all registries for an identifier
   */
  async listRegistries(identifierName?: string): Promise<RegistryInfo[]> {
    try {
      const registries = await keriaClient.listRegistries(identifierName);

      const registryInfos: RegistryInfo[] = registries.map(registry => ({
        name: registry.name || identifierName || 'unknown',
        registryName: registry.registryName || registry.name,
        regk: registry.regk,
        state: registry.state,
        schemaId: this.registrySchemaMapping.get(registry.registryName || registry.name),
        created: registry.created ? new Date(registry.created) : new Date()
      }));

      return registryInfos;
    } catch (error) {
      logger.error('Failed to list registries:', error);
      throw error;
    }
  }

  /**
   * Get registry by name
   */
  async getRegistry(identifierName: string, registryName: string): Promise<RegistryInfo | null> {
    try {
      const registries = await this.listRegistries(identifierName);
      return registries.find(r => r.registryName === registryName) || null;
    } catch (error) {
      logger.error(`Failed to get registry ${registryName}:`, error);
      throw error;
    }
  }

  /**
   * Associate a schema with a registry
   */
  async associateSchemaWithRegistry(
    registryName: string, 
    schemaId: string, 
    updatedBy?: string
  ): Promise<void> {
    try {
      // Validate schema exists and is active
      const schema = await schemaService.getSchemaById(schemaId);
      if (!schema) {
        throw new Error(`Schema with ID ${schemaId} not found`);
      }
      if (!schema.isActive) {
        throw new Error(`Schema ${schema.name} is not active`);
      }

      // Store the mapping
      this.registrySchemaMapping.set(registryName, schemaId);

      // Log transaction
      await Transaction.log(
        'registry_schema_associated',
        'registry',
        registryName,
        {
          registryName,
          schemaId,
          schemaName: schema.name,
          action: 'associate_schema'
        },
        updatedBy,
        'info'
      );

      logger.info(`Schema ${schema.name} associated with registry ${registryName}`);
    } catch (error) {
      logger.error(`Failed to associate schema with registry ${registryName}:`, error);
      throw error;
    }
  }

  /**
   * Remove schema association from registry
   */
  async removeSchemaFromRegistry(registryName: string, updatedBy?: string): Promise<void> {
    try {
      const schemaId = this.registrySchemaMapping.get(registryName);
      
      // Remove the mapping
      this.registrySchemaMapping.delete(registryName);

      // Log transaction
      await Transaction.log(
        'registry_schema_removed',
        'registry',
        registryName,
        {
          registryName,
          previousSchemaId: schemaId,
          action: 'remove_schema'
        },
        updatedBy,
        'info'
      );

      logger.info(`Schema association removed from registry ${registryName}`);
    } catch (error) {
      logger.error(`Failed to remove schema from registry ${registryName}:`, error);
      throw error;
    }
  }

  /**
   * Get schema associated with a registry
   */
  async getRegistrySchema(registryName: string): Promise<any | null> {
    try {
      const schemaId = this.registrySchemaMapping.get(registryName);
      if (!schemaId) {
        return null;
      }

      return await schemaService.getSchemaById(schemaId);
    } catch (error) {
      logger.error(`Failed to get schema for registry ${registryName}:`, error);
      throw error;
    }
  }

  /**
   * Get all registries associated with a schema
   */
  async getRegistriesForSchema(schemaId: string): Promise<string[]> {
    try {
      const registries: string[] = [];
      
      for (const [registryName, mappedSchemaId] of this.registrySchemaMapping.entries()) {
        if (mappedSchemaId === schemaId) {
          registries.push(registryName);
        }
      }

      return registries;
    } catch (error) {
      logger.error(`Failed to get registries for schema ${schemaId}:`, error);
      throw error;
    }
  }

  /**
   * Create registry for schema if it doesn't exist
   */
  async ensureRegistryForSchema(
    identifierName: string,
    schemaId: string,
    createdBy?: string
  ): Promise<RegistryInfo> {
    try {
      const schema = await schemaService.getSchemaById(schemaId);
      if (!schema) {
        throw new Error(`Schema with ID ${schemaId} not found`);
      }

      // Generate registry name based on schema name
      const registryName = `registry-${schema.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${schema.version.replace(/\./g, '-')}`;

      // Check if registry already exists
      const existingRegistry = await this.getRegistry(identifierName, registryName);
      if (existingRegistry) {
        // Ensure schema is associated
        if (!existingRegistry.schemaId) {
          await this.associateSchemaWithRegistry(registryName, schemaId, createdBy);
          existingRegistry.schemaId = schemaId;
        }
        return existingRegistry;
      }

      // Create new registry
      return await this.createRegistry({
        name: identifierName,
        registryName,
        schemaId,
        createdBy
      });
    } catch (error) {
      logger.error(`Failed to ensure registry for schema ${schemaId}:`, error);
      throw error;
    }
  }

  /**
   * Get registry statistics
   */
  async getRegistryStats(): Promise<{
    totalRegistries: number;
    registriesWithSchemas: number;
    registriesWithoutSchemas: number;
    schemaRegistryMappings: Array<{ registryName: string; schemaId: string; schemaName?: string }>;
  }> {
    try {
      const allRegistries = await this.listRegistries();
      const totalRegistries = allRegistries.length;
      const registriesWithSchemas = allRegistries.filter(r => r.schemaId).length;
      const registriesWithoutSchemas = totalRegistries - registriesWithSchemas;

      const schemaRegistryMappings = [];
      for (const [registryName, schemaId] of this.registrySchemaMapping.entries()) {
        const schema = await schemaService.getSchemaById(schemaId);
        schemaRegistryMappings.push({
          registryName,
          schemaId,
          schemaName: schema?.name
        });
      }

      return {
        totalRegistries,
        registriesWithSchemas,
        registriesWithoutSchemas,
        schemaRegistryMappings
      };
    } catch (error) {
      logger.error('Failed to get registry stats:', error);
      throw error;
    }
  }

  /**
   * Initialize registry service - load existing mappings
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Registry Service...');

      // TODO: In a production system, you would load existing mappings from a persistent store
      // For now, we'll start with an empty mapping and build it as registries are created/associated

      logger.info('Registry Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Registry Service:', error);
      throw error;
    }
  }

  /**
   * Health check for registry service
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      // Check if we can list registries
      const registries = await this.listRegistries();
      
      return {
        status: 'healthy',
        details: {
          totalRegistries: registries.length,
          mappingsCount: this.registrySchemaMapping.size,
          canListRegistries: true
        }
      };
    } catch (error) {
      return {
        status: 'error',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          canListRegistries: false
        }
      };
    }
  }
}

export const registryService = RegistryService.getInstance();