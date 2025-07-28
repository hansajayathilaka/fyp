import { Schema, model, Document } from 'mongoose';
import { BaseDocument, baseSchemaOptions } from './BaseSchema';

export interface IRegistration extends BaseDocument {
  email: string;
  fullName: string;
  phone?: string;
  organization?: string;
  requestedSchemaId: string;
  status: 'pending' | 'approved' | 'rejected';
  applicationData: Record<string, any>;
  connectionId?: string;
  connectionStatus: 'pending' | 'connected' | 'failed';
  reviewedBy?: string;
  reviewedAt?: Date;
}

const registrationSchema = new Schema<IRegistration>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(phone: string) {
        return !phone || /^[\+]?[1-9][\d]{0,15}$/.test(phone);
      },
      message: 'Invalid phone number format'
    }
  },
  organization: {
    type: String,
    trim: true,
    maxlength: 200
  },
  requestedSchemaId: {
    type: String,
    required: true,
    ref: 'CredentialSchema'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  applicationData: {
    type: Schema.Types.Mixed,
    required: true,
    default: {}
  },
  connectionId: {
    type: String,
    sparse: true
  },
  connectionStatus: {
    type: String,
    enum: ['pending', 'connected', 'failed'],
    default: 'pending'
  },
  reviewedBy: {
    type: String,
    ref: 'AdminUser'
  },
  reviewedAt: {
    type: Date
  }
}, baseSchemaOptions);

// Indexes for better query performance
registrationSchema.index({ email: 1 });
registrationSchema.index({ status: 1 });
registrationSchema.index({ createdAt: -1 });
registrationSchema.index({ requestedSchemaId: 1 });
registrationSchema.index({ connectionStatus: 1 });

// Pre-save middleware to update reviewedAt when status changes
registrationSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status !== 'pending' && !this.reviewedAt) {
    this.reviewedAt = new Date();
  }
  next();
});

// Instance methods
registrationSchema.methods.approve = function(reviewedBy: string) {
  this.status = 'approved';
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  return this.save();
};

registrationSchema.methods.reject = function(reviewedBy: string) {
  this.status = 'rejected';
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  return this.save();
};

registrationSchema.methods.updateConnectionStatus = function(connectionId: string, status: 'pending' | 'connected' | 'failed') {
  this.connectionId = connectionId;
  this.connectionStatus = status;
  return this.save();
};

// Static methods
registrationSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

registrationSchema.statics.findByStatus = function(status: string, limit?: number, skip?: number) {
  const query = this.find({ status }).sort({ createdAt: -1 });
  if (limit) query.limit(limit);
  if (skip) query.skip(skip);
  return query;
};

registrationSchema.statics.findPending = function(limit?: number, skip?: number) {
  return (this as any).findByStatus('pending', limit, skip);
};

registrationSchema.statics.countByStatus = function(status: string) {
  return this.countDocuments({ status });
};

export const Registration = model<IRegistration>('Registration', registrationSchema);