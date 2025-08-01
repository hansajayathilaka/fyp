// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Ensure the API URL doesn't end with a slash
const normalizedApiUrl = API_BASE_URL.replace(/\/$/, '');

export const apiConfig = {
  baseUrl: normalizedApiUrl,
  endpoints: {
    session: {
      create: `${normalizedApiUrl}/api/session/create`,
    },
    wallet: {
      connect: `${normalizedApiUrl}/api/wallet/connect`,
    },
    credentials: {
      form: `${normalizedApiUrl}/api/credentials/form`,
      validate: `${normalizedApiUrl}/api/credentials/validate`,
      issue: `${normalizedApiUrl}/api/credentials/issue`,
      qrGenerate: `${normalizedApiUrl}/api/credentials/qr-generate`,
      createOffer: `${normalizedApiUrl}/api/credentials/create-offer`,
      status: (sessionId: string) => `${normalizedApiUrl}/api/credentials/status/${sessionId}`,
      summary: (sessionId: string) => `${normalizedApiUrl}/api/credentials/summary/${sessionId}`,
    },
  },
};

// Helper function to make API calls with proper error handling
export const apiCall = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

export default apiConfig;