import { ConnectionInvitation, Connection } from '../models/Connection';
import { Registration } from '../models/Registration';
import { Transaction } from '../models/Transaction';
import { keriaClient } from './KeriaClient';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface OOBIInvitationData {
  registrationId: string;
  expirationHours?: number;
}

export interface OOBIGenerationResult {
  invitationId: string;
  oobiUrl: string;
  expiresAt: Date;
  qrCodeData?: string;
}

class OOBIService {
  private readonly DEFAULT_EXPIRATION_HOURS = 24;
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Generate OOBI invitation for a registration
   */
  async generateInvitation(data: OOBIInvitationData): Promise<OOBIGenerationResult> {
    try {
      const { registrationId, expirationHours = this.DEFAULT_EXPIRATION_HOURS } = data;

      // Validate registration exists and is approved
      const registration = await Registration.findById(registrationId);
      if (!registration) {
        throw new Error('Registration not found');
      }

      if (registration.status !== 'approved') {
        throw new Error('Registration must be approved before generating invitation');
      }

      // Check if active invitation already exists
      const existingInvitation = await ConnectionInvitation.findOne({
        registrationId,
        state: { $in: ['invitation', 'request', 'response'] },
        expiresAt: { $gt: new Date() }
      });

      if (existingInvitation) {
        logger.info('Returning existing active invitation', {
          invitationId: existingInvitation.invitationId,
          registrationId
        });

        return {
          invitationId: existingInvitation.invitationId,
          oobiUrl: existingInvitation.invitationUrl,
          expiresAt: existingInvitation.expiresAt
        };
      }

      // Get available identifiers
      const identifiers = await keriaClient.identifiers().list();
      if (!identifiers || identifiers.length === 0) {
        throw new Error('No KERIA identifiers available');
      }

      // Use the first available identifier
      const identifier = identifiers[0];
      const identifierDetails = await keriaClient.identifiers().getOOBI(identifier.name);

      if (!identifierDetails.oobi) {
        throw new Error('Failed to generate OOBI for identifier');
      }

      // Generate invitation ID
      const invitationId = uuidv4();

      // Set expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expirationHours);

      // Create invitation data
      const invitationData = {
        invitationId,
        registrationId,
        identifier: identifier.name,
        identifierPrefix: identifierDetails.prefix,
        oobi: identifierDetails.oobi,
        timestamp: new Date().toISOString(),
        expirationHours
      };

      // Save invitation to database
      const invitation = new ConnectionInvitation({
        invitationId,
        registrationId,
        invitationData,
        invitationUrl: identifierDetails.oobi,
        state: 'invitation',
        expiresAt
      });

      await invitation.save();

      // Update registration with invitation ID
      registration.connectionId = invitationId;
      registration.connectionStatus = 'pending';
      await registration.save();

      // Log transaction
      await Transaction.log(
        'oobi_invitation_generated',
        'connection',
        invitationId,
        {
          registrationId,
          email: registration.email,
          identifierName: identifier.name,
          oobiUrl: identifierDetails.oobi,
          expiresAt
        },
        undefined,
        'info'
      );

      logger.info('OOBI invitation generated successfully', {
        invitationId,
        registrationId,
        email: registration.email,
        expiresAt
      });

      return {
        invitationId,
        oobiUrl: identifierDetails.oobi,
        expiresAt
      };

    } catch (error) {
      logger.error('Error generating OOBI invitation:', error);
      throw error;
    }
  }

  /**
   * Accept OOBI invitation and establish connection
   */
  async acceptInvitation(invitationId: string, contactAlias?: string): Promise<{
    connectionId: string;
    alias: string;
    state: string;
  }> {
    try {
      // Find invitation
      const invitation = await ConnectionInvitation.findOne({ invitationId });
      if (!invitation) {
        throw new Error('Invitation not found');
      }

      // Check if invitation is expired
      if (invitation.isExpired()) {
        throw new Error('Invitation has expired');
      }

      // Check if already accepted
      if (invitation.state === 'active') {
        throw new Error('Invitation already accepted');
      }

      // Generate contact alias if not provided
      const alias = contactAlias || `contact_${invitation.registrationId}_${Date.now()}`;

      // Resolve OOBI and add contact via KERIA
      await keriaClient.oobis().resolve(invitation.invitationUrl);
      await keriaClient.contacts().add(alias, invitation.invitationUrl);

      // Update invitation state
      invitation.state = 'active';
      await invitation.save();

      // Create connection record
      const connection = new Connection({
        connectionId: invitationId,
        invitationId,
        theirLabel: alias,
        state: 'active',
        connectionData: {
          alias,
          oobi: invitation.invitationUrl,
          acceptedAt: new Date(),
          invitationData: invitation.invitationData
        }
      });

      await connection.save();

      // Update registration connection status
      const registration = await Registration.findById(invitation.registrationId);
      if (registration) {
        registration.connectionStatus = 'connected';
        await registration.save();
      }

      // Log transaction
      await Transaction.log(
        'oobi_invitation_accepted',
        'connection',
        invitationId,
        {
          invitationId,
          registrationId: invitation.registrationId,
          alias,
          oobi: invitation.invitationUrl
        },
        undefined,
        'info'
      );

      logger.info('OOBI invitation accepted successfully', {
        invitationId,
        alias,
        registrationId: invitation.registrationId
      });

      return {
        connectionId: connection.connectionId,
        alias,
        state: 'active'
      };

    } catch (error) {
      logger.error('Error accepting OOBI invitation:', error);
      
      // Update invitation state to error if it exists
      try {
        const invitation = await ConnectionInvitation.findOne({ invitationId });
        if (invitation && invitation.state !== 'active') {
          invitation.state = 'error';
          await invitation.save();

          // Update registration connection status
          const registration = await Registration.findById(invitation.registrationId);
          if (registration) {
            registration.connectionStatus = 'failed';
            await registration.save();
          }
        }
      } catch (updateError) {
        logger.error('Error updating invitation state after failure:', updateError);
      }

      throw error;
    }
  }

