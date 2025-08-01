import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variable validation types
interface EnvVarConfig {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'url' | 'email';
  defaultValue?: string | number | boolean;
  validator?: (value: string) => boolean;
  description: string;
}

// Configuration validation results
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingRequired: string[];
  invalidValues: string[];
}

// Environment variable definitions with validation rules
const envVarDefinitions: EnvVarConfig[] = [
  // Server configuration
  {
    name: 'PORT',
    required: false,
    type: 'number',
    defaultValue: 3001,
    validator: (value) => {
      const port = parseInt(value, 10);
      return port > 0 && port < 65536;
    },
    description: 'Server port number (1-65535)'
  },
  {
    name: 'NODE_ENV',
    required: false,
    type: 'string',
    defaultValue: 'development',
    validator: (value) => ['development', 'production', 'test'].includes(value),
    description: 'Node.js environment (development, production, test)'
  },
  
  // Session configuration
  {
    name: 'SESSION_SECRET',
    required: true,
    type: 'string',
    validator: (value) => value.length >= 32,
    description: 'Session secret key (minimum 32 characters)'
  },
  
  // Truvera API configuration
  {
    name: 'TRUVERA_API_URL',
    required: true,
    type: 'url',
    validator: (value) => {
      try {
        const url = new URL(value);
        return url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'http:');
      } catch {
        return false;
      }
    },
    description: 'Truvera API base URL (must be HTTPS in production)'
  },
  {
    name: 'TRUVERA_API_KEY',
    required: true,
    type: 'string',
    validator: (value) => value.length >= 10,
    description: 'Truvera API authentication key (minimum 10 characters)'
  },
  {
    name: 'TRUVERA_API_TIMEOUT',
    required: false,
    type: 'number',
    defaultValue: 30000,
    validator: (value) => {
      const timeout = parseInt(value, 10);
      return timeout >= 1000 && timeout <= 300000; // 1s to 5min
    },
    description: 'Truvera API timeout in milliseconds (1000-300000)'
  },
  
  // Credential configuration
  {
    name: 'ISSUER_DID',
    required: true,
    type: 'string',
    validator: (value) => value.startsWith('did:') && value.length > 10,
    description: 'Issuer DID (must start with "did:" and be at least 10 characters)'
  },
  {
    name: 'CREDENTIAL_SCHEMA_URL',
    required: false,
    type: 'url',
    defaultValue: 'https://schema.truvera.io/deip-access-credential',
    validator: (value) => {
      try {
        const url = new URL(value);
        return url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'http:');
      } catch {
        return false;
      }
    },
    description: 'Credential schema URL (must be HTTPS in production)'
  },
  {
    name: 'CREDENTIAL_EXPIRATION_HOURS',
    required: false,
    type: 'number',
    defaultValue: 8760, // 1 year
    validator: (value) => {
      const hours = parseInt(value, 10);
      return hours >= 1 && hours <= 87600; // 1 hour to 10 years
    },
    description: 'Credential expiration time in hours (1-87600)'
  },
  
  // Security configuration
  {
    name: 'RATE_LIMIT_MAX',
    required: false,
    type: 'number',
    defaultValue: 100,
    validator: (value) => {
      const limit = parseInt(value, 10);
      return limit >= 1 && limit <= 10000;
    },
    description: 'Maximum requests per window (1-10000)'
  },
  {
    name: 'RATE_LIMIT_WINDOW_MS',
    required: false,
    type: 'number',
    defaultValue: 900000, // 15 minutes
    validator: (value) => {
      const window = parseInt(value, 10);
      return window >= 60000 && window <= 3600000; // 1 minute to 1 hour
    },
    description: 'Rate limit window in milliseconds (60000-3600000)'
  },
  {
    name: 'CORS_ORIGINS',
    required: false,
    type: 'string',
    description: 'Comma-separated list of allowed CORS origins'
  },
  {
    name: 'FRONTEND_URL',
    required: false,
    type: 'url',
    defaultValue: 'http://localhost:3000',
    description: 'Frontend application URL'
  },
  
  // Logging configuration
  {
    name: 'LOG_LEVEL',
    required: false,
    type: 'string',
    defaultValue: 'info',
    validator: (value) => ['error', 'warn', 'info', 'debug'].includes(value),
    description: 'Logging level (error, warn, info, debug)'
  }
];

