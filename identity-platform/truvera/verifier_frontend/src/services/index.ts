// Export all services from a single entry point
export { apiService, default as ApiService } from './api';
export { verificationService, VerificationService } from './verification';

// Re-export commonly used service instances
import { apiService } from './api';
import { verificationService } from './verification';

export const services = {
  api: apiService,
  verification: verificationService,
} as const;