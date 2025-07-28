import { Schema, model, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { BaseDocument, baseSchemaOptions } from './BaseSchema';

export interface IAdminUser extends BaseDocument {
  username: string;
  passwordHash: string;
  email: string;
  lastLogin?: Date;
  comparePassword(password: string): Promise<boolean>;
  updateLastLogin(): Promise<IAdminUser>;
}

const adminUserSchema = new Schema<IAdminUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
    validate: {
      validator: function(username: string) {
        return /^[a-zA-Z0-9_-]+$/.test(username);
      },
      message: 'Username can only contain letters, numbers, underscores, and hyphens'
    }
  },
  passwordHash: {
    type: String,
    required: true,
    minlength: 6
  },
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
  lastLogin: {
    type: Date
  }
}, baseSchemaOptions);

// Indexes
adminUserSchema.index({ username: 1 });
adminUserSchema.index({ email: 1 });

// Pre-save middleware to hash password
adminUserSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance methods
adminUserSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

adminUserSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Static methods interface
interface IAdminUserModel extends Model<IAdminUser> {
  findByUsername(username: string): Promise<IAdminUser | null>;
  findByEmail(email: string): Promise<IAdminUser | null>;
  createAdmin(username: string, password: string, email: string): Promise<IAdminUser>;
}

// Static methods
adminUserSchema.statics.findByUsername = function(username: string) {
  return this.findOne({ username });
};

adminUserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

adminUserSchema.statics.createAdmin = async function(username: string, password: string, email: string) {
  const admin = new this({
    username,
    passwordHash: password, // Will be hashed by pre-save middleware
    email
  });
  
  return admin.save();
};

// Don't return password hash in JSON
adminUserSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

export const AdminUser = model<IAdminUser, IAdminUserModel>('AdminUser', adminUserSchema);