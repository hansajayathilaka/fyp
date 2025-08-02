import { getTruveraService } from './truveraService';
import { 
  CredentialPresentation, 
  VerificationResult, 
  CredentialVerificationResult,
  VerifiableCredential 
} from '../types';

export interface VerificationRequest {
  presentation: CredentialPresentation;
  proofRequestId?: string;
}

export class VerificationService {
  /**
   * Verify a credential presentation using Truvera API
   * Uses proof request verification as primary method to avoid Truvera /verify endpoint bug
   */
  async verifyPresentation(request: VerificationRequest): Promise<VerificationResult> {
    const { presentation, proofRequestId } = request;
    
    console.log(`Starting verification for presentation with ${presentation.credentials.length} credentials`);
    
    // PRIORITY 1: Check if proof request was already verified (most reliable method)
    if (proofRequestId) {
      try {
        const proofRequestResult = await this.verifyViaProofRequest(presentation, proofRequestId);
        if (proofRequestResult) {
          console.log('Verification successful via proof request validation (bypassing /verify endpoint)');
          return proofRequestResult;
        }
      } catch (error) {
        console.warn('Proof request verification failed, trying other methods:', error);
      }
    }

    // PRIORITY 2: Try Truvera /verify endpoint (known to have issues but kept as fallback)
    try {
      const presentationResult = await this.verifyViaTruvera(presentation, proofRequestId);
      
      if (presentationResult) {
        console.log('Presentation verification successful via Truvera /verify API');
        return presentationResult;
      }
    } catch (error) {
      console.warn('Presentation verification via Truvera /verify failed, falling back to individual verification:', error);
    }

    // PRIORITY 3: Fallback to individual credential verification
    console.log('Falling back to individual credential verification');
    return await this.verifyIndividualCredentials(presentation);
  }

  /**
   * Verify presentation via proof request validation (most reliable method)
   */
  private async verifyViaProofRequest(
    presentation: CredentialPresentation, 
    proofRequestId: string
  ): Promise<VerificationResult | null> {
    try {
      const truveraService = getTruveraService();
      
      // Get the proof request status to check if it was completed successfully
      const proofRequestStatus = await truveraService.getProofRequestStatus(proofRequestId);
      
      console.log('Proof request status:', {
        verified: proofRequestStatus.verified,
        expired: proofRequestStatus.expired,
        hasPresentation: !!proofRequestStatus.presentation
      });
      
      // If proof request is verified and not expired, we can trust the verification
      if (proofRequestStatus.verified && !proofRequestStatus.expired) {
        const results: CredentialVerificationResult[] = [];
        
        // Create verification results for each credential in the presentation
        presentation.credentials.forEach((credential, index) => {
          console.log(`Creating verified result for credential ${index}:`, {
            credentialId: credential.id,
            hasCredential: !!credential
          });
          
          results.push({
            credential: credential,
            verified: true,
            error: undefined,
            details: {
              signatureValid: true,
              issuerTrusted: true,
              notExpired: true,
              schemaValid: true
            }
          });
        });

        const verificationResult: VerificationResult = {
          verified: true,
          partiallyVerified: false,
          results: results,
          presentation: presentation,
          timestamp: new Date().toISOString()
        };

        return verificationResult;
      }
      
      // If proof request is not completed or not verified, return null to try other methods
      return null;
    } catch (error) {
      console.error('Proof request verification failed:', error);
      return null;
    }
  }

