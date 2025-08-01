// Common types for the SSI Issuing Platform

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

export interface ValidationErrors {
  [key: string]: string;
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
  issuerId?: string;
  credentialId?: string;
  createdAt: Date;
  expiresAt: Date;
}

// Legacy SessionData interface for CompletionPage compatibility
export interface SessionData {
  sessionId: string;
  formData?: CredentialFormData;
  issuerId?: string;
  credentialOfferUrl?: string;
  qrCodeGenerated: boolean;
  credentialStatus: 'pending' | 'issued' | 'failed';
  startTime: Date;
  endTime?: Date;
  nextSteps: string[];
}

// Legacy OperationResult interface for CompletionPage compatibility
export interface OperationResult {
  success: boolean;
  steps: OperationStep[];
  summary: SessionData;
  errors?: OperationError[];
}

export interface OperationStep {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  timestamp?: Date;
  details?: Record<string, any>;
}

export interface OperationError {
  code: string;
  message: string;
  details?: unknown;
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

// Enhanced types for new credential issuance workflow

export interface QRCodeData {
  qrCodeData: string;
  qrCodeImage?: string;
  credentialOfferUrl: string;
  connectionId?: string;
  securityPIN?: string;
  generatedAt?: string;
}

export interface OperationStatus {
  status: 'issued' | 'pending' | 'failed';
  deliveryStatus?: 'sent' | 'delivered' | 'failed';
  message: string;
  currentStep?: string;
  credentialId?: string;
  issuerId?: string;
  lastUpdated?: string;
}

export interface OperationSummary {
  sessionId: string;
  currentStep: string;
  createdAt: string;
  expiresAt: string;
  walletAddress?: string;
  connectionId?: string;
  holderDID?: string;
  issuerId?: string;
  credentialId?: string;
  formData?: {
    firstName: string;
    lastName: string;
    nic: string;
    country: string;
    investorType: string;
    kycLevel: string;
    hasEmail: boolean;
    hasWalletAddress: boolean;
    amlStatus: boolean;
  };
  credentialStatus?: {
    status: 'issued' | 'pending' | 'failed';
    deliveryStatus: 'sent' | 'delivered' | 'failed';
    message: string;
  };
  progress: {
    walletConnected: boolean;
    formSubmitted: boolean;
    qrGenerated: boolean;
    walletPaired: boolean;
    credentialIssued: boolean;
    completed: boolean;
  };
}

export interface LoadingState {
  isLoading: boolean;
  operation?: string;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  error?: string;
  code?: string;
  details?: unknown;
}
