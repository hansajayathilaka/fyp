import { Schema, model, Document } from 'mongoose';
import { BaseDocument, baseSchemaOptions } from './BaseSchema';

export interface ICredentialSchema extends BaseDocument {
  id: string;
  name: string;
  description?: string;
  version: string;
  schemaData: Record<string, any>;
  isDefault: boolean;
  isActive: boolean;
  createdBy?: string;
}

const credentialSchemaSchema = new Schema<ICredentialSchema>({
  _id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
    unique: true,
    validate: {
      validator: function(name: string) {
        // Allow alphanumeric, spaces, hyphens, and underscores
        return /^[a-zA-Z0-9\s\-_]+$/.test(name);
      },
      message: 'Schema name can only contain letters, numbers, spaces, hyphens, and underscores'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  version: {
    type: String,
    default: '1.0.0',
    trim: true,
    validate: {
      validator: function(version: string) {
        // Semantic versioning pattern
        return /^\d+\.\d+\.\d+$/.test(version);
      },
      message: 'Version must follow semantic versioning (e.g., 1.0.0)'
    }
  },
  schemaData: {
    type: Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function(data: any) {
        const validation = (this.constructor as any).validateSchemaData(data);
        return validation.valid;
      },
      message: 'Schema data must be a valid JSON Schema object with type and properties'
    }
  },
  isDefault: {
    type: Boolean,
    default: false,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: String,
    ref: 'AdminUser'
  }
}, baseSchemaOptions);

// Indexes
credentialSchemaSchema.index({ name: 1 });
credentialSchemaSchema.index({ isDefault: 1 });
credentialSchemaSchema.index({ isActive: 1 });
credentialSchemaSchema.index({ createdAt: -1 });
credentialSchemaSchema.index({ name: 1, version: 1 }, { unique: true });
credentialSchemaSchema.index({ createdBy: 1 });

// Ensure only one default schema exists
credentialSchemaSchema.pre('save', async function(next) {
  if (this.isModified('isDefault') && (this as any).isDefault) {
    // Unset all other defaults
    await (this.constructor as any).updateMany(
      { _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Static methods
credentialSchemaSchema.statics.findDefault = function() {
  return this.findOne({ isDefault: true });
};

credentialSchemaSchema.statics.findByName = function(name: string) {
  return this.findOne({ name });
};

credentialSchemaSchema.statics.findPublic = function() {
  // Only return active schemas for public use
  return this.find({ isActive: true }).sort({ isDefault: -1, name: 1 });
};

credentialSchemaSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ isDefault: -1, name: 1 });
};

credentialSchemaSchema.statics.findByNameAndVersion = function(name: string, version: string) {
  return this.findOne({ name, version });
};

credentialSchemaSchema.statics.getVersions = function(name: string) {
  return this.find({ name }).sort({ version: -1 }).select('version createdAt');
};

credentialSchemaSchema.statics.setDefault = async function(id: string) {
  // Start transaction to ensure atomicity
  const session = await this.db.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Unset all defaults
      await this.updateMany({}, { $set: { isDefault: false } }, { session });
      
      // Set new default
      const result = await this.findByIdAndUpdate(
        id,
        { $set: { isDefault: true } },
        { new: true, session }
      );
      
      if (!result) {
        throw new Error('Schema not found');
      }
      
      return result;
    });
  } finally {
    await session.endSession();
  }
  
  return this.findById(id);
};