/**
 * Validate a single environment variable
 */
function validateEnvVar(envVar: EnvVarConfig): { isValid: boolean; error?: string; warning?: string } {
  const value = process.env[envVar.name];
  
  // Check if required variable is missing
  if (envVar.required && !value) {
    return {
      isValid: false,
      error: `Required environment variable ${envVar.name} is missing. ${envVar.description}`
    };
  }
  
  // Skip validation if optional variable is not set
  if (!value) {
    return { isValid: true };
  }
  
  // Type validation
  switch (envVar.type) {
    case 'number':
      if (isNaN(Number(value))) {
        return {
          isValid: false,
          error: `Environment variable ${envVar.name} must be a number. ${envVar.description}`
        };
      }
      break;
      
    case 'boolean':
      if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
        return {
          isValid: false,
          error: `Environment variable ${envVar.name} must be a boolean (true/false/1/0). ${envVar.description}`
        };
      }
      break;
      
    case 'url':
      try {
        new URL(value);
      } catch {
        return {
          isValid: false,
          error: `Environment variable ${envVar.name} must be a valid URL. ${envVar.description}`
        };
      }
      break;
      
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return {
          isValid: false,
          error: `Environment variable ${envVar.name} must be a valid email address. ${envVar.description}`
        };
      }
      break;
  }
  
  // Custom validation
  if (envVar.validator && !envVar.validator(value)) {
    return {
      isValid: false,
      error: `Environment variable ${envVar.name} failed validation. ${envVar.description}`
    };
  }
  
  // Production-specific warnings
  if (process.env.NODE_ENV === 'production') {
    if (envVar.name === 'SESSION_SECRET' && value === 'your-secret-key-change-in-production') {
      return {
        isValid: false,
        error: 'SESSION_SECRET must be changed from default value in production'
      };
    }
    
    if (envVar.name === 'TRUVERA_API_URL' && value.startsWith('http://')) {
      return {
        isValid: true,
        warning: 'TRUVERA_API_URL should use HTTPS in production for security'
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Comprehensive environment validation
 */
function validateEnvironment(): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    missingRequired: [],
    invalidValues: []
  };
  
  for (const envVar of envVarDefinitions) {
    const validation = validateEnvVar(envVar);
    
    if (!validation.isValid) {
      result.isValid = false;
      if (validation.error) {
        result.errors.push(validation.error);
        if (envVar.required && !process.env[envVar.name]) {
          result.missingRequired.push(envVar.name);
        } else {
          result.invalidValues.push(envVar.name);
        }
      }
    }
    
    if (validation.warning) {
      result.warnings.push(validation.warning);
    }
  }
  
  return result;
}

// Perform initial validation
const validationResult = validateEnvironment();

// Log validation results
if (validationResult.errors.length > 0) {
  console.error('❌ Environment validation failed:');
  validationResult.errors.forEach(error => console.error(`  - ${error}`));
}

if (validationResult.warnings.length > 0) {
  console.warn('⚠️  Environment validation warnings:');
  validationResult.warnings.forEach(warning => console.warn(`  - ${warning}`));
}

// Exit on validation failure in production
if (!validationResult.isValid && process.env.NODE_ENV === 'production') {
  console.error('❌ Cannot start server due to environment validation errors');
  process.exit(1);
}

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Session configuration
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  sessionMaxAge: 24 * 60 * 60 * 1000, // 24 hours
  
  // Truvera API configuration
  truvera: {
    apiUrl: process.env.TRUVERA_API_URL || 'https://api.truvera.io',
    apiKey: process.env.TRUVERA_API_KEY || '',
    timeout: parseInt(process.env.TRUVERA_API_TIMEOUT || '30000', 10),
  },
  
  // Credential configuration
  credential: {
    issuerDid: process.env.ISSUER_DID || '',
    schemaUrl: process.env.CREDENTIAL_SCHEMA_URL || 'https://schema.truvera.io/deip-access-credential',
    expirationHours: parseInt(process.env.CREDENTIAL_EXPIRATION_HOURS || '8760', 10), // 1 year default
  },
  
  // Security configuration
  security: {
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    corsOrigins: process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()) : [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
        'http://localhost:5173',
        // Allow local network access patterns
        /^http:\/\/192\.168\.\d+\.\d+:3000$/,
        /^http:\/\/10\.\d+\.\d+\.\d+:3000$/,
        /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:3000$/,
      ],
  },
  
  // Development flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableDebug: process.env.NODE_ENV === 'development',
  }
};

