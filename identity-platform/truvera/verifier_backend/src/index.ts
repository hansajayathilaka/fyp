import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { validateEnvironment, logConfiguration, EnvironmentConfig } from './config/environment';
import { createTruveraService } from './services/truveraService';
import { createBlockchainService } from './services/blockchainService';
import { errorHandler, notFoundHandler, ConfigurationError } from './middleware/errorHandler';
import proofRequestRoutes from './routes/proofRequests';
import verificationRoutes from './routes/verification';
import blockchainRoutes from './routes/blockchain';

// Load environment variables
dotenv.config();

let config: EnvironmentConfig;

try {
  // Validate environment configuration
  config = validateEnvironment();
  logConfiguration(config);
} catch (error) {
  console.error('Failed to start server due to configuration errors:');
  if (error instanceof ConfigurationError) {
    console.error('Configuration errors:');
    error.details?.errors?.forEach((err: string) => {
      console.error(`  - ${err}`);
    });
  } else {
    console.error(error);
  }
  process.exit(1);
}

const app = express();

// Initialize Truvera service
try {
  createTruveraService({
    apiUrl: config.truveraApiUrl,
    apiKey: config.truveraApiKey,
  });
  console.log('Truvera service initialized successfully');
} catch (error) {
  console.error('Failed to initialize Truvera service:', error);
  process.exit(1);
}

// Initialize Blockchain service
try {
  createBlockchainService({
    enabled: config.blockchainEnabled,
    contractAddress: config.smartContractAddress || '',
    privateKey: config.accountPrivateKey || '',
    rpcUrl: config.blockchainRpcUrl || ''
  });
  console.log('Blockchain service initialized successfully');
} catch (error) {
  console.error('Failed to initialize Blockchain service:', error);
  if (config.blockchainEnabled) {
    process.exit(1);
  }
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (development only)
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.nodeEnv,
  });
});

// API routes
app.use('/api/proof-requests', proofRequestRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/blockchain', blockchainRoutes);

// API info endpoint
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Verifier Backend API',
    availableEndpoints: [
      'GET /health - Health check',
      'POST /api/proof-requests - Create proof request',
      'GET /api/proof-requests/:id/status - Get proof request status',
      'GET /api/proof-requests/:id - Get proof request details',
      'GET /api/proof-requests - List all proof requests',
      'DELETE /api/proof-requests/:id - Delete proof request',
      'POST /api/verify - Verify credential presentation',
      'POST /api/verify/batch - Verify multiple presentations',
      'POST /api/blockchain/register-user - Register user on blockchain',
      'GET /api/blockchain/config - Get blockchain configuration',
      'PUT /api/blockchain/config - Update blockchain configuration',
      'GET /api/blockchain/transaction/:hash - Get transaction information by hash',
      'POST /api/blockchain/test - Test blockchain connection',
    ],
  });
});

// Error handling middleware (must be after all routes)
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(config.port, () => {
  console.log(`Verifier backend server running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Health check available at: http://localhost:${config.port}/health`);
});