  /**
   * Verify presentation using Truvera API
   */
  private async verifyViaTruvera(
    presentation: CredentialPresentation, 
    proofRequestId?: string
  ): Promise<VerificationResult | null> {
    try {
      const truveraService = getTruveraService();
      
      const truveraRequest = {
        presentation: presentation,
        proof_request_id: proofRequestId
      };

      const truveraResult = await truveraService.verifyPresentation(truveraRequest);
      
      // Transform Truvera result to our format
      const results: CredentialVerificationResult[] = [];
      
      console.log('Processing Truvera result:', {
        hasResults: !!truveraResult.results,
        isResultsArray: Array.isArray(truveraResult.results),
        resultsLength: truveraResult.results?.length,
        verified: truveraResult.verified
      });

      if (truveraResult.results && Array.isArray(truveraResult.results)) {
        console.log('Processing Truvera results array');
        truveraResult.results.forEach((result, index) => {
          console.log(`Processing Truvera result ${index}:`, {
            hasCredential: !!result.credential,
            verified: result.verified,
            error: result.error
          });
          
          results.push({
            credential: result.credential,
            verified: result.verified,
            error: result.error,
            details: this.extractVerificationDetails(result)
          });
        });
      } else {
        console.log('No Truvera results array, creating results for each credential');
        // If no results array, create a result for each credential in the presentation
        presentation.credentials.forEach((credential, index) => {
          console.log(`Creating result for credential ${index}:`, {
            credentialId: credential.id,
            hasCredential: !!credential
          });
          
          results.push({
            credential: credential,
            verified: truveraResult.verified || false,
            error: truveraResult.verified ? undefined : 'Verification failed via Truvera API',
            details: this.extractVerificationDetails(truveraResult)
          });
        });
      }

      const verificationResult: VerificationResult = {
        verified: truveraResult.verified,
        partiallyVerified: results.some(r => r.verified) && !truveraResult.verified,
        results: results,
        presentation: presentation,
        timestamp: new Date().toISOString()
      };

      return verificationResult;
    } catch (error) {
      console.error('Truvera verification failed:', error);
      return null;
    }
  }

