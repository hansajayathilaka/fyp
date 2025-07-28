import { keriaClient } from './KeriaClient';
import { Registration, CredentialSchema, IssuedCredential, Transaction, IIssuedCredential } from '../models';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface CredentialIssuanceRequest {
  registrationId: string;
  schemaId: string;
  credentialData: Record<string, any>;
  issuedBy: string;
}

export interface ConnectionInvitationRequest {
  registrationId: string;
  expirationHours?: number;
}

export class CredentialService {
  private static instance: CredentialService;
  private issuerIdentifierName: string = 'ssi-issuer-main';

  private constructor() {}

  public static getInstance(): CredentialService {
    if (!CredentialService.instance) {
      CredentialService.instance = new CredentialService();
    }
    return CredentialService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing Credential Service...');
      
      // Ensure we have a main issuer identifier
      await this.ensureIssuerIdentifier();
      
      logger.info('Credential Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Credential Service:', error);
      throw error;
    }
  }

  private async ensureIssuerIdentifier(): Promise<void> {
    try {
      // Try to get existing identifier
      let identifier;
      try {
        identifier = await keriaClient.getIdentifier(this.issuerIdentifierName);
        logger.info(`Using existing issuer identifier: ${this.issuerIdentifierName}`);
      } catch (error) {
        // Identifier doesn't exist, create it
        logger.info(`Creating new issuer identifier: ${this.issuerIdentifierName}`);
        identifier = await keriaClient.createIdentifier(this.issuerIdentifierName, {
          toad: 3, // Threshold of acceptable duplicity
          wits: [] // Witnesses (will be configured based on infrastructure)
        });
        
        // Log the creation
        await Transaction.log('registration', this.issuerIdentifierName, {
          action: 'issuer_identifier_created',
          identifier: identifier
        });
      }

      logger.info(`Issuer identifier ready: ${identifier.prefix}`);
    } catch (error) {
      logger.error('Failed to ensure issuer identifier:', error);
      throw error;
    }
  }

  public async createConnectionInvitation(request: ConnectionInvitationRequest): Promise<{
    invitationId: string;
    invitationUrl: string;
    qrCode: string;
    expiresAt: Date;
  }> {
    try {
      logger.info(`Creating connection invitation for registration: ${request.registrationId}`);

      // Get the issuer identifier to extract OOBI
      const identifier = await keriaClient.getIdentifier(this.issuerIdentifierName);
      
      if (!identifier || !identifier.oobi) {
        throw new Error('Issuer identifier OOBI not available');
      }

      // Create invitation data
      const invitationId = uuidv4();
      const expirationHours = request.expirationHours || 24;
      const expiresAt = new Date(Date.now() + (expirationHours * 60 * 60 * 1000));

      // Create OOBI URL for the invitation
      const invitationUrl = identifier.oobi;

      // Generate QR code data (the OOBI URL)
      const qrCode = invitationUrl;

      // Log the invitation creation
      await Transaction.log('connection', request.registrationId, {
        action: 'invitation_created',
        invitationId,
        expiresAt
      });

      logger.info(`Connection invitation created: ${invitationId}`);

      return {
        invitationId,
        invitationUrl,
        qrCode,
        expiresAt
      };
    } catch (error) {
      logger.error('Failed to create connection invitation:', error);
      throw error;
    }
  }

  public async resolveConnection(oobi: string, alias: string): Promise<any> {
    try {
      logger.info(`Resolving connection with alias: ${alias}`);

      // Resolve the OOBI
      await keriaClient.resolveOOBI(oobi);

      // Add as contact
      const contact = await keriaClient.addContact(alias, oobi);

      // Log the connection
      await Transaction.log('connection', alias, {
        action: 'connection_resolved',
        oobi,
        contact
      });

      logger.info(`Connection resolved successfully: ${alias}`);
      return contact;
    } catch (error) {
      logger.error(`Failed to resolve connection ${alias}:`, error);
      throw error;
    }
  }

  public async issueCredential(request: CredentialIssuanceRequest): Promise<IIssuedCredential> {
    try {
      logger.info(`Issuing credential for registration: ${request.registrationId}`);

      // Get registration and schema
      const registration = await Registration.findById(request.registrationId);
      if (!registration) {
        throw new Error('Registration not found');
      }

      const schema = await CredentialSchema.findById(request.schemaId);
      if (!schema) {
        throw new Error('Schema not found');
      }

      // Ensure we have a registry for this schema
      const registryName = `registry-${request.schemaId}`;
      await this.ensureRegistry(registryName);

      // Create credential ID
      const credentialId = uuidv4();

      // Prepare credential data for KERIA
      const credentialData = {
        ri: registryName, // Registry identifier
        s: request.schemaId, // Schema identifier
        a: {
          ...request.credentialData,
          id: credentialId,
          issuedAt: new Date().toISOString(),
          issuedBy: request.issuedBy
        }
      };

      // Issue credential through KERIA
      const keriaResult = await keriaClient.issueCredential(
        this.issuerIdentifierName,
        credentialData
      );

      // Store credential in database
      const issuedCredential = new IssuedCredential({
        _id: credentialId,
        registrationId: request.registrationId,
        schemaId: request.schemaId,
        recipientIdentifier: registration.connectionId || 'pending',
        credentialData: credentialData.a,
        status: 'active',
        issuedAt: new Date()
      });

      await issuedCredential.save();

      // Log the issuance
      await Transaction.log('issuance', credentialId, {
        action: 'credential_issued',
        registrationId: request.registrationId,
        schemaId: request.schemaId,
        keriaResult
      }, request.issuedBy);

      logger.info(`Credential issued successfully: ${credentialId}`);
      return issuedCredential;
    } catch (error) {
      logger.error('Failed to issue credential:', error);
      throw error;
    }
  }

  private async ensureRegistry(registryName: string): Promise<void> {
    try {
      // Check if registry already exists
      const registries = await keriaClient.listRegistries(this.issuerIdentifierName);
      const existingRegistry = registries.find(r => r.name === registryName);

      if (!existingRegistry) {
        logger.info(`Creating registry: ${registryName}`);
        await keriaClient.createRegistry(this.issuerIdentifierName, registryName);
        
        // Log registry creation
        await Transaction.log('schema', registryName, {
          action: 'registry_created',
          registryName
        });
      } else {
        logger.debug(`Registry already exists: ${registryName}`);
      }
    } catch (error) {
      logger.error(`Failed to ensure registry ${registryName}:`, error);
      throw error;
    }
  }

  public async revokeCredential(credentialId: string, revokedBy: string): Promise<IIssuedCredential> {
    try {
      logger.info(`Revoking credential: ${credentialId}`);

      // Get credential from database
      const credential = await IssuedCredential.findById(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      if (credential.status === 'revoked') {
        throw new Error('Credential already revoked');
      }

      // Revoke in database
      (credential as any).status = 'revoked';
      (credential as any).revokedBy = revokedBy;
      (credential as any).revokedAt = new Date();
      await credential.save();

      // TODO: Implement KERIA revocation when available
      // For now, we just update the database status

      // Log the revocation
      await Transaction.log('revocation', credentialId, {
        action: 'credential_revoked',
        previousStatus: 'active'
      }, revokedBy);

      logger.info(`Credential revoked successfully: ${credentialId}`);
      return credential;
    } catch (error) {
      logger.error(`Failed to revoke credential ${credentialId}:`, error);
      throw error;
    }
  }

  public async getCredentialStatus(credentialId: string): Promise<{
    status: string;
    issuedAt: Date;
    revokedAt?: Date;
    details: any;
  }> {
    try {
      const credential = await IssuedCredential.findById(credentialId)
        .populate('registrationId')
        .populate('schemaId');

      if (!credential) {
        throw new Error('Credential not found');
      }

      return {
        status: credential.status,
        issuedAt: credential.issuedAt,
        revokedAt: credential.revokedAt,
        details: {
          registration: credential.registrationId,
          schema: credential.schemaId,
          credentialData: credential.credentialData
        }
      };
    } catch (error) {
      logger.error(`Failed to get credential status ${credentialId}:`, error);
      throw error;
    }
  }

  public async listIssuedCredentials(filters?: {
    status?: string;
    schemaId?: string;
    registrationId?: string;
    limit?: number;
    skip?: number;
  }): Promise<IIssuedCredential[]> {
    try {
      let query: any = {};

      if (filters?.status) {
        query.status = filters.status;
      }
      if (filters?.schemaId) {
        query.schemaId = filters.schemaId;
      }
      if (filters?.registrationId) {
        query.registrationId = filters.registrationId;
      }

      const queryBuilder = IssuedCredential.find(query)
        .populate('registrationId')
        .populate('schemaId')
        .sort({ issuedAt: -1 });

      if (filters?.limit) {
        queryBuilder.limit(filters.limit);
      }
      if (filters?.skip) {
        queryBuilder.skip(filters.skip);
      }

      return await queryBuilder.exec();
    } catch (error) {
      logger.error('Failed to list issued credentials:', error);
      throw error;
    }
  }

  public async getKeriaStatus(): Promise<any> {
    try {
      const healthCheck = await keriaClient.healthCheck();
      const identifiers = await keriaClient.listIdentifiers();
      const registries = await keriaClient.listRegistries();
      const contacts = await keriaClient.listContacts();

      return {
        health: healthCheck,
        identifiers: identifiers.length,
        registries: registries.length,
        contacts: contacts.length,
        issuerIdentifier: this.issuerIdentifierName
      };
    } catch (error) {
      logger.error('Failed to get KERIA status:', error);
      throw error;
    }
  }
}

export const credentialService = CredentialService.getInstance();