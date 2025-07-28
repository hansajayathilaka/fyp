import { Registration, IRegistration } from '../models/Registration';
import { CredentialSchema } from '../models/CredentialSchema';
import { ConnectionInvitation, Connection } from '../models/Connection';
import { Transaction } from '../models/Transaction';
import { logger } from '../utils/logger';
import { Types } from 'mongoose';

export interface RegistrationCreateData {
  email: string;
  fullName: string;
  phone?: string;
  organization?: string;
  requestedSchemaId: string;
  applicationData: Record<string, any>;
}

export interface RegistrationUpdateData {
  fullName?: string;
  phone?: string;
  organization?: string;
  applicationData?: Record<string, any>;
}

export interface RegistrationFilters {
  status?: 'pending' | 'approved' | 'rejected';
  connectionStatus?: 'pending' | 'connected' | 'failed';
  requestedSchemaId?: string;
  email?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class RegistrationService {
  /**
   * Create a new registration with validation
   */
  async createRegistration(data: RegistrationCreateData): Promise<IRegistration> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new Error('Invalid email format');
      }

      // Check if email already exists
      const existingRegistration = await Registration.findByEmail(data.email);
      if (existingRegistration) {
        throw new Error('Email already registered');
      }

      // Validate schema exists and is active
      const schema = await CredentialSchema.findById(data.requestedSchemaId);
      if (!schema) {
        throw new Error('Requested schema not found');
      }

      if (!schema.isActive) {
        throw new Error('Requested schema is not active');
      }

      // Validate application data against schema if schema has validation rules
      if (schema.schemaData && schema.schemaData.required) {
        const missingFields = schema.schemaData.required.filter(
          (field: string) => !data.applicationData[field]
        );
        
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
      }

      // Sanitize input data
      const sanitizedData = {
        email: data.email.toLowerCase().trim(),
        fullName: data.fullName.trim(),
        phone: data.phone?.trim(),
        organization: data.organization?.trim(),
        requestedSchemaId: data.requestedSchemaId,
        applicationData: this.sanitizeApplicationData(data.applicationData),
        status: 'pending' as const,
        connectionStatus: 'pending' as const
      };

      // Create registration
      const registration = new Registration(sanitizedData);
      await registration.save();

      // Log transaction
      await Transaction.log(
        'registration_created',
        'registration',
        registration._id.toString(),
        {
          email: registration.email,
          fullName: registration.fullName,
          requestedSchemaId: data.requestedSchemaId,
          schemaName: schema.name
        },
        undefined,
        'info'
      );

      logger.info('Registration created successfully', {
        registrationId: registration._id,
        email: registration.email,
        schemaId: data.requestedSchemaId
      });

