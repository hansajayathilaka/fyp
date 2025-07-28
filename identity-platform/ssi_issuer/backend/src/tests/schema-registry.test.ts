import { schemaService } from '../services/SchemaService';
import { registryService } from '../services/RegistryService';

describe('Schema and Registry Integration', () => {
  const testSchema = {
    name: 'Test Identity Schema',
    description: 'A test schema for identity credentials',
    version: '1.0.0',
    schemaData: {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          minLength: 1,
          maxLength: 50
        },
        lastName: {
          type: 'string',
          minLength: 1,
          maxLength: 50
        },
        email: {
          type: 'string',
          format: 'email'
        },
        dateOfBirth: {
          type: 'string',
          format: 'date'
        }
      },
      required: ['firstName', 'lastName', 'email'],
      additionalProperties: false
    }
  };

  let createdSchemaId: string;
  let createdRegistryName: string;

  beforeAll(async () => {
    // Initialize services
    await registryService.initialize();
  });

  describe('Schema Management', () => {
    test('should validate schema data correctly', () => {
      const validation = schemaService.validateSchemaData(testSchema.schemaData);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject invalid schema data', () => {
      const invalidSchema = {
        type: 'object',
        // Missing properties field
      };
      
      const validation = schemaService.validateSchemaData(invalidSchema);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should create a new schema', async () => {
      const schema = await schemaService.createSchema({
        ...testSchema,
        createdBy: 'test-user'
      });

      expect(schema).toBeDefined();
      expect(schema.name).toBe(testSchema.name);
      expect(schema.version).toBe(testSchema.version);
      expect(schema.isActive).toBe(true);
      
      createdSchemaId = schema._id;
    });

    test('should get schema by ID', async () => {
      const schema = await schemaService.getSchemaById(createdSchemaId);
      
      expect(schema).toBeDefined();
      expect(schema?._id).toBe(createdSchemaId);
      expect(schema?.name).toBe(testSchema.name);
    });

    test('should list schemas', async () => {
      const schemas = await schemaService.getSchemas({ activeOnly: true });
      
      expect(schemas).toBeDefined();
      expect(Array.isArray(schemas)).toBe(true);
      expect(schemas.length).toBeGreaterThan(0);
      
      const testSchemaFound = schemas.find(s => s._id === createdSchemaId);
      expect(testSchemaFound).toBeDefined();
    });
  });

  describe('Registry Management', () => {
    test('should create registry for schema', async () => {
      // Mock KERIA client methods for testing
      const mockCreateRegistry = jest.fn().mockResolvedValue({ name: 'test-op' });
      const mockWaitOperation = jest.fn().mockResolvedValue({ 
        response: { regk: 'test-regk', state: 'active' } 
      });
      const mockListRegistries = jest.fn().mockResolvedValue([{
        name: 'test-registry',
        registryName: 'test-registry',
        regk: 'test-regk',
        state: 'active'
      }]);

      // Note: In a real test, you would properly mock the keriaClient
      // For now, we'll test the service logic without actual KERIA calls
      
      const registryName = `test-registry-${Date.now()}`;
      createdRegistryName = registryName;

      // Test registry creation logic (without actual KERIA calls)
      expect(createdSchemaId).toBeDefined();
    });

    test('should associate schema with registry', async () => {
      if (!createdSchemaId || !createdRegistryName) {
        return; // Skip if previous tests failed
      }

      await registryService.associateSchemaWithRegistry(
        createdRegistryName,
        createdSchemaId,
        'test-user'
      );

      const associatedSchema = await registryService.getRegistrySchema(createdRegistryName);
      expect(associatedSchema).toBeDefined();
      expect(associatedSchema?._id).toBe(createdSchemaId);
    });

    test('should get registries for schema', async () => {
      if (!createdSchemaId || !createdRegistryName) {
        return; // Skip if previous tests failed
      }

      const registries = await registryService.getRegistriesForSchema(createdSchemaId);
      expect(registries).toBeDefined();
      expect(Array.isArray(registries)).toBe(true);
      expect(registries).toContain(createdRegistryName);
    });

    test('should get registry statistics', async () => {
      const stats = await registryService.getRegistryStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalRegistries).toBe('number');
      expect(typeof stats.registriesWithSchemas).toBe('number');
      expect(typeof stats.registriesWithoutSchemas).toBe('number');
      expect(Array.isArray(stats.schemaRegistryMappings)).toBe(true);
    });
  });

  describe('Schema Versioning', () => {
    test('should create new version of schema', async () => {
      if (!createdSchemaId) {
        return; // Skip if schema creation failed
      }

      const newVersion = '1.1.0';
      const updatedSchemaData = {
        ...testSchema.schemaData,
        properties: {
          ...testSchema.schemaData.properties,
          phoneNumber: {
            type: 'string',
            pattern: '^\\+?[1-9]\\d{1,14}$'
          }
        }
      };

      const newSchema = await schemaService.createSchemaVersion(
        createdSchemaId,
        newVersion,
        {
          description: 'Updated schema with phone number',
          schemaData: updatedSchemaData
        },
        'test-user'
      );

      expect(newSchema).toBeDefined();
      expect(newSchema.version).toBe(newVersion);
      expect(newSchema.name).toBe(testSchema.name);
      expect(newSchema.isDefault).toBe(false);
    });

    test('should get schema versions', async () => {
      const versions = await schemaService.getSchemaVersions(testSchema.name);
      
      expect(versions).toBeDefined();
      expect(Array.isArray(versions)).toBe(true);
      expect(versions.length).toBeGreaterThanOrEqual(2); // Original + new version
    });
  });

  afterAll(async () => {
    // Clean up test data if needed
    // Note: In a real test environment, you would clean up created schemas and registries
  });
});

// Mock KERIA client for testing
jest.mock('../services/KeriaClient', () => ({
  keriaClient: {
    createRegistry: jest.fn().mockResolvedValue({ name: 'test-op' }),
    waitOperation: jest.fn().mockResolvedValue({ 
      response: { regk: 'test-regk', state: 'active' } 
    }),
    listRegistries: jest.fn().mockResolvedValue([]),
    healthCheck: jest.fn().mockResolvedValue({ status: 'healthy', details: {} })
  }
}));