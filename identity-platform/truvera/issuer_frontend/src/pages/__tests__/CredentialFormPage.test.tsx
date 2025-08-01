// Integration tests for CredentialFormPage

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from '../../contexts/AppContext';
import CredentialFormPage from '../CredentialFormPage';

// Mock the utilities
vi.mock('../../utils', () => ({
  processFormData: vi.fn(),
  isFormReadyForSubmission: vi.fn(),
  submitFormData: vi.fn(),
  generateCredentialOfferQR: vi.fn(),
  getErrorMessage: vi.fn(),
  retryWithBackoff: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number, public code?: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <AppProvider>
        {children}
      </AppProvider>
    </BrowserRouter>
  );
}

describe('CredentialFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with all required fields', () => {
    render(
      <TestWrapper>
        <CredentialFormPage />
      </TestWrapper>
    );

    // Check for form fields
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/wallet address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/investor type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/kyc level/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/aml verification/i)).toBeInTheDocument();

    // Check for submit button
    expect(screen.getByRole('button', { name: /continue to qr code/i })).toBeInTheDocument();
  });

  it('validates required fields before submission', async () => {
    const { processFormData, isFormReadyForSubmission } = await import('../../utils');

    // Mock validation failure
    vi.mocked(isFormReadyForSubmission).mockReturnValue({
      ready: false,
      reason: 'Form validation failed',
    });

    vi.mocked(processFormData).mockReturnValue({
      sanitizedData: {
        firstName: '',
        lastName: '',
        nic: '',
        country: '',
        email: '',
        walletAddress: '',
        investorType: 'Individual',
        kycLevel: 'basic',
        amlStatus: false,
      },
      validation: {
        isValid: false,
        errors: {
          firstName: 'First name is required',
          lastName: 'Last name is required',
        },
      },
    });

    render(
      <TestWrapper>
        <CredentialFormPage />
      </TestWrapper>
    );

    const submitButton = screen.getByRole('button', { name: /continue to qr code/i });
    fireEvent.click(submitButton);

    // Should show validation errors for required fields
    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
      expect(screen.getByText('Last name is required')).toBeInTheDocument();
    });
  });

  it('handles successful form submission', async () => {
    const { 
      processFormData, 
      isFormReadyForSubmission, 
      submitFormData, 
      generateCredentialOfferQR,
      retryWithBackoff 
    } = await import('../../utils');

    // Mock successful validation
    vi.mocked(isFormReadyForSubmission).mockReturnValue({ ready: true });
    vi.mocked(processFormData).mockReturnValue({
      sanitizedData: {
        firstName: 'John',
        lastName: 'Doe',
        nic: '123456789V',
        country: 'United States',
        email: 'john@example.com',
        walletAddress: '0x1234567890123456789012345678901234567890',
        investorType: 'Individual',
        kycLevel: 'basic',
        amlStatus: true,
      },
      validation: { isValid: true, errors: {} },
    });

    // Mock successful API calls
    vi.mocked(retryWithBackoff).mockImplementation((fn) => fn());
    vi.mocked(submitFormData).mockResolvedValue({
      success: true,
      message: 'Form submitted',
      nextStep: 'qr_generation',
    });
    vi.mocked(generateCredentialOfferQR).mockResolvedValue({
      success: true,
      connectionId: 'conn-123',
      qrCodeData: 'qr-data',
      message: 'QR generated',
    });

    render(
      <TestWrapper>
        <CredentialFormPage />
      </TestWrapper>
    );

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/country/i), { target: { value: 'United States' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'john@example.com' } });

    const submitButton = screen.getByRole('button', { name: /continue to qr code/i });
    fireEvent.click(submitButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/submitting/i)).toBeInTheDocument();
    });

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/information processed successfully/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles form submission errors gracefully', async () => {
    const { 
      processFormData, 
      isFormReadyForSubmission,
      retryWithBackoff,
      getErrorMessage 
    } = await import('../../utils');

    // Mock successful validation but failed submission
    vi.mocked(isFormReadyForSubmission).mockReturnValue({ ready: true });
    vi.mocked(processFormData).mockReturnValue({
      sanitizedData: {
        firstName: 'John',
        lastName: 'Doe',
        nic: '123456789V',
        country: 'United States',
        email: 'john@example.com',
        walletAddress: '0x1234567890123456789012345678901234567890',
        investorType: 'Individual',
        kycLevel: 'basic',
        amlStatus: true,
      },
      validation: { isValid: true, errors: {} },
    });

    vi.mocked(retryWithBackoff).mockRejectedValue(new Error('Network error'));
    vi.mocked(getErrorMessage).mockReturnValue('Network connection error. Please try again.');

    render(
      <TestWrapper>
        <CredentialFormPage />
      </TestWrapper>
    );

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });

    const submitButton = screen.getByRole('button', { name: /continue to qr code/i });
    fireEvent.click(submitButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/network connection error/i)).toBeInTheDocument();
    });
  });
});