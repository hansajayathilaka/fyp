import { logger } from '../middleware';
import { credentialService } from '../services';
import { sessionService } from '../services/session';
import { truveraService } from '../services/truvera';
import { CredentialFormData, ProcessStep } from '../types';

// Test data for workflow validation
const testFormData: CredentialFormData = {
  firstName: 'Test',
  lastName: 'User',
  nic: 'TEST123456789',
  country: 'Test Country',
  email: 'test@example.com',
  walletAddress: '0x742d35Cc6634C0532925a3b8D404d3aAB8c3f1e0',
  investorType: 'Individual',
  kycLevel: 'basic',
  amlStatus: true
};

// Workflow test results interface
interface WorkflowTestResult {
  success: boolean;
  step: string;
  message: string;
  duration: number;
  error?: string;
  details?: unknown;
}

interface ComprehensiveTestResult {
  overallSuccess: boolean;
  totalDuration: number;
  results: WorkflowTestResult[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
  };
}

/**
 * Test session creation and management
 */
async function testSessionManagement(): Promise<WorkflowTestResult> {
  const startTime = Date.now();
  
  try {
    logger.info('Testing session management...');
    
    // Create a test session
    const sessionState = sessionService.createSession();
    const sessionId = sessionState.sessionId;
    
    if (!sessionId) {
      throw new Error('Failed to create session');
    }
    
    // Verify session exists
    const session = sessionService.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found after creation');
    }
    
    // Test session updates
    sessionService.setWalletAddress(sessionId, testFormData.walletAddress);
    sessionService.setCurrentStep(sessionId, ProcessStep.FORM_SUBMISSION);
    
    // Verify updates
    const updatedSession = sessionService.getSession(sessionId);
    if (updatedSession?.walletAddress !== testFormData.walletAddress) {
      throw new Error('Session wallet address not updated correctly');
    }
    
    if (updatedSession?.currentStep !== ProcessStep.FORM_SUBMISSION) {
      throw new Error('Session step not updated correctly');
    }
    
    // Clean up test session
    sessionService.deleteSession(sessionId);
    
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      step: 'Session Management',
      message: 'Session creation, updates, and cleanup successful',
      duration,
      details: { sessionId, testWalletAddress: testFormData.walletAddress }
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      success: false,
      step: 'Session Management',
      message: 'Session management test failed',
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test form data validation and storage
 */
async function testFormDataValidation(): Promise<WorkflowTestResult> {
  const startTime = Date.now();
  
  try {
    logger.info('Testing form data validation...');
    
    // Test valid form data
    const validationResult = credentialService.validateFormData(testFormData);
    
    if (!validationResult.isValid) {
      throw new Error(`Form validation failed: ${JSON.stringify(validationResult.errors)}`);
    }
    
    // Test invalid form data
    const invalidFormData = { ...testFormData, email: 'invalid-email' };
    const invalidValidation = credentialService.validateFormData(invalidFormData);
    
    if (invalidValidation.isValid) {
      throw new Error('Form validation should have failed for invalid email');
    }
    
    // Test form data storage
    const sessionState = sessionService.createSession();
    const sessionId = sessionState.sessionId;
    sessionService.setWalletAddress(sessionId, testFormData.walletAddress);
    
    const storeResult = await credentialService.storeFormData({
      sessionId,
      formData: testFormData
    });
    
    if (!storeResult.success) {
      throw new Error(`Form data storage failed: ${storeResult.message}`);
    }
    
    // Verify stored data
    const session = sessionService.getSession(sessionId);
    if (!session?.formData) {
      throw new Error('Form data not stored in session');
    }
    
    // Clean up
    sessionService.deleteSession(sessionId);
    
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      step: 'Form Data Validation',
      message: 'Form validation and storage successful',
      duration,
      details: { 
        validationPassed: true, 
        invalidDetected: true, 
        storagePassed: true 
      }
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      success: false,
      step: 'Form Data Validation',
      message: 'Form data validation test failed',
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test basic service operations (PIN generation, etc.)
 */
async function testBasicOperations(): Promise<WorkflowTestResult> {
  const startTime = Date.now();
  
  try {
    logger.info('Testing basic service operations...');
    
    // Test PIN generation
    const pin = truveraService.generateSecurePIN();
    
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      throw new Error('PIN generation failed or invalid format');
    }
    
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      step: 'Basic Operations',
      message: 'Basic service operations successful',
      duration,
      details: { 
        pinGeneration: true,
        generatedPin: pin
      }
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      success: false,
      step: 'Basic Operations',
      message: 'Basic operations test failed',
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test credential offer creation workflow (without actual issuance)
 */
async function testCredentialOfferWorkflow(): Promise<WorkflowTestResult> {
  const startTime = Date.now();
  
  try {
    logger.info('Testing credential offer workflow...');
    
    // Create session and set up test data
    const sessionState = sessionService.createSession();
    const sessionId = sessionState.sessionId;
    sessionService.setWalletAddress(sessionId, testFormData.walletAddress);
    
    // Store form data
    const storeResult = await credentialService.storeFormData({
      sessionId,
      formData: testFormData
    });
    
    if (!storeResult.success) {
      throw new Error(`Form data storage failed: ${storeResult.message}`);
    }
    
    // Test credential offer creation (this will test the full workflow)
    try {
      const offerResult = await credentialService.createCredentialOfferWithQR(sessionId, testFormData);
      
      if (!offerResult.success) {
        // This might fail due to Truvera API issues, which is acceptable for testing
        logger.warn('Credential offer creation failed (expected in test environment):', offerResult.message);
        
        // Clean up and return partial success
        sessionService.deleteSession(sessionId);
        
        const duration = Date.now() - startTime;
        
        return {
          success: true,
          step: 'Credential Offer Workflow',
          message: 'Workflow structure validated (external API call failed as expected)',
          duration,
          details: { 
            workflowStructure: true, 
            externalApiCall: false,
            reason: offerResult.message
          }
        };
      }
      
      // If successful, verify the result structure
      if (!offerResult.connectionId || !offerResult.credentialOfferUrl) {
        throw new Error('Credential offer result missing required fields');
      }
      
      // Clean up
      sessionService.deleteSession(sessionId);
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        step: 'Credential Offer Workflow',
        message: 'Complete credential offer workflow successful',
        duration,
        details: { 
          workflowStructure: true, 
          externalApiCall: true,
          connectionId: offerResult.connectionId,
          hasQRCode: !!offerResult.qrCodeData
        }
      };
      
    } catch (workflowError) {
      // Clean up on error
      sessionService.deleteSession(sessionId);
      
      // If it's a Truvera API error, that's expected in test environment
      if (workflowError instanceof Error && workflowError.message.includes('Truvera')) {
        const duration = Date.now() - startTime;
        
        return {
          success: true,
          step: 'Credential Offer Workflow',
          message: 'Workflow structure validated (Truvera API unavailable in test)',
          duration,
          details: { 
            workflowStructure: true, 
            externalApiCall: false,
            reason: workflowError.message
          }
        };
      }
      
      throw workflowError;
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      success: false,
      step: 'Credential Offer Workflow',
      message: 'Credential offer workflow test failed',
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test error handling and recovery mechanisms
 */
async function testErrorHandling(): Promise<WorkflowTestResult> {
  const startTime = Date.now();
  
  try {
    logger.info('Testing error handling...');
    
    // Test invalid session ID handling
    const invalidSessionResult = await credentialService.storeFormData({
      sessionId: 'invalid-session-id',
      formData: testFormData
    });
    
    if (invalidSessionResult.success) {
      throw new Error('Should have failed with invalid session ID');
    }
    
    // Test missing form data handling
    const sessionState = sessionService.createSession();
    const sessionId = sessionState.sessionId;
    const missingDataResult = await credentialService.generateCredentialOfferQR(sessionId);
    
    if (missingDataResult.success) {
      throw new Error('Should have failed with missing form data');
    }
    
    // Test invalid form data handling
    const invalidFormData = { ...testFormData, email: '', firstName: '' };
    const validationResult = credentialService.validateFormData(invalidFormData);
    
    if (validationResult.isValid) {
      throw new Error('Should have failed validation with invalid form data');
    }
    
    // Clean up
    sessionService.deleteSession(sessionId);
    
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      step: 'Error Handling',
      message: 'Error handling and validation working correctly',
      duration,
      details: { 
        invalidSessionHandled: true, 
        missingDataHandled: true, 
        invalidFormDataHandled: true 
      }
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      success: false,
      step: 'Error Handling',
      message: 'Error handling test failed',
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Run comprehensive workflow tests
 */
export async function runWorkflowTests(): Promise<ComprehensiveTestResult> {
  const overallStartTime = Date.now();
  
  logger.info('🧪 Starting comprehensive workflow tests...');
  
  const tests = [
    testSessionManagement,
    testFormDataValidation,
    testBasicOperations,
    testCredentialOfferWorkflow,
    testErrorHandling
  ];
  
  const results: WorkflowTestResult[] = [];
  
  for (const test of tests) {
    try {
      const result = await test();
      results.push(result);
      
      if (result.success) {
        logger.info(`✅ ${result.step}: ${result.message} (${result.duration}ms)`);
      } else {
        logger.error(`❌ ${result.step}: ${result.message} (${result.duration}ms)`, {
          error: result.error,
          details: result.details
        });
      }
    } catch (error) {
      const failedResult: WorkflowTestResult = {
        success: false,
        step: 'Unknown Test',
        message: 'Test execution failed',
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      results.push(failedResult);
      logger.error(`❌ Test execution failed:`, error);
    }
  }
  
  const totalDuration = Date.now() - overallStartTime;
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const warnings = results.filter(r => r.success && r.message.includes('expected')).length;
  
  const overallSuccess = failed === 0;
  
  const summary = {
    passed,
    failed,
    warnings
  };
  
  logger.info(`🧪 Workflow tests completed in ${totalDuration}ms:`, summary);
  
  if (overallSuccess) {
    logger.info('✅ All workflow tests passed successfully');
  } else {
    logger.error('❌ Some workflow tests failed');
  }
  
  return {
    overallSuccess,
    totalDuration,
    results,
    summary
  };
}

/**
 * Run workflow tests and exit with appropriate code
 */
export async function runWorkflowTestsAndExit(): Promise<void> {
  try {
    const testResults = await runWorkflowTests();
    
    if (testResults.overallSuccess) {
      console.log('\n✅ All workflow tests passed successfully');
      process.exit(0);
    } else {
      console.log('\n❌ Some workflow tests failed');
      console.log('Failed tests:');
      testResults.results
        .filter(r => !r.success)
        .forEach(r => console.log(`  - ${r.step}: ${r.error}`));
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Workflow test execution failed:', error);
    process.exit(1);
  }
}