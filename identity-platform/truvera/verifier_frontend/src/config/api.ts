// API configuration for verifier frontend

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:4001',
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

export const API_ENDPOINTS = {
  PROOF_REQUESTS: '/api/proof-requests',
  VERIFY: '/api/verify',
  CUSTOM_ACTION: '/api/integration/custom-action',
} as const;

// Environment configuration
export const ENV_CONFIG = {
  TRUVERA_API_URL: import.meta.env.VITE_TRUVERA_API_URL || '',
  CUSTOM_INTEGRATION_ENABLED: import.meta.env.VITE_CUSTOM_INTEGRATION_ENABLED === 'true',
  DEFAULT_TIMEOUT_MINUTES: parseInt(import.meta.env.VITE_DEFAULT_TIMEOUT_MINUTES || '15'),
};