  /**
   * Get invitation details
   */
  async getInvitation(invitationId: string): Promise<ConnectionInvitation | null> {
    try {
      const invitation = await ConnectionInvitation.findOne({ invitationId });
      return invitation;
    } catch (error) {
      logger.error('Error getting invitation:', error);
      throw error;
    }
  }

  /**
   * List invitations for a registration
   */
  async getInvitationsForRegistration(registrationId: string): Promise<ConnectionInvitation[]> {
    try {
      const invitations = await ConnectionInvitation.find({ registrationId })
        .sort({ createdAt: -1 });
      return invitations;
    } catch (error) {
      logger.error('Error getting invitations for registration:', error);
      throw error;
    }
  }

  /**
   * Get connection status for a registration
   */
  async getConnectionStatus(registrationId: string): Promise<{
    registrationId: string;
    connectionStatus: string;
    invitation?: any;
    connection?: any;
  }> {
    try {
      // Get registration
      const registration = await Registration.findById(registrationId);
      if (!registration) {
        throw new Error('Registration not found');
      }

      // Get latest invitation
      const invitation = await ConnectionInvitation.findOne({ registrationId })
        .sort({ createdAt: -1 });

      // Get active connection
      const connection = await Connection.findOne({
        invitationId: invitation?.invitationId
      });

      return {
        registrationId,
        connectionStatus: registration.connectionStatus,
        invitation: invitation ? {
          invitationId: invitation.invitationId,
          state: invitation.state,
          expiresAt: invitation.expiresAt,
          isExpired: invitation.isExpired(),
          createdAt: invitation.createdAt
        } : null,
        connection: connection ? {
          connectionId: connection.connectionId,
          state: connection.state,
          theirLabel: connection.theirLabel,
          createdAt: connection.createdAt
        } : null
      };

    } catch (error) {
      logger.error('Error getting connection status:', error);
      throw error;
    }
  }

  /**
   * Clean up expired invitations
   */
  async cleanupExpiredInvitations(): Promise<number> {
    try {
      const expiredInvitations = await ConnectionInvitation.find({
        expiresAt: { $lte: new Date() },
        state: { $in: ['invitation', 'request', 'response'] }
      });

      let cleanedCount = 0;

      for (const invitation of expiredInvitations) {
        // Mark invitation as abandoned
        invitation.state = 'abandoned';
        await invitation.save();

        // Update registration connection status if still pending
        const registration = await Registration.findById(invitation.registrationId);
        if (registration && registration.connectionStatus === 'pending') {
          registration.connectionStatus = 'failed';
          await registration.save();
        }

        // Log cleanup
        await Transaction.log(
          'oobi_invitation_expired',
          'connection',
          invitation.invitationId,
          {
            invitationId: invitation.invitationId,
            registrationId: invitation.registrationId,
            expiredAt: invitation.expiresAt
          },
          undefined,
          'info'
        );

        cleanedCount++;
      }

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired OOBI invitations`);
      }

      return cleanedCount;

    } catch (error) {
      logger.error('Error cleaning up expired invitations:', error);
      throw error;
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupExpiredInvitations();
      } catch (error) {
        logger.error('Error in automatic cleanup:', error);
      }
    }, this.CLEANUP_INTERVAL_MS);

    logger.info('OOBI cleanup timer started');
  }

  /**
   * Stop cleanup timer
   */
  public stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
      logger.info('OOBI cleanup timer stopped');
    }
  }

  /**
   * Get OOBI statistics
   */
  async getOOBIStats(): Promise<{
    totalInvitations: number;
    activeInvitations: number;
    expiredInvitations: number;
    acceptedInvitations: number;
    failedInvitations: number;
  }> {
    try {
      const [
        totalInvitations,
        activeInvitations,
        expiredInvitations,
        acceptedInvitations,
        failedInvitations
      ] = await Promise.all([
        ConnectionInvitation.countDocuments(),
        ConnectionInvitation.countDocuments({
          state: { $in: ['invitation', 'request', 'response'] },
          expiresAt: { $gt: new Date() }
        }),
        ConnectionInvitation.countDocuments({
          expiresAt: { $lte: new Date() }
        }),
        ConnectionInvitation.countDocuments({ state: 'active' }),
        ConnectionInvitation.countDocuments({ state: { $in: ['error', 'abandoned'] } })
      ]);

      return {
        totalInvitations,
        activeInvitations,
        expiredInvitations,
        acceptedInvitations,
        failedInvitations
      };

    } catch (error) {
      logger.error('Error getting OOBI stats:', error);
      throw error;
    }
  }
}

export const oobiService = new OOBIService();