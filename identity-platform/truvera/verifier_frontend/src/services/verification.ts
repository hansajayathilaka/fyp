import { apiService } from './api';
import {
  ProofRequestConfig,
  ProofRequest,
  CredentialPresentation,
  VerificationResult,
  VerificationSession,
  ErrorState,
  CustomActionPayload,
} from '../types';
import { ENV_CONFIG } from '../config/api';

export class VerificationService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create a new proof request with default configuration
   */
  async createProofRequest(config: ProofRequestConfig): Promise<{
    proofRequest?: ProofRequest;
    error?: ErrorState;
  }> {
    const response = await apiService.createProofRequest(config);
    
    if (response.success && response.data) {
      return { proofRequest: response.data };
    } else {
      return { error: response.error };
    }
  }

  /**
   * Start monitoring a proof request for status changes
   */
  startStatusMonitoring(
    proofRequestId: string,
    onStatusUpdate: (status: ProofRequest) => void,
    onError: (error: ErrorState) => void,
    pollInterval: number = 2000
  ): void {
    // Clear any existing polling for this request
    this.stopStatusMonitoring(proofRequestId);

    const poll = async () => {
      const response = await apiService.getProofRequestStatus(proofRequestId);
      
      if (response.success && response.data) {
        onStatusUpdate(response.data);
        
        // Stop polling if request is completed or failed
        if (['completed', 'expired', 'failed'].includes(response.data.status)) {
          this.stopStatusMonitoring(proofRequestId);
        }
      } else if (response.error) {
        onError(response.error);
        // Continue polling for recoverable errors
        if (!response.error.recoverable) {
          this.stopStatusMonitoring(proofRequestId);
        }
      }
    };

    // Start polling
    const intervalId = setInterval(poll, pollInterval);
    this.pollingIntervals.set(proofRequestId, intervalId);

    // Initial poll
    poll();
  }

  /**
   * Stop monitoring a proof request
   */
  stopStatusMonitoring(proofRequestId: string): void {
    const intervalId = this.pollingIntervals.get(proofRequestId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(proofRequestId);
    }
  }

  /**
   * Stop all active monitoring
   */
  stopAllMonitoring(): void {
    this.pollingIntervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.pollingIntervals.clear();
  }

  /**
   * Verify a credential presentation
   */
  async verifyPresentation(presentation: CredentialPresentation): Promise<{
    result?: VerificationResult;
    error?: ErrorState;
  }> {
    const response = await apiService.verifyPresentation(presentation);
    
    if (response.success && response.data) {
      return { result: response.data };
    } else {
      return { error: response.error };
    }
  }

  /**
   * Trigger custom action after successful verification
   */
  async triggerCustomAction(
    verificationResult: VerificationResult,
    sessionId: string,
    metadata?: Record<string, any>
  ): Promise<{
    success: boolean;
    error?: ErrorState;
  }> {
    if (!ENV_CONFIG.CUSTOM_INTEGRATION_ENABLED) {
      return { success: true }; // Skip if not enabled
    }

    const payload: CustomActionPayload = {
      verificationResult,
      timestamp: new Date().toISOString(),
      sessionId,
      metadata,
    };

    const response = await apiService.triggerCustomAction(payload);
    
    if (response.success) {
      return { success: true };
    } else {
      return { success: false, error: response.error };
    }
  }

  /**
   * Create a complete verification session
   */
  createVerificationSession(): VerificationSession {
    return {
      id: this.generateSessionId(),
      proofRequest: null,
      presentation: null,
      verificationResult: null,
      status: 'creating',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Update verification session status
   */
  updateSessionStatus(
    session: VerificationSession,
    status: VerificationSession['status'],
    updates?: Partial<VerificationSession>
  ): VerificationSession {
    return {
      ...session,
      ...updates,
      status,
    };
  }

  /**
   * Check if verification session is complete
   */
  isSessionComplete(session: VerificationSession): boolean {
    return ['completed', 'failed'].includes(session.status);
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate proof request configuration
   */
  validateProofRequestConfig(config: ProofRequestConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.name || config.name.trim().length === 0) {
      errors.push('Proof request name is required');
    }

    if (!config.purpose || config.purpose.trim().length === 0) {
      errors.push('Proof request purpose is required');
    }

    if (!config.credentialTypes || config.credentialTypes.length === 0) {
      errors.push('At least one credential type must be specified');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format verification results for display
   */
  formatVerificationResult(result: VerificationResult): {
    overallStatus: 'verified' | 'partially_verified' | 'failed';
    summary: string;
    credentialCount: number;
    verifiedCount: number;
  } {
    const credentialCount = result.results.length;
    const verifiedCount = result.results.filter(r => r.verified).length;

    let overallStatus: 'verified' | 'partially_verified' | 'failed';
    let summary: string;

    if (result.verified) {
      overallStatus = 'verified';
      summary = `All ${credentialCount} credential(s) verified successfully`;
    } else if (result.partiallyVerified) {
      overallStatus = 'partially_verified';
      summary = `${verifiedCount} of ${credentialCount} credential(s) verified`;
    } else {
      overallStatus = 'failed';
      summary = `Verification failed for all ${credentialCount} credential(s)`;
    }

    return {
      overallStatus,
      summary,
      credentialCount,
      verifiedCount,
    };
  }
}

// Create and export singleton instance
export const verificationService = new VerificationService();
export default verificationService;