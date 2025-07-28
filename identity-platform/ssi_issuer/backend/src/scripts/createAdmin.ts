import { dbManager } from '../database/connection';
import { AdminUser } from '../models/AdminUser';
import { logger } from '../utils/logger';

async function createDefaultAdmin() {
  try {
    // Initialize database connection
    await dbManager.initialize();
    
    // Check if any admin users exist
    const existingAdmin = await AdminUser.findOne({});
    if (existingAdmin) {
      logger.info('Admin user already exists. Skipping creation.');
      process.exit(0);
    }

    // Create default admin user
    const defaultAdmin = await AdminUser.createAdmin(
      'admin',
      'admin123', // This will be hashed by the pre-save middleware
      'admin@localhost'
    );

    logger.info(`Default admin user created successfully:`);
    logger.info(`Username: ${defaultAdmin.username}`);
    logger.info(`Email: ${defaultAdmin.email}`);
    logger.info(`Password: admin123 (change this immediately!)`);
    
    process.exit(0);
  } catch (error) {
    logger.error('Failed to create default admin user:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createDefaultAdmin();
}

export { createDefaultAdmin };