  /**
   * Verify individual credentials as fallback
   */
  private async verifyIndividualCredentials(presentation: CredentialPresentation): Promise<VerificationResult> {
    const results: CredentialVerificationResult[] = [];
    
    for (const credential of presentation.credentials) {
      try {
        const result = await this.verifyIndividualCredential(credential);
        results.push(result);
      } catch (error) {
        console.error(`Failed to verify credential ${credential.id}:`, error);
        results.push({
          credential: credential,
          verified: false,
          error: error instanceof Error ? error.message : 'Unknown verification error',
          details: {
            signatureValid: false,
            issuerTrusted: false,
            notExpired: false,
            schemaValid: false
          }
        });
      }
    }

    const verified = results.every(r => r.verified);
    const partiallyVerified = results.some(r => r.verified) && !verified;

    return {
      verified,
      partiallyVerified,
      results,
      presentation,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Verify a single credential
   */
    private async verifyIndividualCredential(credential: VerifiableCredential): Promise<CredentialVerificationResult> {
    console.log(`Verifying individual credential: ${credential.id}`);
    
    // Ensure we always have a credential object to work with
    if (!credential) {
      return {
        credential: {} as VerifiableCredential,
        verified: false,
        error: 'Credential is null or undefined',
        details: {
          signatureValid: false,
          issuerTrusted: false,
          notExpired: false,
          schemaValid: false
        }
      };
    }

    try {
      // Basic validation checks with safe access
      let signatureValid = false;
      let issuerTrusted = false;
      let notExpired = false;
      let schemaValid = false;

      try {
        signatureValid = this.validateSignature(credential);
      } catch (e) {
        console.error('validateSignature error:', e instanceof Error ? e.message : String(e));
        signatureValid = false;
      }

      try {
        issuerTrusted = this.validateIssuer(credential);
      } catch (e) {
        console.error('validateIssuer error:', e instanceof Error ? e.message : String(e));
        issuerTrusted = false;
      }

      try {
        notExpired = this.validateExpiration(credential);
      } catch (e) {
        console.error('validateExpiration error:', e instanceof Error ? e.message : String(e));
        notExpired = false;
      }

      try {
        schemaValid = this.validateSchema(credential);
      } catch (e) {
        console.error('validateSchema error:', e instanceof Error ? e.message : String(e));
        schemaValid = false;
      }

      const details = {
        signatureValid,
        issuerTrusted,
        notExpired,
        schemaValid
      };

      const verified = signatureValid && issuerTrusted && notExpired && schemaValid;
      
      console.log(`Creating result object for credential ${credential.id}:`);
      console.log('  - signatureValid:', signatureValid);
      console.log('  - issuerTrusted:', issuerTrusted);
      console.log('  - notExpired:', notExpired);
      console.log('  - schemaValid:', schemaValid);
      console.log('  - verified:', verified);
      console.log('  - credential exists:', !!credential);
      
      const result = {
        credential,
        verified,
        error: verified ? undefined : 'One or more validation checks failed',
        details
      };
      
      console.log('Result object created successfully:', !!result.credential);
      return result;
    } catch (error) {
      console.error(`Error verifying credential ${credential.id}:`, error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
      // Return a proper error result with the credential included
      return {
        credential,
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown verification error',
        details: {
          signatureValid: false,
          issuerTrusted: false,
          notExpired: false,
          schemaValid: false
        }
      };
    }
  }

  /**
   * Validate credential signature (simplified implementation)
   */
  private validateSignature(credential: VerifiableCredential): boolean {
    // In a real implementation, this would verify the cryptographic signature
    // For now, we just check if a proof exists
    return !!credential.proof;
  }

  /**
   * Validate credential issuer (simplified implementation)
   */
  private validateIssuer(credential: VerifiableCredential): boolean {
    // In a real implementation, this would check against a trusted issuer registry
    // For now, we just check if issuer is present and valid
    if (typeof credential.issuer === 'string') {
      return credential.issuer.length > 0;
    } else if (typeof credential.issuer === 'object' && credential.issuer.id) {
      return credential.issuer.id.length > 0;
    }
    return false;
  }

  /**
   * Validate credential expiration
   */
  private validateExpiration(credential: VerifiableCredential): boolean {
    if (!credential.expirationDate) {
      // No expiration date means it doesn't expire
      return true;
    }
    
    const expirationDate = new Date(credential.expirationDate);
    const now = new Date();
    
    return expirationDate > now;
  }

  /**
   * Validate credential schema (simplified implementation)
   */
  private validateSchema(credential: VerifiableCredential): boolean {
    // Basic schema validation - check required fields
    const requiredFields = ['@context', 'type', 'id', 'issuer', 'issuanceDate', 'credentialSubject'];
    
    for (const field of requiredFields) {
      if (!(field in credential)) {
        return false;
      }
    }
    
    // Check that arrays are actually arrays
    if (!Array.isArray(credential['@context']) || !Array.isArray(credential.type)) {
      return false;
    }
    
    return true;
  }

  /**
   * Extract verification details from Truvera result
   */
  private extractVerificationDetails(truveraResult: any): any {
    // Extract detailed verification information from Truvera response
    // This would depend on the actual Truvera API response format
    return {
      signatureValid: truveraResult.signature_valid ?? true,
      issuerTrusted: truveraResult.issuer_trusted ?? true,
      notExpired: truveraResult.not_expired ?? true,
      schemaValid: truveraResult.schema_valid ?? true
    };
  }

  /**
   * Validate presentation structure
   */
  public validatePresentationStructure(presentation: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!presentation) {
      errors.push('Presentation is required');
      return { valid: false, errors };
    }

    if (!presentation.holder || typeof presentation.holder !== 'string') {
      errors.push('Presentation must have a valid holder');
    }

    if (!presentation.credentials || !Array.isArray(presentation.credentials)) {
      errors.push('Presentation must have a credentials array');
    } else if (presentation.credentials.length === 0) {
      errors.push('Presentation must contain at least one credential');
    } else {
      // Validate each credential structure
      presentation.credentials.forEach((credential: any, index: number) => {
        if (!credential.id) {
          errors.push(`Credential ${index} must have an id`);
        }
        if (!credential.type || !Array.isArray(credential.type)) {
          errors.push(`Credential ${index} must have a type array`);
        }
        if (!credential.credentialSubject) {
          errors.push(`Credential ${index} must have a credentialSubject`);
        }
      });
    }

    return { valid: errors.length === 0, errors };
  }
}

// Singleton instance
let verificationServiceInstance: VerificationService | null = null;

export function getVerificationService(): VerificationService {
  if (!verificationServiceInstance) {
    verificationServiceInstance = new VerificationService();
  }
  return verificationServiceInstance;
}