import { Schema, model, Document, Model } from 'mongoose';
import { BaseDocument, baseSchemaOptions } from './BaseSchema';

export interface ITransaction extends BaseDocument {
  type: 'registration' | 'approval' | 'issuance' | 'revocation' | 'connection' | 'schema';
  entityId: string;
  details: Record<string, any>;
  performedBy?: string;
  timestamp: Date;
}

const transactionSchema = new Schema<ITransaction>({
  type: {
    type: String,
    enum: ['registration', 'approval', 'issuance', 'revocation', 'connection', 'schema'],
    required: true
  },
  entityId: {
    type: String,
    required: true,
    trim: true
  },
  details: {
    type: Schema.Types.Mixed,
    required: true
  },
  performedBy: {
    type: String,
    ref: 'AdminUser'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, baseSchemaOptions);

// Indexes
transactionSchema.index({ type: 1 });
transactionSchema.index({ entityId: 1 });
transactionSchema.index({ timestamp: -1 });
transactionSchema.index({ performedBy: 1 });
transactionSchema.index({ type: 1, timestamp: -1 });

// Static methods
transactionSchema.statics.findByType = function(type: string, limit?: number, skip?: number) {
  const query = this.find({ type }).sort({ timestamp: -1 });
  if (limit) query.limit(limit);
  if (skip) query.skip(skip);
  return query;
};

transactionSchema.statics.findByEntity = function(entityId: string) {
  return this.find({ entityId }).sort({ timestamp: -1 });
};

transactionSchema.statics.findByPerformer = function(performedBy: string) {
  return this.find({ performedBy }).sort({ timestamp: -1 });
};

transactionSchema.statics.findRecent = function(limit: number = 50) {
  return this.find({}).sort({ timestamp: -1 }).limit(limit);
};

transactionSchema.statics.findByDateRange = function(startDate: Date, endDate: Date) {
  return this.find({
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ timestamp: -1 });
};

transactionSchema.statics.countByType = function(type: string) {
  return this.countDocuments({ type });
};

// Static methods interface
interface ITransactionModel extends Model<ITransaction> {
  findByType(type: string, limit?: number, skip?: number): Promise<ITransaction[]>;
  findByEntity(entityId: string): Promise<ITransaction[]>;
  findByPerformer(performedBy: string): Promise<ITransaction[]>;
  findRecent(limit?: number): Promise<ITransaction[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<ITransaction[]>;
  countByType(type: string): Promise<number>;
  log(type: ITransaction['type'], entityId: string, details: Record<string, any>, performedBy?: string): Promise<ITransaction>;
}

// Static helper method to log transactions
transactionSchema.statics.log = function(
  type: ITransaction['type'],
  entityId: string,
  details: Record<string, any>,
  performedBy?: string
) {
  return this.create({
    type,
    entityId,
    details,
    performedBy,
    timestamp: new Date()
  });
};

export const Transaction = model<ITransaction, ITransactionModel>('Transaction', transactionSchema);