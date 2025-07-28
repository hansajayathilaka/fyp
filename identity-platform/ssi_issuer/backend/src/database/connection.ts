import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { config } from '../config';

class DatabaseManager {
  private static instance: DatabaseManager;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async initialize(): Promise<void> {
    try {
      if (this.isConnected) {
        logger.warn('Database already connected');
        return;
      }

      logger.info('Connecting to MongoDB...');
      
      await mongoose.connect(config.database.uri, config.database.options);
      
      this.isConnected = true;
      
      // Set up connection event listeners
      this.setupEventListeners();

      logger.info('MongoDB connection established successfully');
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      this.isConnected = false;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await this.close();
      process.exit(0);
    });
  }

  public async close(): Promise<void> {
    try {
      if (this.isConnected) {
        await mongoose.connection.close();
        this.isConnected = false;
        logger.info('MongoDB connection closed');
      }
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
    }
  }

  public getConnection(): typeof mongoose {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call initialize() first.');
    }
    return mongoose;
  }

  // Health check method
  public healthCheck(): { status: string; details: any } {
    try {
      const readyState = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };

      return {
        status: readyState === 1 ? 'healthy' : 'error',
        details: {
          connected: this.isConnected,
          readyState: states[readyState as keyof typeof states],
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          name: mongoose.connection.name
        }
      };
    } catch (error) {
      return {
        status: 'error',
        details: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // Transaction helper method
  public async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      const result = await fn();
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

export const dbManager = DatabaseManager.getInstance();