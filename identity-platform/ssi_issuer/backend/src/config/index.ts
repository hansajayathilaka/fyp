import { Config } from '../types/config';

export const config: Config = {
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || '0.0.0.0',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3002',
      'https://ssi-issuer.localhost',
      'https://ssi-issuer-admin.localhost'
    ]
  },
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://mongodb:27017/ssi_issuer',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },
  keria: {
    url: process.env.KERIA_URL || 'http://keria:3901',
    bootUrl: process.env.KERIA_BOOT_URL || 'http://keria:3903',
    timeout: parseInt(process.env.KERIA_TIMEOUT || '30000', 10)
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400000', 10) // 24 hours
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/api.log'
  },
  traefik: {
    domain: process.env.TRAEFIK_DOMAIN || 'localhost',
    email: process.env.TRAEFIK_EMAIL || 'admin@localhost',
    network: process.env.TRAEFIK_NETWORK || 'ssi-issuer-network'
  }
};

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = ['JWT_SECRET', 'TRAEFIK_DOMAIN', 'TRAEFIK_EMAIL'];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Required environment variable ${envVar} is not set`);
    }
  }
}