      return registration;

    } catch (error) {
      logger.error('Error creating registration:', error);
      throw error;
    }
  }

  /**
   * Get registration by ID
   */
  async getRegistrationById(id: string): Promise<IRegistration | null> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        return null;
      }

      const registration = await Registration.findById(id)
        .populate('requestedSchemaId', 'name description version');
      
      return registration;
    } catch (error) {
      logger.error('Error getting registration by ID:', error);
      throw error;
    }
  }

  /**
   * Get registration by email
   */
  async getRegistrationByEmail(email: string): Promise<IRegistration | null> {
    try {
      const registration = await Registration.findByEmail(email)
        .populate('requestedSchemaId', 'name description version');
      
      return registration;
    } catch (error) {
      logger.error('Error getting registration by email:', error);
      throw error;
    }
  }

  /**
   * List registrations with filters and pagination
   */
  async listRegistrations(
    filters: RegistrationFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{
    registrations: IRegistration[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = pagination;

      // Build query
      const query: any = {};

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.connectionStatus) {
        query.connectionStatus = filters.connectionStatus;
      }

      if (filters.requestedSchemaId) {
        query.requestedSchemaId = filters.requestedSchemaId;
      }

      if (filters.email) {
        query.email = { $regex: filters.email, $options: 'i' };
      }

      if (filters.createdAfter || filters.createdBefore) {
        query.createdAt = {};
        if (filters.createdAfter) {
          query.createdAt.$gte = filters.createdAfter;
        }
        if (filters.createdBefore) {
          query.createdAt.$lte = filters.createdBefore;
        }
      }

      // Build sort
      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query with pagination
      const skip = (page - 1) * limit;
      
      const [registrations, total] = await Promise.all([
        Registration.find(query)
          .populate('requestedSchemaId', 'name description version')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        Registration.countDocuments(query)
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        registrations,
        total,
        page,
        totalPages
      };

    } catch (error) {
      logger.error('Error listing registrations:', error);
      throw error;
    }
  }

  /**
   * Update registration data
   */
  async updateRegistration(
    id: string,
    data: RegistrationUpdateData,
    updatedBy?: string
  ): Promise<IRegistration> {
    try {
      const registration = await Registration.findById(id);
      if (!registration) {
        throw new Error('Registration not found');
      }

      // Sanitize update data
      const updateData: any = {};

      if (data.fullName) {
        updateData.fullName = data.fullName.trim();
      }

      if (data.phone !== undefined) {
        updateData.phone = data.phone?.trim();
      }

      if (data.organization !== undefined) {
        updateData.organization = data.organization?.trim();
      }

      if (data.applicationData) {
        updateData.applicationData = {
          ...registration.applicationData,
          ...this.sanitizeApplicationData(data.applicationData)
        };
      }

      // Update registration
      Object.assign(registration, updateData);
      await registration.save();

      // Log transaction
      await Transaction.log(
        'registration_updated',
        'registration',
        registration._id.toString(),
        {
          email: registration.email,
          updatedFields: Object.keys(updateData),
          updatedBy
        },
        updatedBy,
        'info'
      );

      logger.info('Registration updated successfully', {
        registrationId: registration._id,
        email: registration.email,
        updatedBy
      });

      return registration;

    } catch (error) {
      logger.error('Error updating registration:', error);
      throw error;
    }
  }

  /**
   * Approve registration
   */
  async approveRegistration(id: string, reviewedBy: string): Promise<IRegistration> {
    try {
      const registration = await Registration.findById(id);
      if (!registration) {
        throw new Error('Registration not found');
      }

      if (registration.status !== 'pending') {
        throw new Error('Registration is not in pending status');
      }

      // Approve registration
      await registration.approve(reviewedBy);

      // Log transaction
      await Transaction.log(
        'registration_approved',
        'registration',
        registration._id.toString(),
        {
          email: registration.email,
          reviewedBy,
          approvedAt: registration.reviewedAt
        },
        reviewedBy,
        'info'
      );

      logger.info('Registration approved successfully', {
        registrationId: registration._id,
        email: registration.email,
        reviewedBy
      });

      return registration;

    } catch (error) {
      logger.error('Error approving registration:', error);
      throw error;
    }
  }

  /**
   * Reject registration
   */
  async rejectRegistration(id: string, reviewedBy: string, reason?: string): Promise<IRegistration> {
    try {
      const registration = await Registration.findById(id);
      if (!registration) {
        throw new Error('Registration not found');
      }

      if (registration.status !== 'pending') {
        throw new Error('Registration is not in pending status');
      }

      // Reject registration
      await registration.reject(reviewedBy);

      // Log transaction
      await Transaction.log(
        'registration_rejected',
        'registration',
        registration._id.toString(),
        {
          email: registration.email,
          reviewedBy,
          rejectedAt: registration.reviewedAt,
          reason
        },
        reviewedBy,
        'info'
      );

      logger.info('Registration rejected successfully', {
        registrationId: registration._id,
        email: registration.email,
        reviewedBy,
        reason
      });

      return registration;

    } catch (error) {
      logger.error('Error rejecting registration:', error);
      throw error;
    }
  }

  /**
   * Update connection status
   */
  async updateConnectionStatus(
    id: string,
    connectionId: string,
    status: 'pending' | 'connected' | 'failed'
  ): Promise<IRegistration> {
    try {
      const registration = await Registration.findById(id);
      if (!registration) {
        throw new Error('Registration not found');
      }

      // Update connection status
      await registration.updateConnectionStatus(connectionId, status);

      // Log transaction
      await Transaction.log(
        'registration_connection_updated',
        'registration',
        registration._id.toString(),
        {
          email: registration.email,
          connectionId,
          connectionStatus: status
        },
        undefined,
        'info'
      );

      logger.info('Registration connection status updated', {
        registrationId: registration._id,
        email: registration.email,
        connectionId,
        status
      });

      return registration;

    } catch (error) {
      logger.error('Error updating connection status:', error);
      throw error;
    }
  }

  /**
   * Get registration statistics
   */
  async getRegistrationStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    connected: number;
    bySchema: Array<{ schemaId: string; schemaName: string; count: number }>;
  }> {
    try {
      const [
        total,
        pending,
        approved,
        rejected,
        connected,
        bySchemaResults
      ] = await Promise.all([
        Registration.countDocuments(),
        Registration.countByStatus('pending'),
        Registration.countByStatus('approved'),
        Registration.countByStatus('rejected'),
        Registration.countDocuments({ connectionStatus: 'connected' }),
        Registration.aggregate([
          {
            $group: {
              _id: '$requestedSchemaId',
              count: { $sum: 1 }
            }
          },
          {
            $lookup: {
              from: 'credentialschemas',
              localField: '_id',
              foreignField: '_id',
              as: 'schema'
            }
          },
          {
            $unwind: '$schema'
          },
          {
            $project: {
              schemaId: '$_id',
              schemaName: '$schema.name',
              count: 1
            }
          }
        ])
      ]);

      return {
        total,
        pending,
        approved,
        rejected,
        connected,
        bySchema: bySchemaResults
      };

    } catch (error) {
      logger.error('Error getting registration stats:', error);
      throw error;
    }
  }

  /**
   * Clean up expired invitations
   */
  async cleanupExpiredInvitations(): Promise<number> {
    try {
      const expiredInvitations = await ConnectionInvitation.findExpired();
      
      let cleanedCount = 0;
      
      for (const invitation of expiredInvitations) {
        // Mark invitation as abandoned
        await invitation.markAbandoned();
        
        // Update registration connection status if still pending
        const registration = await Registration.findById(invitation.registrationId);
        if (registration && registration.connectionStatus === 'pending') {
          registration.connectionStatus = 'failed';
          await registration.save();
        }
        
        cleanedCount++;
      }

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired invitations`);
      }

      return cleanedCount;

    } catch (error) {
      logger.error('Error cleaning up expired invitations:', error);
      throw error;
    }
  }

  /**
   * Sanitize application data to prevent XSS and injection attacks
   */
  private sanitizeApplicationData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Basic sanitization - remove HTML tags and trim
        sanitized[key] = value.replace(/<[^>]*>/g, '').trim();
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? item.replace(/<[^>]*>/g, '').trim() : item
        );
      } else if (value && typeof value === 'object') {
        sanitized[key] = this.sanitizeApplicationData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

export const registrationService = new RegistrationService();