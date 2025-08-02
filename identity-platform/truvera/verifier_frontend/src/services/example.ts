// Example usage of the API service and verification service
// This file demonstrates how to use the services in components

import { apiService, verificationService } from './index';
import { ProofRequestConfig, VerificationSession } from '../types';
import { getErrorMessage, logError } from '../utils/errorHandling';

/**
 * Example: Create a proof request for DEIPAccessCredential
 */
export async function exampleCreateProofRequest() {
  const config: ProofRequestConfig = {
    name: 'DEIP Access Verification',
    purpose: 'Please present your DEIP Access Credential for verification',
    credentialTypes: ['DEIPAccessCredential'],
    requiredFields: [
      {
        path: 'credentialSubject.id',
        required: true,
      },
      {
        path: 'credentialSubject.firstName',
        required: true,
      },
      {
        path: 'credentialSubject.lastName',
        required: true,
      },
    ],
    timeoutMinutes: 15,
  };

  const { proofRequest, error } = await verificationService.createProofRequest(config);
  
  if (error) {
    logError(error, 'Creating proof request');
    console.error('Failed to create proof request:', getErrorMessage(error));
    return null;
  }

  console.log('Proof request created:', proofRequest);
  return proofRequest;
}

/**
 * Example: Monitor proof request status
 */
export function exampleMonitorProofRequest(proofRequestId: string) {
  verificationService.startStatusMonitoring(
    proofRequestId,
    (status) => {
      console.log('Status update:', status);
      
      if (status.status === 'completed') {
        // Presentation received, proceed to verification
        console.log('Proof request completed, presentation received');
        // In a real implementation, the presentation data would be fetched separately
        // or passed through a different mechanism
      }
    },
    (error) => {
      logError(error, 'Monitoring proof request');
      console.error('Monitoring error:', getErrorMessage(error));
    },
    2000 // Poll every 2 seconds
  );
}

/**
 * Example: Verify a credential presentation
 */
export async function exampleVerifyPresentation(presentation: any) {
  const { result, error } = await verificationService.verifyPresentation(presentation);
  
  if (error) {
    logError(error, 'Verifying presentation');
    console.error('Verification failed:', getErrorMessage(error));
    return null;
  }

  console.log('Verification result:', result);
  
  // Format result for display
  if (result) {
    const formatted = verificationService.formatVerificationResult(result);
    console.log('Formatted result:', formatted);
    
    // Trigger custom action if verification successful
    if (result.verified) {
      await exampleTriggerCustomAction(result, 'example-session-123');
    }
  }

  return result;
}

/**
 * Example: Trigger custom action after verification
 */
export async function exampleTriggerCustomAction(
  verificationResult: any,
  sessionId: string
) {
  const { success, error } = await verificationService.triggerCustomAction(
    verificationResult,
    sessionId,
    { source: 'example', timestamp: Date.now() }
  );
  
  if (error) {
    logError(error, 'Triggering custom action');
    console.error('Custom action failed:', getErrorMessage(error));
    return false;
  }

  console.log('Custom action completed successfully');
  return success;
}

/**
 * Example: Complete verification workflow
 */
export async function exampleCompleteWorkflow() {
  // 1. Create verification session
  const session: VerificationSession = verificationService.createVerificationSession();
  console.log('Created session:', session.id);

  // 2. Create proof request
  const proofRequest = await exampleCreateProofRequest();
  if (!proofRequest) return;

  // 3. Update session with proof request
  const updatedSession = verificationService.updateSessionStatus(
    session,
    'waiting',
    { proofRequest }
  );

  // 4. Start monitoring
  exampleMonitorProofRequest(proofRequest.id);

  console.log('Verification workflow started. Session ID:', updatedSession.id);
  return updatedSession;
}

/**
 * Example: Health check
 */
export async function exampleHealthCheck() {
  const response = await apiService.healthCheck();
  
  if (response.success) {
    console.log('API is healthy:', response.data);
    return true;
  } else {
    console.error('API health check failed:', response.error);
    return false;
  }
}