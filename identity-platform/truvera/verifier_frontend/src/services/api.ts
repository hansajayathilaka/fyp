import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import {
  ProofRequestConfig,
  ProofRequest,
  CredentialPresentation,
  VerificationResult,
  ErrorState,
  ApiResponse,
  CustomActionPayload,
} from '../types';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging and auth
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('API Response Error:', error);
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  private handleApiError(error: AxiosError): ErrorState {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;

      return {
        type: this.getErrorType(status),
        code: `HTTP_${status}`,
        message: data?.message || error.message || 'An error occurred',
        details: data,
        recoverable: status >= 500 || status === 408, // Server errors and timeouts are recoverable
      };
    } else if (error.request) {
      // Network error
      return {
        type: 'network',
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to the server. Please check your internet connection.',
        details: error.request,
        recoverable: true,
      };
    } else {
      // Request setup error
      return {
        type: 'validation',
        code: 'REQUEST_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: error,
        recoverable: false,
      };
    }
  }

  private getErrorType(status: number): ErrorState['type'] {
    if (status >= 400 && status < 500) {
      return 'validation';
    } else if (status >= 500) {
      return 'network';
    }
    return 'verification';
  }

  private async retryRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    attempts: number = API_CONFIG.RETRY_ATTEMPTS
  ): Promise<AxiosResponse<T>> {
    try {
      return await requestFn();
    } catch (error) {
      if (attempts > 1 && (error as ErrorState).recoverable) {
        console.log(`Retrying request, ${attempts - 1} attempts remaining`);
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY));
        return this.retryRequest(requestFn, attempts - 1);
      }
      throw error;
    }
  }

  // Proof Request API methods
  async createProofRequest(config: ProofRequestConfig): Promise<ApiResponse<ProofRequest>> {
    try {
      console.log('Sending proof request config:', config);
      const response = await this.retryRequest(() =>
        this.client.post<ApiResponse<ProofRequest>>(API_ENDPOINTS.PROOF_REQUESTS, config)
      );

      console.log('Raw API response:', response.data);

      // The backend returns an ApiResponse wrapper, so we need to extract the data
      if (response.data.success && response.data.data) {
        return {
          success: true,
          data: response.data.data,
        };
      } else {
        return {
          success: false,
          error: response.data.error || {
            type: 'verification',
            code: 'UNKNOWN_ERROR',
            message: 'Unknown error occurred',
            recoverable: false,
          },
        };
      }
    } catch (error) {
      console.error('API request error:', error);
      return {
        success: false,
        error: error as ErrorState,
      };
    }
  }

  async getProofRequestStatus(proofRequestId: string): Promise<ApiResponse<ProofRequest>> {
    try {
      const response = await this.retryRequest(() =>
        this.client.get<ApiResponse<ProofRequest>>(`${API_ENDPOINTS.PROOF_REQUESTS}/${proofRequestId}/status`)
      );

      console.log('Status API response:', response.data);

      // The backend returns an ApiResponse wrapper, so we need to extract the data
      if (response.data.success && response.data.data) {
        return {
          success: true,
          data: response.data.data,
        };
      } else {
        return {
          success: false,
          error: response.data.error || {
            type: 'verification',
            code: 'UNKNOWN_ERROR',
            message: 'Unknown error occurred',
            recoverable: false,
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error as ErrorState,
      };
    }
  }

  // Verification API methods
  async verifyPresentation(presentation: CredentialPresentation, proofRequestId?: string): Promise<ApiResponse<VerificationResult>> {
    try {
      const payload: any = { presentation };
      if (proofRequestId) {
        payload.proofRequestId = proofRequestId;
      }

      const response = await this.retryRequest(() =>
        this.client.post<ApiResponse<VerificationResult>>(API_ENDPOINTS.VERIFY, payload)
      );

      // Handle the ApiResponse wrapper from backend
      if (response.data.success && response.data.data) {
        return {
          success: true,
          data: response.data.data,
        };
      } else {
        return {
          success: false,
          error: response.data.error || {
            type: 'verification',
            code: 'VERIFICATION_FAILED',
            message: 'Verification failed',
            recoverable: true,
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error as ErrorState,
      };
    }
  }

  // Custom Integration API methods
  async triggerCustomAction(payload: CustomActionPayload): Promise<ApiResponse<any>> {
    try {
      const response = await this.retryRequest(() =>
        this.client.post<ApiResponse<any>>(API_ENDPOINTS.CUSTOM_ACTION, payload)
      );

      // Handle the ApiResponse wrapper from backend
      if (response.data.success && response.data.data) {
        return {
          success: true,
          data: response.data.data,
        };
      } else {
        return {
          success: false,
          error: response.data.error || {
            type: 'verification',
            code: 'CUSTOM_ACTION_FAILED',
            message: 'Custom action failed',
            recoverable: true,
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error as ErrorState,
      };
    }
  }

  async getIntegrationConfig(): Promise<ApiResponse<any>> {
    try {
      const response = await this.retryRequest(() =>
        this.client.get<ApiResponse<any>>('/api/integration/config')
      );

      if (response.data.success && response.data.data) {
        return {
          success: true,
          data: response.data.data,
        };
      } else {
        return {
          success: false,
          error: response.data.error || {
            type: 'network',
            code: 'CONFIG_GET_FAILED',
            message: 'Failed to get integration configuration',
            recoverable: true,
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error as ErrorState,
      };
    }
  }

  async updateIntegrationConfig(config: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.retryRequest(() =>
        this.client.put<ApiResponse<any>>('/api/integration/config', config)
      );

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
        };
      } else {
        return {
          success: false,
          error: response.data.error || {
            type: 'validation',
            code: 'CONFIG_UPDATE_FAILED',
            message: 'Failed to update integration configuration',
            recoverable: true,
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error as ErrorState,
      };
    }
  }

  async testIntegrationConnection(): Promise<ApiResponse<any>> {
    try {
      const response = await this.retryRequest(() =>
        this.client.post<ApiResponse<any>>('/api/integration/test')
      );

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
        };
      } else {
        return {
          success: false,
          error: response.data.error || {
            type: 'network',
            code: 'CONNECTION_TEST_FAILED',
            message: 'Integration connection test failed',
            recoverable: true,
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error as ErrorState,
      };
    }
  }

  // Health check method
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    try {
      const response = await this.client.get<{ status: string; timestamp: string }>('/health');

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error as ErrorState,
      };
    }
  }
}

// Create and export singleton instance
export const apiService = new ApiService();
export default apiService;