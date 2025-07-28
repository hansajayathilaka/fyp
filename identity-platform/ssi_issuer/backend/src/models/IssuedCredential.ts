import { Schema, model, Document } from 'mongoose';
import { BaseDocument, baseSchemaOptions } from './BaseSchema';

export interface IIssuedCredential extends BaseDocument {
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

const issuedCredentialSchema = new Schema<IIssuedCredential>({
  _id: {
    type: String,
    required: true
  },
  registrationId: {
    type: String,
    required: true,
    ref: 'Registration'
  },
  schemaId: {
    type: String,
    required: true,
    ref: 'CredentialSchema'
  },
  recipientIdentifier: {
    type: String,
    required: true,
    trim: true
  },
  credentialData: {
    type: Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'revoked'],
    default: 'active'
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  revokedAt: {
    type: Date
  },
  revokedBy: {
    type: String,
    ref: 'AdminUser'
  }
}, baseSchemaOptions);

// Indexes
issuedCredentialSchema.index({ registrationId: 1 });
issuedCredentialSchema.index({ schemaId: 1 });
issuedCredentialSchema.index({ recipientIdentifier: 1 });
issuedCredentialSchema.index({ status: 1 });
issuedCredentialSchema.index({ issuedAt: -1 });

// Pre-save middleware
issuedCredentialSchema.pre('save', function(next) {
  if (this.isModified('status') && (this as any).status === 'revoked' && !(this as any).revokedAt) {
    (this as any).revokedAt = new Date();
  }
  next();
});

// Instance methods
issuedCredentialSchema.methods.revoke = function(revokedBy: string) {
  this.status = 'revoked';
  this.revokedBy = revokedBy;
  this.revokedAt = new Date();
  return this.save();
};

// Static methods
issuedCredentialSchema.statics.findByRegistration = function(registrationId: string) {
  return this.find({ registrationId }).populate('schemaId');
};

issuedCredentialSchema.statics.findBySchema = function(schemaId: string) {
  return this.find({ schemaId }).populate('registrationId');
};

issuedCredentialSchema.statics.findByRecipient = function(recipientIdentifier: string) {
  return this.find({ recipientIdentifier }).populate(['schemaId', 'registrationId']);
};

issuedCredentialSchema.statics.findActive = function() {
  return this.find({ status: 'active' }).sort({ issuedAt: -1 });
};

issuedCredentialSchema.statics.findRevoked = function() {
  return this.find({ status: 'revoked' }).sort({ revokedAt: -1 });
};

issuedCredentialSchema.statics.countByStatus = function(status: string) {
  return this.countDocuments({ status });
};

export const IssuedCredential = model<IIssuedCredential>('IssuedCredential', issuedCredentialSchema);