import axios, { AxiosInstance, AxiosError } from 'axios';

export interface TruveraConfig {
  apiUrl: string;
  apiKey: string;
}

export interface ProofRequestPayload {
  name: string;
  request: {
    name: string;
    purpose: string;
    input_descriptors: InputDescriptor[];
  };
}

export interface InputDescriptor {
  id: string;
  name: string;
  purpose: string;
  constraints: {
    fields: FieldConstraint[];
  };
}

export interface FieldConstraint {
  path: string[];
  filter: {
    type: string;
    const?: string;
    contains?: any;
  };
}

export interface FieldRequirement {
  path: string;
  required: boolean;
  filter?: {
    type: string;
    const?: string;
    contains?: any;
  };
}

export interface TruveraProofRequest {
  id: string;
  name: string;
  nonce: string;
  did: string;
  verified: boolean;
  expired: boolean;
  created: string;
  updated: string;
  signature: any;
  presentation: any;
  response_url: string;
  type: string;
  qr: string;
  expirationTime: {
    amount: number;
    unit: string;
  };
  request: {
    name: string;
    purpose: string;
    input_descriptors: InputDescriptor[];
    id: string;
  };
  types: string[];
}

export interface TruveraVerificationRequest {
  presentation: any;
  proof_request_id?: string;
}

export interface TruveraVerificationResult {
  verified: boolean;
  results: Array<{
    credential: any;
    verified: boolean;
    error?: string;
  }>;
}

export class TruveraService {
  private client: AxiosInstance;
  private config: TruveraConfig;

  constructor(config: TruveraConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`Truvera API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Truvera API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`Truvera API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error: AxiosError) => {
        console.error('Truvera API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
        });
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  /**
   * Create a proof request via Truvera API
   */
  async createProofRequest(payload: ProofRequestPayload): Promise<TruveraProofRequest> {
    try {
      const response = await this.client.post('/proof-requests', payload);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create proof request: ${error}`);
    }
  }

  /**
   * Get proof request status
   */
  async getProofRequestStatus(proofRequestId: string): Promise<TruveraProofRequest> {
    try {
      const response = await this.client.get(`/proof-requests/${proofRequestId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get proof request status: ${error}`);
    }
  }

  /**
   * Verify a credential presentation
   */
  async verifyPresentation(payload: TruveraVerificationRequest): Promise<TruveraVerificationResult> {
    try {
      const response = await this.client.post('/verify', payload);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to verify presentation: ${error}`);
    }
  }

  /**
   * Test API connectivity and authentication
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to make a simple request to test the connection
      // This assumes Truvera has a health or status endpoint
      await this.client.get('/health');
      return true;
    } catch (error) {
      console.error('Truvera API connection test failed:', error);
      return false;
    }
  }

  /**
   * Handle and normalize API errors
   */
  private handleApiError(error: AxiosError): Error {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;
      
      switch (status) {
        case 401:
          return new Error('Truvera API authentication failed. Check your API key.');
        case 403:
          return new Error('Truvera API access forbidden. Check your permissions.');
        case 404:
          return new Error('Truvera API endpoint not found.');
        case 429:
          return new Error('Truvera API rate limit exceeded. Please try again later.');
        case 500:
          return new Error('Truvera API server error. Please try again later.');
        default:
          return new Error(data?.message || `Truvera API error: ${status}`);
      }
    } else if (error.request) {
      // Network error
      return new Error('Unable to connect to Truvera API. Check your network connection.');
    } else {
      // Other error
      return new Error(`Truvera API request failed: ${error.message}`);
    }
  }
}

// Singleton instance
let truveraServiceInstance: TruveraService | null = null;

export function createTruveraService(config: TruveraConfig): TruveraService {
  truveraServiceInstance = new TruveraService(config);
  return truveraServiceInstance;
}

export function getTruveraService(): TruveraService {
  if (!truveraServiceInstance) {
    throw new Error('Truvera service not initialized. Call createTruveraService first.');
  }
  return truveraServiceInstance;
}