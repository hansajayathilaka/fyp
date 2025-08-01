// Tests for useSessionInitialization hook

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionInitialization } from '../useSessionInitialization';
import { AppProvider } from '../../contexts/AppContext';

// Mock the API config
vi.mock('../../config/api', () => ({
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

// Test wrapper
const wrapper = ({ children }: { children: React.ReactNode }) => 
  React.createElement(AppProvider, null, children);

describe('useSessionInitialization', () => {
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

  it('should initialize session only once', async () => {
    const { result, rerender } = renderHook(() => useSessionInitialization(), {
      wrapper,
    });

    // Initially should be initializing
    expect(result.current.isInitializing).toBe(true);
    expect(result.current.isInitialized).toBe(false);

    // Wait for session creation
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Should be initialized now
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.isInitializing).toBe(false);
    expect(result.current.sessionId).toBe('test-session-123');

    // Rerender multiple times - should not create additional sessions
    rerender();
    rerender();
    rerender();

    // Should only have been called once
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/session/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('should handle session creation failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({
        success: false,
        error: { message: 'Server error' },
      }),
    });

    const { result } = renderHook(() => useSessionInitialization(), {
      wrapper,
    });

    // Wait for session creation attempt
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Should have error and not be initialized
    expect(result.current.isInitialized).toBe(false);
    expect(result.current.isInitializing).toBe(false);
    expect(result.current.error).toContain('Failed to create session');
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSessionInitialization(), {
      wrapper,
    });

    // Wait for session creation attempt
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Should have error and not be initialized
    expect(result.current.isInitialized).toBe(false);
    expect(result.current.isInitializing).toBe(false);
    expect(result.current.error).toContain('Network error');
  });
});