credentialSchemaSchema.statics.validateSchemaData = function(schemaData: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!schemaData || typeof schemaData !== 'object') {
    errors.push('Schema data must be an object');
    return { valid: false, errors };
  }

  // Required fields
  if (!schemaData.type) {
    errors.push('Schema must have a type field');
  } else if (schemaData.type !== 'object') {
    errors.push('Schema type must be "object" for credential schemas');
  }

  if (!schemaData.properties || typeof schemaData.properties !== 'object') {
    errors.push('Schema must have a properties field that is an object');
  }

  // Optional but validated fields
  if (schemaData.required && !Array.isArray(schemaData.required)) {
    errors.push('Schema required field must be an array');
  }

  if (schemaData.additionalProperties !== undefined && typeof schemaData.additionalProperties !== 'boolean') {
    errors.push('Schema additionalProperties must be a boolean');
  }

  // Validate properties structure
  if (schemaData.properties) {
    for (const [key, value] of Object.entries(schemaData.properties)) {
      if (!value || typeof value !== 'object') {
        errors.push(`Property '${key}' must be an object`);
        continue;
      }

      const prop = value as any;
      
      if (!prop.type) {
        errors.push(`Property '${key}' must have a type field`);
      } else {
        // Validate supported types
        const supportedTypes = ['string', 'number', 'integer', 'boolean', 'array', 'object'];
        if (!supportedTypes.includes(prop.type)) {
          errors.push(`Property '${key}' has unsupported type '${prop.type}'. Supported types: ${supportedTypes.join(', ')}`);
        }
      }

      // Validate string constraints
      if (prop.type === 'string') {
        if (prop.minLength !== undefined && (typeof prop.minLength !== 'number' || prop.minLength < 0)) {
          errors.push(`Property '${key}' minLength must be a non-negative number`);
        }
        if (prop.maxLength !== undefined && (typeof prop.maxLength !== 'number' || prop.maxLength < 0)) {
          errors.push(`Property '${key}' maxLength must be a non-negative number`);
        }
        if (prop.pattern !== undefined && typeof prop.pattern !== 'string') {
          errors.push(`Property '${key}' pattern must be a string`);
        }
      }

      // Validate number constraints
      if (prop.type === 'number' || prop.type === 'integer') {
        if (prop.minimum !== undefined && typeof prop.minimum !== 'number') {
          errors.push(`Property '${key}' minimum must be a number`);
        }
        if (prop.maximum !== undefined && typeof prop.maximum !== 'number') {
          errors.push(`Property '${key}' maximum must be a number`);
        }
      }

      // Validate array constraints
      if (prop.type === 'array') {
        if (prop.items && typeof prop.items !== 'object') {
          errors.push(`Property '${key}' items must be an object`);
        }
        if (prop.minItems !== undefined && (typeof prop.minItems !== 'number' || prop.minItems < 0)) {
          errors.push(`Property '${key}' minItems must be a non-negative number`);
        }
        if (prop.maxItems !== undefined && (typeof prop.maxItems !== 'number' || prop.maxItems < 0)) {
          errors.push(`Property '${key}' maxItems must be a non-negative number`);
        }
      }

      // Validate enum constraints
      if (prop.enum && !Array.isArray(prop.enum)) {
        errors.push(`Property '${key}' enum must be an array`);
      }
    }

    // Validate required fields exist in properties
    if (schemaData.required && Array.isArray(schemaData.required)) {
      for (const requiredField of schemaData.required) {
        if (typeof requiredField !== 'string') {
          errors.push('Required field names must be strings');
        } else if (!schemaData.properties[requiredField]) {
          errors.push(`Required field '${requiredField}' is not defined in properties`);
        }
      }
    }
  }

  // Validate schema metadata
  if (schemaData.$schema && typeof schemaData.$schema !== 'string') {
    errors.push('$schema must be a string');
  }

  if (schemaData.title && typeof schemaData.title !== 'string') {
    errors.push('title must be a string');
  }

  if (schemaData.description && typeof schemaData.description !== 'string') {
    errors.push('description must be a string');
  }

  return { valid: errors.length === 0, errors };
};

// Instance methods
credentialSchemaSchema.methods.makeDefault = async function() {
  // Unset all other defaults
  await (this.constructor as any).updateMany(
    { _id: { $ne: this._id } },
    { $set: { isDefault: false } }
  );
  
  (this as any).isDefault = true;
  return this.save();
};

credentialSchemaSchema.methods.activate = async function() {
  (this as any).isActive = true;
  return this.save();
};

credentialSchemaSchema.methods.deactivate = async function() {
  // Cannot deactivate the default schema
  if ((this as any).isDefault) {
    throw new Error('Cannot deactivate the default schema');
  }
  
  (this as any).isActive = false;
  return this.save();
};

credentialSchemaSchema.methods.validateSchemaData = function() {
  return (this.constructor as any).validateSchemaData((this as any).schemaData);
};

credentialSchemaSchema.methods.createNewVersion = async function(newVersion: string, updates: Partial<ICredentialSchema>) {
  // Check if version already exists
  const existingVersion = await (this.constructor as any).findByNameAndVersion((this as any).name, newVersion);
  if (existingVersion) {
    throw new Error(`Version ${newVersion} already exists for schema ${(this as any).name}`);
  }

  // Create new schema with updated version
  const newSchemaData = {
    ...this.toObject(),
    _id: `schema-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    version: newVersion,
    isDefault: false, // New versions are not default by default
    ...updates
  };

  delete newSchemaData.__v;
  delete newSchemaData.createdAt;
  delete newSchemaData.updatedAt;

  const newSchema = new (this.constructor as any)(newSchemaData);
  return newSchema.save();
};

export const CredentialSchema = model<ICredentialSchema>('CredentialSchema', credentialSchemaSchema);