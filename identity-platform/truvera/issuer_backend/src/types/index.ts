// Backend types for the SSI Issuing Platform

// Extend Express session to include our custom properties
declare module 'express-session' {
  interface SessionData {
    sessionId?: string;
  }
}

export interface CredentialFormData {
  firstName: string;
  lastName: string;
  nic: string;
  country: string;
  email: string;
  walletAddress: string;
  investorType: 'Individual' | 'Company';
  kycLevel: 'basic' | 'advanced';
  amlStatus: boolean;
}

export enum ProcessStep {
  WALLET_CONNECTION = 'wallet_connection',
  QR_GENERATION = 'qr_generation',
  WALLET_PAIRING = 'wallet_pairing',
  FORM_SUBMISSION = 'form_submission',
  CREDENTIAL_ISSUANCE = 'credential_issuance',
  COMPLETION = 'completion',
}

export interface SessionState {
  sessionId: string;
  currentStep: ProcessStep;
  walletAddress?: string;
  holderDID?: string;
  connectionId?: string;
  formData?: CredentialFormData;
  issuerId?: string;
  credentialId?: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export interface OpenIDIssuerConfig {
  credentialOptions: {
    credential: {
      name?: string; // Credential name
      description?: string; // Credential description
      type: string[];
      '@context': string[];
      credentialSchema?: {
        id: string;
        type: string;
      };
      subject: Partial<CredentialSubject>;
      issuer: string;
      issuanceDate?: string;
      expirationDate?: string;
    };
    // Signing and issuance parameters
    algorithm?: string; // Signing algorithm (e.g., 'ed25519')
    anchor?: boolean; // Whether to anchor on blockchain
    persist?: boolean; // Whether to store encrypted version
    distribute?: boolean; // Whether to auto-distribute
    format?: string; // Credential format (e.g., 'jsonld', 'jwt')
  };
  singleUse: boolean;
}

export interface CredentialSubject {
  id: string; // NIC (National Identity Card) - used as the subject identifier
  firstName: string;
  lastName: string;
  country: string;
  email?: string; // Optional according to schema
  walletAddress?: string; // Optional according to schema
  investorType: string;
  kycLevel: string;
  amlStatus?: boolean; // Optional according to schema
}


