// Core types for credential verification

export interface ProofRequestConfig {
  name: string;
  purpose: string;
  credentialTypes: string[];
  requiredFields: FieldRequirement[];
  timeoutMinutes?: number;
}

export interface FieldRequirement {
  path: string;
  required: boolean;
  filter?: {
    type: string;
    const?: string;
    contains?: any;
  };
}

export interface ProofRequest {
  id: string;
  qr: string;
  response_url: string;
  config: ProofRequestConfig;
  status: 'active' | 'completed' | 'expired' | 'failed';
  createdAt: string;
  expiresAt: string;
}

export interface CredentialPresentation {
  holder: string;
  credentials: VerifiableCredential[];
  presentation_submission?: any;
}

export interface VerifiableCredential {
  '@context': string[];
  type: string[];
  id: string;
  issuer: string | { id: string; name?: string };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: Record<string, any>;
  proof?: any;
}

export interface VerificationResult {
  verified: boolean;
  partiallyVerified: boolean;
  results: CredentialVerificationResult[];
  presentation: CredentialPresentation;
  timestamp: string;
  blockchainRegistration?: BlockchainRegistrationResult;
}

export interface BlockchainRegistrationResult {
  attempted: boolean;
  success: boolean;
  status: 'newly_registered' | 'already_registered' | 'failed';
  transactionHash?: string;
  error?: string;
  userType?: number;
  ssiIdentifier?: string;
  walletAddress?: string;
  alreadyRegistered?: boolean;
  userFriendlyMessage?: string;
}

export interface CredentialVerificationResult {
  credential: VerifiableCredential;
  verified: boolean;
  error?: string;
  details?: {
    signatureValid: boolean;
    issuerTrusted: boolean;
    notExpired: boolean;
    schemaValid: boolean;
  };
}

export interface VerificationSession {
  id: string;
  proofRequest: ProofRequest | null;
  presentation: CredentialPresentation | null;
  verificationResult: VerificationResult | null;
  status: 'creating' | 'waiting' | 'verifying' | 'completed' | 'failed';
  createdAt: string;
}

// Error handling types
export interface ErrorState {
  type: 'network' | 'validation' | 'verification' | 'integration';
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
  retryAction?: () => void;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ErrorState;
}



// Custom integration types
export interface CustomIntegrationConfig {
  enabled: boolean;
  endpoint: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  transformPayload?: (result: VerificationResult) => any;
}

export interface CustomActionPayload {
  verificationResult: VerificationResult;
  timestamp: string;
  sessionId: string;
  metadata?: Record<string, any>;
}