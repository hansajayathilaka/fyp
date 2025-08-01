#!/usr/bin/env node

/**
 * Workflow Testing Script
 * 
 * This script tests the complete credential issuance workflow to ensure
 * all components are working correctly together.
 * 
 * Usage:
 *   npm run test:workflow
 *   or
 *   npx ts-node src/scripts/testWorkflow.ts
 */

import { config, validateConfig } from '../config';
import { logger } from '../middleware';
import { runWorkflowTestsAndExit } from '../utils/workflowTester';

async function main() {
  console.log('🧪 SSI Platform Workflow Testing');
  console.log('================================\n');
  
  // Validate configuration first
  console.log('🔧 Validating configuration...');
  if (!validateConfig()) {
    console.error('❌ Configuration validation failed. Cannot run tests.');
    process.exit(1);
  }
  console.log('✅ Configuration validation passed\n');
  
  // Log test environment info
  console.log('📋 Test Environment Information:');
  console.log(`   NODE_ENV: ${config.nodeEnv}`);
  console.log(`   Truvera API URL: ${config.truvera.apiUrl}`);
  console.log(`   Truvera API Key: ${config.truvera.apiKey ? '***' + config.truvera.apiKey.slice(-4) : 'NOT SET'}`);
  console.log(`   Issuer DID: ${config.credential.issuerDid ? config.credential.issuerDid.substring(0, 20) + '...' : 'NOT SET'}`);
  console.log('');
  
  // Run the comprehensive workflow tests
  await runWorkflowTestsAndExit();
}

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});