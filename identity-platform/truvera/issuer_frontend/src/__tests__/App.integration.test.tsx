// Integration test for App component to verify session initialization

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import App from '../App';

// Mock the API config
vi.mock('../config/api', () => ({
  apiConfig: {
    baseUrl: 'http://localhost:3001',
    endpoints: {
      session: {
        create: 'http://localhost:3001/api/session/create',
      },
      wallet: {
        connect: 'http://localhost:3001/api/wallet/connect',
      },
      credentials: {
        form: 'http://localhost:3001/api/credentials/form',
        validate: 'http://localhost:3001/api/credentials/validate',
        issue: 'http://localhost:3001/api/credentials/issue',
        qrGenerate: 'http://localhost:3001/api/credentials/qr-generate',
        status: (sessionId: string) => `http://localhost:3001/api/credentials/status/${sessionId}`,
      },
    },
  },
  apiCall: vi.fn(),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('App Integration - Session Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          sessionId: 'test-session-123',
          currentStep: 'wallet_connection',
        },
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create session only once during app initialization', async () => {
    render(<App />);

    // Wait for session initialization to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/session/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    // Verify that session creation was called exactly once
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Wait a bit more to ensure no additional calls are made
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should still be only one call
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should show loading state during session initialization', async () => {
    // Make the fetch take some time to resolve
    mockFetch.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              sessionId: 'test-session-123',
              currentStep: 'wallet_connection',
            },
          }),
        }), 100)
      )
    );

    const { getByText } = render(<App />);

    // Should show loading state initially
    expect(getByText('Initializing session...')).toBeInTheDocument();

    // Wait for initialization to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  it('should show error state when session initialization fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({
        success: false,
        error: { message: 'Server error' },
      }),
    });

    const { getByText } = render(<App />);

    // Wait for error state to appear
    await waitFor(() => {
      expect(getByText('Session Initialization Failed')).toBeInTheDocument();
    });

    // Should show retry button
    expect(getByText('Retry')).toBeInTheDocument();
  });
});