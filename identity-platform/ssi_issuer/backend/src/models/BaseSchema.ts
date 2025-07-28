import { Schema, Document } from 'mongoose';

export interface BaseDocument extends Document {
  createdAt: Date;
  updatedAt: Date;
}

export const baseSchemaOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: {
    transform: function(doc: any, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    transform: function(doc: any, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
};

export function addBaseFields(schema: Schema): void {
  // Timestamps are handled by mongoose timestamps option
  // Add any other common fields here if needed
}