/**
 * Health check interface
 */
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      message: string;
      timestamp: string;
      responseTime?: number;
    };
  };
  timestamp: string;
  uptime: number;
}



/**
 * Perform comprehensive health check
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();
  
  const checks: HealthCheckResult['checks'] = {};
  
  // Environment validation check
  const envValidation = validateEnvironment();
  checks.environment = {
    status: envValidation.isValid ? 'pass' : 'fail',
    message: envValidation.isValid 
      ? 'Environment configuration is valid'
      : `Environment validation failed: ${envValidation.errors.join(', ')}`,
    timestamp
  };
  
  // Memory usage check
  const memUsage = process.memoryUsage();
  const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const memLimitMB = 512; // Warning threshold
  
  checks.memory = {
    status: memUsageMB > memLimitMB ? 'warn' : 'pass',
    message: `Memory usage: ${memUsageMB}MB (heap used)`,
    timestamp
  };
  
  // Skip Truvera API connectivity check - will be validated during actual usage
  
  // Configuration completeness check
  const requiredForProduction = ['TRUVERA_API_KEY', 'ISSUER_DID', 'SESSION_SECRET'];
  const missingInProd = config.isProduction 
    ? requiredForProduction.filter(key => !process.env[key] || process.env[key] === 'your-secret-key-change-in-production')
    : [];
  
  checks.configuration = {
    status: missingInProd.length > 0 ? 'fail' : 'pass',
    message: missingInProd.length > 0 
      ? `Missing production configuration: ${missingInProd.join(', ')}`
      : 'Configuration is complete',
    timestamp
  };
  
  // Determine overall status
  const failedChecks = Object.values(checks).filter(check => check.status === 'fail');
  const warnChecks = Object.values(checks).filter(check => check.status === 'warn');
  
  let status: HealthCheckResult['status'];
  if (failedChecks.length > 0) {
    status = 'unhealthy';
  } else if (warnChecks.length > 0) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }
  
  return {
    status,
    checks,
    timestamp,
    uptime
  };
}

/**
 * Validate configuration with enhanced logging
 */
export const validateConfig = (): boolean => {
  const validation = validateEnvironment();
  
  // Log configuration summary
  console.log('\n🔧 Backend Configuration Summary:');
  console.log('================================');
  console.log(`NODE_ENV:           ${config.nodeEnv}`);
  console.log(`PORT:               ${config.port}`);
  console.log(`TRUVERA_API_URL:    ${config.truvera.apiUrl}`);
  console.log(`TRUVERA_API_KEY:    ${config.truvera.apiKey ? '***' + config.truvera.apiKey.slice(-4) : 'NOT SET'}`);
  console.log(`ISSUER_DID:         ${config.credential.issuerDid ? config.credential.issuerDid.substring(0, 20) + '...' : 'NOT SET'}`);
  console.log(`SESSION_SECRET:     ${config.sessionSecret ? '***' + config.sessionSecret.slice(-4) : 'NOT SET'}`);
  console.log(`CORS_ORIGINS:       ${config.security.corsOrigins.length} origins configured`);
  console.log(`RATE_LIMIT:         ${config.security.rateLimitMax} requests per ${config.security.rateLimitWindowMs}ms`);
  console.log(`LOG_LEVEL:          ${config.logging.level}`);
  console.log('================================\n');
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    console.log('');
  }
  
  if (!validation.isValid) {
    console.error('❌ Configuration validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    console.log('');
    
    if (validation.missingRequired.length > 0) {
      console.error('📋 Missing required environment variables:');
      validation.missingRequired.forEach(varName => {
        const envVar = envVarDefinitions.find(def => def.name === varName);
        console.error(`  - ${varName}: ${envVar?.description || 'No description available'}`);
      });
      console.log('');
    }
    
    if (validation.invalidValues.length > 0) {
      console.error('❌ Invalid environment variable values:');
      validation.invalidValues.forEach(varName => {
        const envVar = envVarDefinitions.find(def => def.name === varName);
        console.error(`  - ${varName}: ${envVar?.description || 'No description available'}`);
      });
      console.log('');
    }
    
    return false;
  }
  
  console.log('✅ Configuration validation passed');
  return true;
};

export default config;