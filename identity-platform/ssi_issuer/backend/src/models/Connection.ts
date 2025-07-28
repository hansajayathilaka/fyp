import { Schema, model, Document } from 'mongoose';
import { BaseDocument, baseSchemaOptions } from './BaseSchema';

export interface IConnectionInvitation extends BaseDocument {
  invitationId: string;
  registrationId: string;
  invitationData: Record<string, any>;
  invitationUrl: string;
  state: 'invitation' | 'request' | 'response' | 'active' | 'error' | 'abandoned';
  expiresAt: Date;
}

export interface IConnection extends BaseDocument {
  connectionId: string;
  invitationId?: string;
  theirLabel?: string;
  theirDid?: string;
  myDid?: string;
  state: 'invitation' | 'request' | 'response' | 'active' | 'error' | 'abandoned';
  connectionData: Record<string, any>;
}

// Connection Invitation Schema
const connectionInvitationSchema = new Schema<IConnectionInvitation>({
  invitationId: {
    type: String,
    required: true,
    unique: true
  },
  registrationId: {
    type: String,
    required: true,
    ref: 'Registration'
  },
  invitationData: {
    type: Schema.Types.Mixed,
    required: true
  },
  invitationUrl: {
    type: String,
    required: true
  },
  state: {
    type: String,
    enum: ['invitation', 'request', 'response', 'active', 'error', 'abandoned'],
    default: 'invitation'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  }
}, baseSchemaOptions);

// Indexes
connectionInvitationSchema.index({ invitationId: 1 });
connectionInvitationSchema.index({ registrationId: 1 });
connectionInvitationSchema.index({ state: 1 });

// Connection Schema
const connectionSchema = new Schema<IConnection>({
  connectionId: {
    type: String,
    required: true,
    unique: true
  },
  invitationId: {
    type: String,
    ref: 'ConnectionInvitation'
  },
  theirLabel: {
    type: String,
    trim: true
  },
  theirDid: {
    type: String,
    trim: true
  },
  myDid: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    enum: ['invitation', 'request', 'response', 'active', 'error', 'abandoned'],
    default: 'invitation'
  },
  connectionData: {
    type: Schema.Types.Mixed,
    required: true
  }
}, baseSchemaOptions);

// Indexes
connectionSchema.index({ connectionId: 1 });
connectionSchema.index({ invitationId: 1 });
connectionSchema.index({ state: 1 });
connectionSchema.index({ theirDid: 1 });

// Static methods for ConnectionInvitation
connectionInvitationSchema.statics.findByRegistration = function(registrationId: string) {
  return this.find({ registrationId }).sort({ createdAt: -1 });
};

connectionInvitationSchema.statics.findActive = function() {
  return this.find({ 
    state: { $in: ['invitation', 'request', 'response', 'active'] },
    expiresAt: { $gt: new Date() }
  });
};

connectionInvitationSchema.statics.findExpired = function() {
  return this.find({ expiresAt: { $lte: new Date() } });
};

// Static methods for Connection
connectionSchema.statics.findByState = function(state: string) {
  return this.find({ state }).sort({ createdAt: -1 });
};

connectionSchema.statics.findActive = function() {
  return this.find({ state: 'active' }).sort({ createdAt: -1 });
};

connectionSchema.statics.findByInvitation = function(invitationId: string) {
  return this.findOne({ invitationId });
};

// Instance methods
connectionInvitationSchema.methods.isExpired = function() {
  return this.expiresAt <= new Date();
};

connectionInvitationSchema.methods.markAbandoned = function() {
  this.state = 'abandoned';
  return this.save();
};

connectionSchema.methods.activate = function() {
  this.state = 'active';
  return this.save();
};

connectionSchema.methods.markError = function() {
  this.state = 'error';
  return this.save();
};

export const ConnectionInvitation = model<IConnectionInvitation>('ConnectionInvitation', connectionInvitationSchema);
export const Connection = model<IConnection>('Connection', connectionSchema);