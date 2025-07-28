import { logger } from '../utils/logger';
import { AdminUser, CredentialSchema, Transaction } from '../models';

export class DatabaseSeeder {
  public static async seedDefaultData(): Promise<void> {
    try {
      logger.info('Seeding default data...');

      await this.createDefaultAdmin();
      await this.createDefaultSchema();

      logger.info('Default data seeded successfully');
    } catch (error) {
      logger.error('Failed to seed default data:', error);
      throw error;
    }
  }

  private static async createDefaultAdmin(): Promise<void> {
    try {
      const existingAdmin = await AdminUser.findByUsername('admin');
      
      if (!existingAdmin) {
        await AdminUser.createAdmin('admin', 'admin123', 'admin@ssi-issuer.local');
        
        // Log the creation
        await Transaction.log('registration', 'admin', {
          action: 'default_admin_created',
          username: 'admin',
          email: 'admin@ssi-issuer.local'
        });
        
        logger.info('Default admin user created (username: admin, password: admin123)');
      } else {
        logger.info('Default admin user already exists');
      }
    } catch (error) {
      logger.error('Failed to create default admin:', error);
      throw error;
    }
  }

  private static async createDefaultSchema(): Promise<void> {
    try {
      const existingSchema = await CredentialSchema.findById('basic-identity-credential');
      
      if (!existingSchema) {
        const defaultSchemaData = {
          type: 'object',
          properties: {
            fullName: { 
              type: 'string', 
              title: 'Full Name',
              description: 'The full legal name of the credential holder'
            },
            email: { 
              type: 'string', 
              format: 'email', 
              title: 'Email Address',
              description: 'Primary email address of the credential holder'
            },
            organization: { 
              type: 'string', 
              title: 'Organization',
              description: 'Organization or company the credential holder is associated with'
            },
            position: { 
              type: 'string', 
              title: 'Position/Role',
              description: 'Job title or role within the organization'
            },
            issuedDate: { 
              type: 'string', 
              format: 'date', 
              title: 'Issued Date',
              description: 'Date when the credential was issued'
            }
          },
          required: ['fullName', 'email'],
          additionalProperties: false
        };

        const schema = new CredentialSchema({
          _id: 'basic-identity-credential',
          name: 'Basic Identity Credential',
          description: 'A basic identity credential containing name, email, and organization information',
          schemaData: defaultSchemaData,
          isDefault: true
        });

        await schema.save();
        
        // Log the creation
        await Transaction.log('schema', 'basic-identity-credential', {
          action: 'default_schema_created',
          name: 'Basic Identity Credential',
          is_default: true
        });
        
        logger.info('Default schema created: Basic Identity Credential');
      } else {
        logger.info('Default schema already exists');
      }
    } catch (error) {
      logger.error('Failed to create default schema:', error);
      throw error;
    }
  }

  public static async createSampleData(): Promise<void> {
    try {
      logger.info('Creating sample data for development...');

      // Create additional sample schemas
      await this.createSampleSchemas();
      
      logger.info('Sample data created successfully');
    } catch (error) {
      logger.error('Failed to create sample data:', error);
      throw error;
    }
  }

  private static async createSampleSchemas(): Promise<void> {
    const sampleSchemas = [
      {
        id: 'employee-credential',
        name: 'Employee Credential',
        description: 'Employee identification and role credential',
        schemaData: {
          type: 'object',
          properties: {
            employeeId: { type: 'string', title: 'Employee ID' },
            fullName: { type: 'string', title: 'Full Name' },
            email: { type: 'string', format: 'email', title: 'Email' },
            department: { type: 'string', title: 'Department' },
            position: { type: 'string', title: 'Position' },
            startDate: { type: 'string', format: 'date', title: 'Start Date' },
            manager: { type: 'string', title: 'Manager' }
          },
          required: ['employeeId', 'fullName', 'email', 'department', 'position']
        }
      },
      {
        id: 'student-credential',
        name: 'Student Credential',
        description: 'Student identification and enrollment credential',
        schemaData: {
          type: 'object',
          properties: {
            studentId: { type: 'string', title: 'Student ID' },
            fullName: { type: 'string', title: 'Full Name' },
            email: { type: 'string', format: 'email', title: 'Email' },
            program: { type: 'string', title: 'Program of Study' },
            year: { type: 'integer', title: 'Year of Study' },
            enrollmentDate: { type: 'string', format: 'date', title: 'Enrollment Date' },
            expectedGraduation: { type: 'string', format: 'date', title: 'Expected Graduation' }
          },
          required: ['studentId', 'fullName', 'email', 'program', 'year']
        }
      }
    ];

    for (const schemaData of sampleSchemas) {
      const existing = await CredentialSchema.findById(schemaData.id);
      if (!existing) {
        const schema = new CredentialSchema({
          _id: schemaData.id,
          name: schemaData.name,
          description: schemaData.description,
          schemaData: schemaData.schemaData,
          isDefault: false
        });

        await schema.save();
        
        await Transaction.log('schema', schemaData.id, {
          action: 'sample_schema_created',
          name: schemaData.name
        });
        
        logger.info(`Sample schema created: ${schemaData.name}`);
      }
    }
  }
}