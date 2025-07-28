import { Request, Response, NextFunction } from 'express';
import { body, query, param, validationResult } from 'express-validator';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      }
    });
  }
  
  next();
};

/**
 * Registration validation rules
 */
export const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Invalid phone number format'),
  
  body('organization')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Organization name cannot exceed 200 characters'),
  
  body('requestedSchemaId')
    .isMongoId()
    .withMessage('Valid schema ID is required'),
  
  body('applicationData')
    .isObject()
    .withMessage('Application data must be an object'),
  
  handleValidationErrors
];

/**
 * Registration update validation rules
 */
export const validateRegistrationUpdate = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Invalid phone number format'),
  
  body('organization')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Organization name cannot exceed 200 characters'),
  
  body('applicationData')
    .optional()
    .isObject()
    .withMessage('Application data must be an object'),
  
  handleValidationErrors
];

/**
 * MongoDB ObjectId validation
 */
export const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Valid ID is required'),
  
  handleValidationErrors
];

/**
 * Registration list query validation
 */
export const validateRegistrationQuery = [
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('Status must be pending, approved, or rejected'),
  
  query('connectionStatus')
    .optional()
    .isIn(['pending', 'connected', 'failed'])
    .withMessage('Connection status must be pending, connected, or failed'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'email', 'fullName', 'status'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  handleValidationErrors
];

/**
 * OOBI validation rules
 */
export const validateOOBI = [
  body('oobi')
    .isURL()
    .withMessage('Valid OOBI URL is required'),
  
  body('alias')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Alias must be alphanumeric with underscores and hyphens only'),
  
  handleValidationErrors
];

/**
 * Connection invitation validation
 */
export const validateConnectionInvitation = [
  body('contactAlias')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Contact alias must be alphanumeric with underscores and hyphens only'),
  
  handleValidationErrors
];

/**
 * Sanitize HTML to prevent XSS
 */
export const sanitizeHtml = (text: string): string => {
  return text.replace(/<[^>]*>/g, '').trim();
};

/**
 * Validate and sanitize application data
 */
export const validateApplicationData = (data: any, schema?: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Application data must be an object');
    return { valid: false, errors };
  }

  // If schema has required fields, validate them
  if (schema && schema.schemaData && schema.schemaData.required) {
    const requiredFields = schema.schemaData.required;
    
    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(`Required field '${field}' is missing`);
      }
    }
  }

  // Validate field types if schema defines them
  if (schema && schema.schemaData && schema.schemaData.properties) {
    const properties = schema.schemaData.properties;
    
    for (const [field, value] of Object.entries(data)) {
      if (properties[field]) {
        const fieldSchema = properties[field] as any;
        
        if (fieldSchema.type === 'string' && typeof value !== 'string') {
          errors.push(`Field '${field}' must be a string`);
        } else if (fieldSchema.type === 'number' && typeof value !== 'number') {
          errors.push(`Field '${field}' must be a number`);
        } else if (fieldSchema.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Field '${field}' must be a boolean`);
        }
        
        // Validate string length
        if (fieldSchema.type === 'string' && typeof value === 'string') {
          if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
            errors.push(`Field '${field}' must be at least ${fieldSchema.minLength} characters`);
          }
          if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
            errors.push(`Field '${field}' cannot exceed ${fieldSchema.maxLength} characters`);
          }
        }
        
        // Validate number range
        if (fieldSchema.type === 'number' && typeof value === 'number') {
          if (fieldSchema.minimum !== undefined && value < fieldSchema.minimum) {
            errors.push(`Field '${field}' must be at least ${fieldSchema.minimum}`);
          }
          if (fieldSchema.maximum !== undefined && value > fieldSchema.maximum) {
            errors.push(`Field '${field}' cannot exceed ${fieldSchema.maximum}`);
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
};