export interface Registration {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  organization?: string;
  requestedSchemaId: string;
  status: 'pending' | 'approved' | 'rejected';
  applicationData: Record<string, any>;
  connectionId?: string;
  connectionStatus: 'pending' | 'connected' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface CredentialSchema {
  id: string;
  name: string;
  description?: string;
  schemaData: Record<string, any>;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IssuedCredential {
  id: string;
  registrationId: string;
  schemaId: string;
  recipientIdentifier: string;
  credentialData: Record<string, any>;
  status: 'active' | 'revoked';
  issuedAt: Date;
  revokedAt?: Date;
  revokedBy?: string;
}

export interface ConnectionInvitation {
  invitation_id: string;
  registration_id: number;
  invitation_data: Record<string, any>;
  invitation_url: string;
  state: 'invitation' | 'request' | 'response' | 'active' | 'error' | 'abandoned';
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface Connection {
  connection_id: string;
  invitation_id?: string;
  their_label?: string;
  their_did?: string;
  my_did?: string;
  state: 'invitation' | 'request' | 'response' | 'active' | 'error' | 'abandoned';
  connection_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CredentialExchange {
  credential_exchange_id: string;
  connection_id: string;
  thread_id?: string;
  state: 'proposal_sent' | 'offer_sent' | 'request_received' | 'credential_issued' | 'credential_acked' | 'abandoned';
  credential_definition_id: string;
  credential_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  type: 'registration' | 'approval' | 'issuance' | 'revocation' | 'connection' | 'schema';
  entity_id: string;
  details: Record<string, any>;
  performed_by?: string;
  timestamp: string;
}

export interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  email: string;
  created_at: string;
  last_login?: string;
}